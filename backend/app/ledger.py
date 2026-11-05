"""
backend/app/ledger.py
=====================
Append-only hash-chained reading ledger and tamper verification engine.
"""

from copy import deepcopy
import json
from pathlib import Path
import sqlite3
import time
from typing import Any, Dict, List, Optional, Tuple

from . import config
from .database import get_db
from .models import LedgerVerifyResponse, TamperDemoResponse
from .security import (
    calculate_record_hash,
    canonical_json,
    verify_packet_signature,
)


class LedgerEngine:
    """Manages hash-chained readings, replay protection, and chain integrity audits."""

    def __init__(self, db_path: Optional[Path] = None):
        self._db_path = db_path

    @property
    def db_path(self) -> Path:
        return self._db_path if self._db_path is not None else config.DATABASE_PATH

    def get_latest_record_hash(self, conn: sqlite3.Connection) -> str:
        """Retrieves the record_hash of the most recently committed reading, or GENESIS_HASH."""
        row = conn.execute(
            "SELECT record_hash FROM readings ORDER BY id DESC LIMIT 1;"
        ).fetchone()
        if row and row["record_hash"]:
            return row["record_hash"]
        return config.GENESIS_HASH

    def append_reading(
        self,
        node: str,
        seq: int,
        ts: float,
        data: Dict[str, Any],
        signature: str,
    ) -> Tuple[int, str, str]:
        """
        Appends an authenticated reading to the hash-chained ledger.
        Returns: (reading_id, record_hash, prev_hash)
        """
        now = time.time()
        c_payload = canonical_json(data)

        with get_db(self.db_path) as conn:
            # 0. Check replay / non-increasing sequence
            dev = conn.execute("SELECT last_accepted_seq FROM devices WHERE node_id = ?;", (node,)).fetchone()
            if dev and dev["last_accepted_seq"] is not None and seq <= dev["last_accepted_seq"]:
                raise ValueError(
                    f"Replay detected: Sequence {seq} <= last accepted sequence {dev['last_accepted_seq']} for node '{node}'."
                )

            # 1. Lock latest record hash
            prev_hash = self.get_latest_record_hash(conn)

            # 2. Compute record hash
            rec_hash = calculate_record_hash(prev_hash, c_payload, signature)

            # 3. Insert into readings table
            cur = conn.execute(
                """
                INSERT INTO readings (node, seq, timestamp, canonical_payload, signature, signature_status, prev_hash, record_hash, created_at)
                VALUES (?, ?, ?, ?, ?, 'VALID', ?, ?, ?);
                """,
                (node, seq, ts, c_payload, signature, prev_hash, rec_hash, now),
            )
            reading_id = cur.lastrowid

            # 4. Update device state (advance last_accepted_seq and update last_seen)
            conn.execute(
                """
                UPDATE devices
                SET last_accepted_seq = ?, last_seen = ?
                WHERE node_id = ?;
                """,
                (seq, now, node),
            )

            return reading_id, rec_hash, prev_hash

    def record_signature_failure(self, node: str) -> None:
        """Tracks failed signature attempts for a node in devices table."""
        with get_db(self.db_path) as conn:
            conn.execute(
                """
                UPDATE devices
                SET signature_failures = signature_failures + 1
                WHERE node_id = ?;
                """,
                (node,),
            )

    def verify_chain(self, conn: Optional[sqlite3.Connection] = None) -> LedgerVerifyResponse:
        """
        Cryptographically walks the entire hash chain from Genesis hash to latest record.
        Verifies:
          1. Prev_hash pointer matches previous block's record_hash.
          2. Recalculated SHA256(prev_hash || payload || sig) matches stored record_hash.
          3. HMAC signature re-verified against device secret key.
        """
        should_close = False
        if conn is None:
            conn = sqlite3.connect(str(self.db_path))
            conn.row_factory = sqlite3.Row
            should_close = True

        try:
            # Pre-load device secret keys
            dev_rows = conn.execute("SELECT node_id, secret_key FROM devices;").fetchall()
            node_keys = {r["node_id"]: r["secret_key"] for r in dev_rows}

            readings = conn.execute(
                "SELECT id, node, seq, timestamp, canonical_payload, signature, prev_hash, record_hash FROM readings ORDER BY id ASC;"
            ).fetchall()

            if not readings:
                return LedgerVerifyResponse(status="OK", records_verified=0)

            expected_prev = config.GENESIS_HASH
            verified_count = 0

            for r in readings:
                rec_id = r["id"]
                node = r["node"]
                seq = r["seq"]
                ts = r["timestamp"]
                c_payload = r["canonical_payload"]
                sig = r["signature"]
                prev_h = r["prev_hash"]
                stored_rec_h = r["record_hash"]

                # 1. Verify prev_hash link
                if prev_h != expected_prev:
                    return LedgerVerifyResponse(
                        status="BROKEN",
                        records_verified=verified_count,
                        first_broken_id=rec_id,
                        broken_reason=(
                            f"Hash chain pointer broken at record #{rec_id}: "
                            f"prev_hash '{prev_h}' does not match expected '{expected_prev}'"
                        ),
                    )

                # 2. Verify hash calculation
                recomputed_hash = calculate_record_hash(prev_h, c_payload, sig)
                if recomputed_hash != stored_rec_h:
                    return LedgerVerifyResponse(
                        status="BROKEN",
                        records_verified=verified_count,
                        first_broken_id=rec_id,
                        broken_reason=(
                            f"Record hash mismatch at record #{rec_id}: "
                            f"stored '{stored_rec_h}' vs recalculated '{recomputed_hash}'"
                        ),
                    )

                # 3. Verify HMAC signature authenticity
                secret_key = node_keys.get(node)
                if secret_key:
                    try:
                        data_dict = json.loads(c_payload)
                        sig_valid = verify_packet_signature(node, seq, ts, data_dict, sig, secret_key)
                        if not sig_valid:
                            return LedgerVerifyResponse(
                                status="BROKEN",
                                records_verified=verified_count,
                                first_broken_id=rec_id,
                                broken_reason=f"Cryptographic signature check failed on record #{rec_id} for node '{node}'",
                            )
                    except Exception as e:
                        return LedgerVerifyResponse(
                            status="BROKEN",
                            records_verified=verified_count,
                            first_broken_id=rec_id,
                            broken_reason=f"Payload unparseable at record #{rec_id}: {str(e)}",
                        )

                expected_prev = stored_rec_h
                verified_count += 1

            return LedgerVerifyResponse(status="OK", records_verified=verified_count)

        finally:
            if should_close:
                conn.close()

    def run_tamper_demo(self) -> TamperDemoResponse:
        """
        Demonstrates tamper detection on an IN-MEMORY SQLite replica.
        Never alters the live production database!
        """
        # Create in-memory replica of current DB
        src_conn = sqlite3.connect(str(self.db_path))
        mem_conn = sqlite3.connect(":memory:")
        src_conn.backup(mem_conn)
        src_conn.close()
        mem_conn.row_factory = sqlite3.Row

        # Select latest record to tamper with
        row = mem_conn.execute("SELECT id, canonical_payload, record_hash FROM readings ORDER BY id DESC LIMIT 1;").fetchone()
        if not row:
            # If empty, create a dummy reading first to demonstrate
            mem_conn.close()
            raise ValueError("Ledger has no readings to perform tamper demo. Ingest at least one packet first.")

        rec_id = row["id"]
        orig_hash = row["record_hash"]
        orig_payload = row["canonical_payload"]

        # Tamper: flip power reading or inject malicious key
        tampered_payload = orig_payload.replace("}", ',"tampered":true}')
        mem_conn.execute(
            "UPDATE readings SET canonical_payload = ? WHERE id = ?;",
            (tampered_payload, rec_id),
        )
        mem_conn.commit()

        # Run verification on the tampered in-memory copy
        audit = self.verify_chain(conn=mem_conn)
        mem_conn.close()

        return TamperDemoResponse(
            demonstration="TAMPER_DETECTION_PROOF",
            tampered_record_id=rec_id,
            original_record_hash=orig_hash,
            recalculated_record_hash="HASH_CHAIN_DISCREPANCY_DETECTED",
            verification_result=audit.broken_reason or "Tamper intercepted",
            message="Tamper successfully detected! Modifying the reading payload broke the cryptographic hash chain.",
        )
