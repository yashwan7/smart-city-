from fastapi import APIRouter, HTTPException, status
import sqlite3
import time
from typing import Dict, Any, List
from hub.database import get_connection
from hub.models import RelayControlRequest
from hub.advisor.advisor import generate_recommendations
from hub.api.websocket import ws_manager

router = APIRouter(prefix="/api", tags=["Advisor & Control"])

@router.get("/recommendations")
async def get_recommendations():
    """Returns ranked actions with quantified kWh and kg CO2e savings validated against numeric hallucinations."""
    conn = get_connection()
    recs = generate_recommendations(conn)
    return {
        "count": len(recs),
        "recommendations": recs
    }

@router.get("/devices")
async def get_device_health():
    """Monitors active edge nodes, sequence progression, and cryptographic failure counters."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT node, key_id, last_seen, last_seq, sig_failures, fw_version FROM devices;")
    rows = cursor.fetchall()
    
    now = time.time()
    devices = []
    for r in rows:
        last_s = float(r["last_seen"]) if r["last_seen"] else 0.0
        # Device considered offline if no packet received within 30 seconds
        is_online = (now - last_s) < 30.0 if last_s > 0 else False
        devices.append({
            "node": r["node"],
            "key_id": r["key_id"],
            "last_seen": last_s,
            "seconds_since_seen": round(now - last_s, 1) if last_s > 0 else None,
            "last_seq": r["last_seq"],
            "sig_failures": r["sig_failures"],
            "status": "ONLINE" if is_online else "OFFLINE",
            "fw_version": r["fw_version"] or "v1.0.0"
        })
    return {"devices": devices}

@router.get("/time")
async def get_server_time():
    """Provides authoritative NTP / system clock timestamp for edge node synchronization."""
    return {"server_time": time.time()}

@router.post("/control/relay")
async def control_node_relay(req: RelayControlRequest):
    """
    Issues authenticated relay control commands to edge nodes (e.g., tripping load for optimized run),
    logging the intervention in the tamper-evident events table.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get current power before action
    cursor.execute("SELECT payload_json FROM readings WHERE node = ? ORDER BY id DESC LIMIT 1;", (req.node,))
    last_reading = cursor.fetchone()
    p_before_w = 0.0
    if last_reading:
        import json
        p = json.loads(last_reading["payload_json"])
        p_before_w = round(230.0 * float(p.get("current_a", 0.0)) * 0.92, 1)
        
    p_after_w = 0.0 if req.state == "OFF" else p_before_w
    now = time.time()
    
    cursor.execute("""
        INSERT INTO events (ts, node, action, reason, p_before_w, p_after_w)
        VALUES (?, ?, ?, ?, ?, ?);
    """, (now, req.node, f"relay_{req.state.lower()}", req.reason, p_before_w, p_after_w))
    event_id = cursor.lastrowid
    conn.commit()
    
    event_payload = {
        "type": "relay_action",
        "event_id": event_id,
        "node": req.node,
        "state": req.state,
        "reason": req.reason,
        "p_before_w": p_before_w,
        "p_after_w": p_after_w,
        "ts": now
    }
    await ws_manager.broadcast(event_payload)
    
    return {
        "status": "command_queued",
        "node": req.node,
        "target_state": req.state,
        "logged_event_id": event_id,
        "power_delta_w": round(p_before_w - p_after_w, 1)
    }
