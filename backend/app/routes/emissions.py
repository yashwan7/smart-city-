"""
backend/app/routes/emissions.py
===============================
Emission calculation and accounting endpoints for transport, fuel, and breakdowns.
"""

from fastapi import APIRouter, HTTPException, Query, status
from typing import Any, Dict, List, Optional

from ..emissions import EmissionsEngine
from ..models import CommuteRequest, FuelRequest

router = APIRouter(tags=["Emissions"])
engine = EmissionsEngine()


@router.post("/commute", status_code=status.HTTP_201_CREATED)
def record_commute_emissions(req: CommuteRequest):
    """
    Records travel emissions for walk, bicycle, two-wheeler, car, bus, or metro.
    Applies official factors from factors.yaml and handles carpooling occupancy.
    """
    try:
        return engine.record_commute(
            mode=req.mode.value,
            distance_km=req.distance_km,
            occupancy=req.occupancy,
            notes=req.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/fuel", status_code=status.HTTP_201_CREATED)
def record_fuel_emissions(req: FuelRequest):
    """
    Records combustion emissions for diesel, petrol, cng, or lpg.
    """
    try:
        return engine.record_fuel(
            fuel_type=req.fuel_type.value,
            litres=req.litres,
            equipment=req.equipment,
            notes=req.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/summary")
def get_emissions_summary(run_id: Optional[int] = Query(default=None)):
    """
    Returns total emissions (BAD = sum(emissions.kg_co2e)) and category summaries.
    """
    total = engine.get_total_emissions(run_id)
    breakdown = engine.get_breakdown(run_id)
    return {
        "bad_total_kg_co2e": total,
        "category_totals": breakdown["categories"],
        "quality_totals": breakdown["quality_sources"],
    }


@router.get("/breakdown")
def get_emissions_breakdown(run_id: Optional[int] = Query(default=None)):
    """
    Detailed breakdown of emissions by category (electricity, transport, fuel, waste)
    and quality tags (measured, estimated, manual, assumed).
    """
    return engine.get_breakdown(run_id)


@router.get("/timeseries")
def get_emissions_timeseries(limit: int = Query(default=50, ge=1, le=500)):
    """
    Chronological time series of recent emission activities.
    """
    return engine.get_timeseries(limit=limit)


@router.get("/runs/compare")
def compare_accounting_runs(
    run_a: str = Query(default="baseline_2026", description="Baseline run name"),
    run_b: str = Query(default="optimized_live", description="Optimized run name"),
):
    """
    Compares carbon performance between two runs (e.g. baseline vs optimized).
    """
    return engine.compare_runs(run_a, run_b)
