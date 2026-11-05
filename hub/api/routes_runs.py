from fastapi import APIRouter, HTTPException, status
import sqlite3
import time
from typing import Dict, Any, Optional
from hub.database import get_connection
from hub.models import RunStartRequest
from hub.api.websocket import ws_manager

router = APIRouter(prefix="/api/runs", tags=["Comparative Runs"])

@router.post("/start", status_code=status.HTTP_201_CREATED)
async def start_run(req: RunStartRequest):
    """Starts a comparative testing run (baseline or optimized), closing any previous active run."""
    conn = get_connection()
    now = time.time()
    cursor = conn.cursor()
    
    # Close any currently running run
    cursor.execute("UPDATE runs SET end_ts = ? WHERE end_ts IS NULL;", (now,))
    
    # Start new run
    cursor.execute("INSERT INTO runs (label, start_ts) VALUES (?, ?);", (req.label, now))
    run_id = cursor.lastrowid
    conn.commit()
    
    await ws_manager.broadcast({
        "type": "run_started",
        "run_id": run_id,
        "label": req.label,
        "start_ts": now
    })
    
    return {
        "status": "started",
        "run_id": run_id,
        "label": req.label,
        "start_ts": now
    }

@router.post("/stop")
async def stop_run():
    """Stops the active comparative run."""
    conn = get_connection()
    now = time.time()
    cursor = conn.cursor()
    cursor.execute("SELECT id, label, start_ts FROM runs WHERE end_ts IS NULL ORDER BY id DESC LIMIT 1;")
    active = cursor.fetchone()
    
    if not active:
        return {"status": "no_active_run"}
        
    duration = now - float(active["start_ts"])
    cursor.execute("UPDATE runs SET end_ts = ? WHERE id = ?;", (now, active["id"]))
    conn.commit()
    
    await ws_manager.broadcast({
        "type": "run_stopped",
        "run_id": active["id"],
        "duration_s": round(duration, 2)
    })
    
    return {
        "status": "stopped",
        "run_id": active["id"],
        "label": active["label"],
        "duration_s": round(duration, 2)
    }

@router.get("/compare")
async def compare_runs():
    """
    Compares the latest baseline run against the latest optimized run side-by-side,
    computing verified saved kWh, avoided kg CO2e, and percentage reduction.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM runs WHERE label = 'baseline' ORDER BY id DESC LIMIT 1;")
    baseline = cursor.fetchone()
    
    cursor.execute("SELECT * FROM runs WHERE label = 'optimized' ORDER BY id DESC LIMIT 1;")
    optimized = cursor.fetchone()
    
    def get_run_metrics(run_row):
        if not run_row:
            return {"kwh": 0.0, "kg_co2e": 0.0, "duration_s": 0.0}
        rid = run_row["id"]
        cursor.execute("""
            SELECT COALESCE(SUM(activity_value), 0.0) as kwh,
                   COALESCE(SUM(kg_co2e), 0.0) as kg
            FROM emissions
            WHERE run_id = ? AND category = 'electricity';
        """, (rid,))
        res = cursor.fetchone()
        end = run_row["end_ts"] or time.time()
        duration = max(1.0, end - run_row["start_ts"])
        return {
            "run_id": rid,
            "kwh": round(float(res["kwh"]), 4),
            "kg_co2e": round(float(res["kg"]), 4),
            "duration_s": round(duration, 1)
        }
        
    b_metrics = get_run_metrics(baseline)
    o_metrics = get_run_metrics(optimized)
    
    # Normalized rate per hour if durations differ
    b_rate_kwh_h = (b_metrics["kwh"] / (b_metrics["duration_s"] / 3600.0)) if b_metrics["duration_s"] > 0 else 0.0
    o_rate_kwh_h = (o_metrics["kwh"] / (o_metrics["duration_s"] / 3600.0)) if o_metrics["duration_s"] > 0 else 0.0
    
    saved_kwh = max(0.0, b_metrics["kwh"] - o_metrics["kwh"])
    saved_kg = max(0.0, b_metrics["kg_co2e"] - o_metrics["kg_co2e"])
    reduction_pct = round((saved_kg / b_metrics["kg_co2e"]) * 100.0, 1) if b_metrics["kg_co2e"] > 0 else 0.0
    
    return {
        "baseline": b_metrics,
        "optimized": o_metrics,
        "comparison": {
            "saved_kwh": round(saved_kwh, 4),
            "saved_kg_co2e": round(saved_kg, 4),
            "reduction_percentage": reduction_pct,
            "baseline_rate_kw": round(b_rate_kwh_h, 3),
            "optimized_rate_kw": round(o_rate_kwh_h, 3)
        }
    }
