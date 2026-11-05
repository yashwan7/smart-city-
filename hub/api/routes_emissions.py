from fastapi import APIRouter, HTTPException, status
import sqlite3
import time
from typing import Dict, Any, List
from hub.database import get_connection
from hub.models import CommuteRequest, FuelRequest
from hub.engine.emission_engine import (
    calculate_commute_emissions,
    calculate_fuel_emissions,
    get_summary_metrics,
    get_category_breakdown
)
from hub.api.websocket import ws_manager

router = APIRouter(prefix="/api", tags=["Emissions"])

@router.post("/commute", status_code=status.HTTP_201_CREATED)
async def log_commute(req: CommuteRequest):
    """Logs kiosk button press or mobile commute entry, computes kg CO2e and avoided carbon."""
    conn = get_connection()
    result = calculate_commute_emissions(conn, req.mode, req.km, req.source)
    conn.commit()
    
    await ws_manager.broadcast({
        "type": "commute_logged",
        "data": result
    })
    return result

@router.post("/fuel", status_code=status.HTTP_201_CREATED)
async def log_fuel(req: FuelRequest):
    """Logs generator or fleet fuel consumption with explicit cited emission factor."""
    conn = get_connection()
    result = calculate_fuel_emissions(conn, req.fuel, req.litres, req.source)
    conn.commit()
    
    await ws_manager.broadcast({
        "type": "fuel_logged",
        "data": result
    })
    return result

@router.get("/summary")
async def get_summary():
    """Returns top-level KPIs, current kW load, today's kg CO2e, and data quality split."""
    conn = get_connection()
    return get_summary_metrics(conn)

@router.get("/breakdown")
async def get_breakdown():
    """Returns per-category emissions (electricity, transport, fuel, waste) with formulas and sources."""
    conn = get_connection()
    return get_category_breakdown(conn)

@router.get("/timeseries")
async def get_timeseries(limit: int = 100):
    """Returns chronological emission data points and power profile for timeline charts."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ts, category, kg_co2e, activity_value, activity_unit, source
        FROM emissions
        ORDER BY id DESC
        LIMIT ?;
    """, (limit,))
    rows = cursor.fetchall()
    
    # Reverse to chronological order
    data = []
    cumulative = 0.0
    for r in reversed(rows):
        cumulative += float(r["kg_co2e"])
        data.append({
            "timestamp": r["ts"],
            "category": r["category"],
            "kg_co2e": round(float(r["kg_co2e"]), 4),
            "cumulative_kg": round(cumulative, 4),
            "activity_value": r["activity_value"],
            "unit": r["activity_unit"],
            "source": r["source"]
        })
        
    return {
        "count": len(data),
        "series": data
    }
