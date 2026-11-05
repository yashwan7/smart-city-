from fastapi import APIRouter, HTTPException, Depends, status
import sqlite3
import time
from typing import Dict, Any, List
from hub.config import settings
from hub.database import get_connection
from hub.models import NodePacket, BatchIngestRequest
from hub.ledger.security import verify_hmac
from hub.ledger.chain import append_to_ledger
from hub.engine.emission_engine import calculate_electricity_emissions, calculate_waste_emissions
from hub.api.websocket import ws_manager

router = APIRouter(prefix="/api", tags=["Ingest"])

def get_active_run_id(conn: sqlite3.Connection) -> Any:
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM runs WHERE end_ts IS NULL ORDER BY id DESC LIMIT 1;")
    row = cursor.fetchone()
    return row["id"] if row else None

@router.post("/ingest", status_code=status.HTTP_201_CREATED)
async def ingest_packet(packet: NodePacket):
    """
    Ingests an authenticated edge sensor packet:
    1. Replay attack rejection via monotonic sequence enforcement.
    2. Cryptographic HMAC-SHA256 signature verification.
    3. Tamper-evident ledger appending.
    4. Deterministic emission calculation.
    """
    conn = get_connection()
    node = packet.node
    secret_key = settings.NODE_KEYS.get(node)
    
    if not secret_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration error: Node '{node}' is not authorized on this hub."
        )
        
    cursor = conn.cursor()
    cursor.execute("SELECT last_seq, sig_failures FROM devices WHERE node = ?;", (node,))
    dev_row = cursor.fetchone()
    last_seq = dev_row["last_seq"] if dev_row else 0
    sig_failures = dev_row["sig_failures"] if dev_row else 0
    
    # 1. Monotonic Sequence Verification (Replay / Out-of-order check)
    if packet.seq <= last_seq:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Replay detected: Packet sequence {packet.seq} <= last acknowledged sequence {last_seq} for node '{node}'."
        )
        
    # 2. Cryptographic HMAC Verification
    is_valid_sig = verify_hmac(
        secret_key=secret_key,
        node=packet.node,
        seq=packet.seq,
        ts=packet.ts,
        payload=packet.payload,
        received_sig=packet.sig
    )
    
    if not is_valid_sig:
        # Explicit failure logging - update failure count
        cursor.execute("""
            INSERT INTO devices (node, key_id, last_seen, last_seq, sig_failures)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(node) DO UPDATE SET
                sig_failures = sig_failures + 1,
                last_seen = ?;
        """, (node, f"key_{node}", packet.ts, last_seq, sig_failures + 1, packet.ts))
        
        # Also append rejected reading to ledger with sig_ok = 0 for auditability
        append_to_ledger(conn, node, packet.seq, packet.ts, packet.payload, packet.sig, sig_ok=False)
        conn.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Security failure: Cryptographic HMAC signature rejected for node '{node}' (seq {packet.seq})."
        )
        
    # 3. Successful verification: Update device state
    cursor.execute("""
        INSERT INTO devices (node, key_id, last_seen, last_seq, sig_failures)
        VALUES (?, ?, ?, ?, 0)
        ON CONFLICT(node) DO UPDATE SET
            last_seen = ?,
            last_seq = ?;
    """, (node, f"key_{node}", packet.ts, packet.seq, packet.ts, packet.seq))
    
    # 4. Append to hash-chained tamper-evident ledger
    rec_id, prev_hash, rec_hash = append_to_ledger(
        conn, node, packet.seq, packet.ts, packet.payload, packet.sig, sig_ok=True
    )
    
    # 5. Process category emissions
    active_run_id = get_active_run_id(conn)
    emissions_info = None
    
    if node == "node_a":
        # Node A telemetry includes current_a, relay state, lux_pct
        current_a = float(packet.payload.get("current_a", 0.0))
        duration_s = float(packet.payload.get("interval_s", 5.0))
        emissions_info = calculate_electricity_emissions(
            conn=conn,
            current_a=current_a,
            duration_s=duration_s,
            voltage_v=settings.MAINS_VOLTAGE_V,
            pf=settings.POWER_FACTOR,
            run_id=active_run_id
        )
    elif node == "node_b":
        # Node B telemetry includes bin_fill_delta_pct or soil/rain
        if "fill_delta_pct" in packet.payload:
            delta = float(packet.payload["fill_delta_pct"])
            if delta > 0:
                emissions_info = calculate_waste_emissions(conn, delta)
                
    conn.commit()
    
    # 6. Broadcast over WebSocket to connected dashboard clients
    ws_payload = {
        "type": "telemetry",
        "node": node,
        "seq": packet.seq,
        "ts": packet.ts,
        "payload": packet.payload,
        "record_id": rec_id,
        "record_hash": rec_hash,
        "emissions": emissions_info
    }
    await ws_manager.broadcast(ws_payload)
    
    return {
        "status": "ok",
        "record_id": rec_id,
        "prev_hash": prev_hash,
        "record_hash": rec_hash,
        "sig_ok": True,
        "emissions": emissions_info
    }

@router.post("/ingest/batch")
async def ingest_batch_packets(batch: BatchIngestRequest):
    """
    Network resilience endpoint: Ingests buffered arrays of packets flushed by nodes
    reconnecting after offline operation. Ensures chronological in-order processing.
    """
    sorted_packets = sorted(batch.packets, key=lambda p: p.seq)
    results = []
    
    for packet in sorted_packets:
        try:
            res = await ingest_packet(packet)
            results.append({"seq": packet.seq, "status": "accepted", "record_id": res["record_id"]})
        except HTTPException as e:
            results.append({"seq": packet.seq, "status": "rejected", "error": e.detail})
            
    return {
        "total_submitted": len(batch.packets),
        "processed": results
    }
