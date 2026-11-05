from fastapi import APIRouter, HTTPException, status
import sqlite3
import json
from hub.database import get_connection
from hub.models import TamperDemoRequest
from hub.ledger.chain import verify_ledger

router = APIRouter(prefix="/api/ledger", tags=["Cryptographic Ledger"])

@router.get("/verify")
async def verify_chain():
    """
    Cryptographic verification endpoint: Walks the SHA-256 hash chain from genesis,
    recalculating content digests and checking prev_hash pointers.
    Returns 100% valid or pinpoints exact tampered record ID.
    """
    conn = get_connection()
    return verify_ledger(conn)

@router.get("/records")
async def get_ledger_records(limit: int = 50):
    """Returns the most recent ledger blocks showing sequence, hashes, and verification status."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, node, seq, ts, sig_ok, prev_hash, record_hash
        FROM readings
        ORDER BY id DESC
        LIMIT ?;
    """, (limit,))
    rows = cursor.fetchall()
    
    records = []
    for r in rows:
        records.append({
            "id": r["id"],
            "node": r["node"],
            "seq": r["seq"],
            "timestamp": r["ts"],
            "sig_ok": bool(r["sig_ok"]),
            "prev_hash": r["prev_hash"],
            "record_hash": r["record_hash"]
        })
    return {"total": len(records), "records": records}

@router.post("/tamper_demo")
async def tamper_demo_record(req: TamperDemoRequest):
    """
    Demonstration endpoint for judges/auditors:
    Silently alters a stored payload in the database without updating the cryptographic hash,
    proving that /api/ledger/verify immediately catches unauthorized data tampering.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, payload_json, record_hash FROM readings WHERE id = ?;", (req.record_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Record {req.record_id} not found.")
        
    original_payload = row["payload_json"]
    new_payload_json = json.dumps(req.tampered_payload)
    
    cursor.execute("UPDATE readings SET payload_json = ? WHERE id = ?;", (new_payload_json, req.record_id))
    conn.commit()
    
    return {
        "status": "tampered",
        "record_id": req.record_id,
        "original_payload": original_payload,
        "tampered_payload": new_payload_json,
        "message": "Record was silently modified in SQLite. Run GET /api/ledger/verify to observe immediate detection."
    }
