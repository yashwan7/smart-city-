"""
backend/app/routes/ingest.py
============================
Sensor packet ingest, replay protection, HMAC-SHA256 verification,
and ledger integrity verification endpoints.
"""

import json
from fastapi import APIRouter, HTTPException, Query, status
from typing import Any, Dict, List, Optional

from .. import config
from ..database import get_db
from ..emissions import EmissionsEngine
from ..ledger import LedgerEngine
from ..models import (
    IngestResponse,
    LedgerVerifyResponse,
    SensorPacket,
    TamperDemoResponse,
)
from ..security import validate_timestamp_skew, verify_packet_signature
from ..yagna import YagnaEngine

router = APIRouter(tags=["Ingest & Ledger"])

ledger_engine = LedgerEngine()
emissions_engine = EmissionsEngine()
yagna_engine = YagnaEngine()

# Reference to WebSocket broadcast manager (injected from main.py)
ws_broadcaster: Optional[Any] = None


def set_broadcaster(broadcaster: Any) -> None:
    global ws_broadcaster
    ws_broadcaster = broadcaster


@router.post("/ingest", response_model=IngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_telemetry_packet(packet: SensorPacket):
    """
    Ingests and cryptographically authenticates telemetry from an edge node (ESP32/NXP/Kiosk).
    Enforces:
      1. Node key resolution
      2. Timestamp clock skew validation
      3. Replay attack & non-increasing sequence rejection
      4. HMAC-SHA256 constant-time verification
      5. Append-only ledger hash-chaining
      6. Immediate emissions evaluation & live WebSocket broadcast
    """
    node = packet.node
    seq = packet.seq
    ts = packet.ts
    data = packet.d
    provided_sig = packet.sig

    # 1. Resolve node secret key
    secret_key: Optional[str] = None
    last_seq = 0

    with get_db() as conn:
        row = conn.execute(
            "SELECT secret_key, last_accepted_seq FROM devices WHERE node_id = ?;",
            (node,),
        ).fetchone()

        if row:
            secret_key = row["secret_key"]
            last_seq = row["last_accepted_seq"]
        elif node in config.DEMO_NODE_KEYS:
            secret_key = config.DEMO_NODE_KEYS[node]
            # Register on the fly
            conn.execute(
                """
                INSERT INTO devices (node_id, key_id, secret_key, last_seen, firmware_version, last_accepted_seq, signature_failures, created_at)
                VALUES (?, ?, ?, ?, 'v2.0.0', 0, 0, ?);
                """,
                (node, f"key-{node}", secret_key, ts, ts),
            )
            last_seq = 0

    if not secret_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unregistered node '{node}'. Node must be provisioned with an HMAC key.",
        )

    # 2. Timestamp clock skew validation
    is_valid_skew, delta_s = validate_timestamp_skew(ts, config.ALLOWED_CLOCK_SKEW_SECONDS)
    if not is_valid_skew:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Clock skew rejected: packet timestamp {ts} differs from hub clock by "
                f"{delta_s:.1f}s (max allowed: {config.ALLOWED_CLOCK_SKEW_SECONDS:.1f}s)."
            ),
        )

    # 3. Replay protection & strictly increasing sequence check
    if seq <= last_seq:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Replay attack or non-increasing sequence detected for node '{node}': "
                f"received seq #{seq} <= last accepted seq #{last_seq}."
            ),
        )

    # 4. Cryptographic HMAC-SHA256 signature verification
    sig_ok = verify_packet_signature(node, seq, ts, data, provided_sig, secret_key)
    if not sig_ok:
        ledger_engine.record_signature_failure(node)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                f"Invalid HMAC-SHA256 signature for node '{node}' on packet seq #{seq}. "
                f"Signature verification failed."
            ),
        )

    # 5. Append to hash-chained ledger
    reading_id, rec_hash, prev_h = ledger_engine.append_reading(
        node=node,
        seq=seq,
        ts=ts,
        data=data,
        signature=provided_sig,
    )

    # 6. Evaluate electricity emissions if power or energy is present
    emitted_kg = emissions_engine.process_telemetry_reading(
        node=node,
        reading_id=reading_id,
        timestamp=ts,
        data=data,
    )

    # 7. Get updated net-carbon totals
    net_status = yagna_engine.calculate_net_carbon()

    # 8. Broadcast over live WebSocket if manager attached
    if ws_broadcaster:
        try:
            ws_payload = {
                "type": "TELEMETRY_INGEST",
                "reading_id": reading_id,
                "node": node,
                "seq": seq,
                "power_w": data.get("power_w"),
                "record_hash": rec_hash,
                "emitted_kg_co2e": emitted_kg,
                "net_carbon_kg_co2e": net_status.net_carbon_kg_co2e,
                "yagna_ratio": net_status.yagna_ratio,
            }
            import asyncio
            if asyncio.get_event_loop().is_running():
                asyncio.create_task(ws_broadcaster(json.dumps(ws_payload)))
        except Exception:
            pass

    return IngestResponse(
        status="ACCEPTED",
        node=node,
        seq=seq,
        record_hash=rec_hash,
        prev_hash=prev_h,
        emissions_evaluated_kg_co2e=emitted_kg,
        net_carbon_kg_co2e=net_status.net_carbon_kg_co2e,
        message="Telemetry packet authenticated, signed, and chained in append-only ledger.",
    )


@router.get("/ledger/verify", response_model=LedgerVerifyResponse)
def verify_ledger_chain():
    """
    Walks the entire append-only hash chain and returns 'OK' or the first broken record ID.
    Never trusts cached verification; audits all records live.
    """
    return ledger_engine.verify_chain()


@router.get("/ledger/tamper-demo", response_model=TamperDemoResponse)
def demonstrate_tamper_detection():
    """
    Performs tamper detection on an in-memory replica copy of the ledger.
    Never corrupts the real production ledger!
    """
    try:
        return ledger_engine.run_tamper_demo()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/ledger/readings", response_model=List[Dict[str, Any]])
def list_ledger_readings(limit: int = Query(default=50, ge=1, le=500)):
    """Returns recent hash-chained ledger readings for transparency and auditing."""
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT id, node, seq, timestamp, canonical_payload, signature, signature_status, prev_hash, record_hash, created_at
            FROM readings
            ORDER BY id DESC
            LIMIT ?;
            """,
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]
