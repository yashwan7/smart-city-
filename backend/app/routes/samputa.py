"""
backend/app/routes/samputa.py
=============================
Samputa Carbon Bank endpoints for biochar batch lifecycle management
and traditional sustainability practice check-ins.
"""

from fastapi import APIRouter, HTTPException, Query, status
from typing import Any, Dict, List, Optional

from ..models import SamputaSealRequest, SamputaVerifyRequest, TraditionalCreditRequest
from ..samputa import SamputaEngine

router = APIRouter(tags=["Samputa Carbon Bank"])
engine = SamputaEngine()


@router.post("/samputa/batch", status_code=status.HTTP_201_CREATED)
def create_samputa_batch(
    batch_id: str = Query(..., description="Unique batch ID, e.g. 'SAMPUTA-2026-001'"),
    capacity_litres: float = Query(default=20.0, gt=0.0),
    assumed_density_kg_per_l: float = Query(default=0.40, gt=0.0),
    depositor: Optional[str] = Query(default=None),
):
    """Initializes a new Samputa batch in 'OPEN' status."""
    try:
        return engine.create_batch(
            batch_id=batch_id,
            capacity_litres=capacity_litres,
            assumed_density_kg_per_l=assumed_density_kg_per_l,
            depositor=depositor,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/samputa/seal", status_code=status.HTTP_200_OK)
def seal_samputa_batch(req: SamputaSealRequest):
    """
    Transitions a batch from 'OPEN' to 'SEALED'.
    Computes PROJECTED net carbon benefit with disclosed 30% haircut:
        Capacity(20L) * Fill% * Density(0.4kg/L) * 0.5 * (1 - 0.30)
    Clearly flagged as assumption until scale verification.
    """
    try:
        return engine.seal_batch(
            batch_id=req.batch_id,
            fill_percentage=req.fill_percentage,
            capacity_litres=req.capacity_litres,
            assumed_density_kg_per_l=req.assumed_density_kg_per_l,
            depositor=req.depositor,
            notes=req.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/samputa/verify", status_code=status.HTTP_200_OK)
def verify_samputa_batch(req: SamputaVerifyRequest):
    """
    Transitions a batch from 'SEALED' to 'CREDITED' using certified weighed mass.
    Calculates verified net benefit with 30% durability haircut.
    Strictly prevents duplicate crediting!
    """
    try:
        return engine.verify_and_credit_batch(
            batch_id=req.batch_id,
            weighed_mass_kg=req.weighed_mass_kg,
            verifier=req.verifier,
            notes=req.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/traditional", status_code=status.HTTP_201_CREATED)
def record_traditional_offset(req: TraditionalCreditRequest):
    """
    Records traditional climate avoidance practice ('matka' or 'handloom').
    Enforces anti-spam rule: rejects duplicate claims by same depositor within 24 hours.
    """
    try:
        return engine.record_traditional_credit(
            practice=req.practice.value,
            quantity=req.quantity,
            depositor=req.depositor,
            notes=req.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/samputa/batches", response_model=List[Dict[str, Any]])
def list_batches():
    """Lists all registered Samputa biochar batches and their lifecycle statuses."""
    return engine.list_batches()


@router.get("/samputa/summary")
def get_sequestration_summary():
    """Returns total GOOD sequestration benefits partitioned by verified vs projected."""
    return engine.get_total_sequestration()
