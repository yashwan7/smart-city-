"""
backend/app/routes/yagna.py
===========================
Yagna net-carbon calculation, recommendations, time sync, and relay control endpoints.
"""

from fastapi import APIRouter, HTTPException, Query, status
from typing import Any, Dict, List, Optional

from ..models import NetCarbonResponse, RecommendationItem, RelayControlRequest
from ..recommendations import RecommendationEngine
from ..yagna import YagnaEngine

router = APIRouter(tags=["Yagna Net-Carbon & Control"])

yagna_engine = YagnaEngine()
rec_engine = RecommendationEngine()


@router.get("/net", response_model=NetCarbonResponse)
def get_net_carbon_status(run_id: Optional[int] = Query(default=None)):
    """
    Returns full Net-Carbon accounting balance:
        BAD = total gross emitted kg CO2e
        GOOD = total net sequestration benefit kg CO2e
        NET = BAD - GOOD (Negative value means net-carbon-negative!)
        yagna_ratio = GOOD / BAD
    Partitions verified vs projected benefits and measured vs assumed emissions.
    """
    return yagna_engine.calculate_net_carbon(run_id)


@router.get("/recommendations", response_model=List[RecommendationItem])
def get_carbon_recommendations(ollama: bool = Query(default=False, description="Attempt local AI advice rewrite")):
    """
    Returns rule-based deterministic carbon reduction recommendations.
    Strictly validates that any numbers in advisor copy match the calculated allowed set.
    """
    return rec_engine.generate_recommendations(call_ollama_rewrite=ollama)


@router.get("/time")
def get_time_sync():
    """Provides hub time synchronization, active run metadata, and clock skew tolerance."""
    return yagna_engine.get_time_info()


@router.post("/control/relay", status_code=status.HTTP_200_OK)
def trigger_relay_override(req: RelayControlRequest):
    """
    Executes a remote relay override command (e.g. load shedding) for an edge node.
    Logs an immutable event in the events table with before/after power metrics.
    """
    try:
        return yagna_engine.execute_relay_control(req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/events", response_model=List[Dict[str, Any]])
def list_hardware_events(limit: int = Query(default=50, ge=1, le=500)):
    """Returns recent hardware and override events."""
    return yagna_engine.list_events(limit=limit)
