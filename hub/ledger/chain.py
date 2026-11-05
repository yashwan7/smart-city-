import hashlib
import json
import sqlite3
from typing import Dict, Any, Tuple, Optional
from hub.ledger.security import canonical_json

GENESIS_HASH = "0" * 64

def compute_record_hash(prev_hash: str, node: str, seq: int, ts: float, payload: Dict[str, Any], sig: str) -> str:
    """Computes SHA-256 hash linking previous hash, canonical record payload, and node signature."""
    payload_str = canonical_json(payload)
    ts_str = f"{ts:.3f}"
    raw = f"{prev_hash}:{node}:{seq}:{ts_str}:{payload_str}:{sig}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

def get_latest_record_hash(conn: sqlite3.Connection) -> str:
    """Retrieves the record_hash of the most recent entry in the ledger."""
    cursor = conn.cursor()
    cursor.execute("SELECT record_hash FROM readings ORDER BY id DESC LIMIT 1;")
    row = cursor.fetchone()
    if row and row["record_hash"]:
        return row["record_hash"]
    return GENESIS_HASH

def append_to_ledger(
    conn: sqlite3.Connection,
    node: str,
    seq: int,
    ts: float,
    payload: Dict[str, Any],
    sig: str,
    sig_ok: bool
) -> Tuple[int, str, str]:
    """Appends a new reading to the hash-chained ledger, returning (id, prev_hash, record_hash)."""
    prev_hash = get_latest_record_hash(conn)
    rec_hash = compute_record_hash(prev_hash, node, seq, ts, payload, sig)
    payload_json = canonical_json(payload)
    
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO readings (node, seq, ts, payload_json, sig, sig_ok, prev_hash, record_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (node, seq, ts, payload_json, sig, 1 if sig_ok else 0, prev_hash, rec_hash))
    record_id = cursor.lastrowid
    return record_id, prev_hash, rec_hash

def verify_ledger(conn: sqlite3.Connection) -> Dict[str, Any]:
    """
    Walks the entire ledger from genesis to tip:
    1. Verifies chain continuity (row.prev_hash == previous_row.record_hash).
    2. Recalculates cryptographic SHA-256 hash from stored payload, node, seq, timestamp, and signature.
    Pinpoints the exact record ID if any tampering occurred.
    """
    cursor = conn.cursor()
    cursor.execute("SELECT id, node, seq, ts, payload_json, sig, sig_ok, prev_hash, record_hash FROM readings ORDER BY id ASC;")
    rows = cursor.fetchall()
    
    if not rows:
        return {
            "valid": True,
            "total_records": 0,
            "head_hash": GENESIS_HASH,
            "message": "Ledger is empty (genesis state)"
        }
    
    expected_prev = GENESIS_HASH
    for row in rows:
        row_id = row["id"]
        # 1. Chain continuity verification
        if row["prev_hash"] != expected_prev:
            return {
                "valid": False,
                "tampered_record_id": row_id,
                "reason": "Chain continuity broken: prev_hash mismatch",
                "expected_prev": expected_prev,
                "actual_prev": row["prev_hash"]
            }
        
        # 2. Content integrity recalculation
        try:
            payload = json.loads(row["payload_json"])
        except Exception:
            payload = {}
            
        recalculated_hash = compute_record_hash(
            prev_hash=row["prev_hash"],
            node=row["node"],
            seq=row["seq"],
            ts=row["ts"],
            payload=payload,
            sig=row["sig"]
        )
        
        if recalculated_hash != row["record_hash"]:
            return {
                "valid": False,
                "tampered_record_id": row_id,
                "reason": "Record content tampered: SHA256 digest mismatch",
                "expected_hash": recalculated_hash,
                "stored_hash": row["record_hash"]
            }
        
        expected_prev = row["record_hash"]
        
    return {
        "valid": True,
        "total_records": len(rows),
        "head_hash": expected_prev,
        "message": "Ledger cryptographic verification passed (100% intact)"
    }
