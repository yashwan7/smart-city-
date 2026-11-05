"""
backend/app/models.py
=====================
Pydantic v2 schemas for request validation, canonical serialization,
and API response contracts for CarbonMesh v2.
"""

from enum import Enum
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


# ==============================================================================
# Ingest & Telemetry Models
# ==============================================================================

class SensorPacket(BaseModel):
    """
    Standard sensor packet format from ESP32/NXP/Kiosk:
    node|seq|ts|canonical_json(d)
    """
    node: str = Field(..., description="Unique node identity, e.g. 'node-01', 'esp32-grid-01'")
    seq: int = Field(..., ge=1, description="Strictly increasing integer sequence number")
    ts: float = Field(..., description="POSIX timestamp in seconds")
    d: Dict[str, Any] = Field(..., description="Sensor readings payload (e.g. power_w, energy_kwh, fill_pct)")
    sig: str = Field(..., description="HMAC-SHA256 signature in hexadecimal")

    @field_validator("node")
    @classmethod
    def validate_node(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("node identity cannot be empty")
        return clean

    @field_validator("sig")
    @classmethod
    def validate_sig(cls, v: str) -> str:
        clean = v.strip().lower()
        if len(clean) != 64:
            raise ValueError("HMAC-SHA256 signature must be a 64-character hex string")
        return clean


class IngestResponse(BaseModel):
    status: str = "ACCEPTED"
    node: str
    seq: int
    record_hash: str
    prev_hash: str
    emissions_evaluated_kg_co2e: Optional[float] = None
    net_carbon_kg_co2e: float
    message: str = "Packet cryptographically verified and anchored in append-only ledger"


# ==============================================================================
# Emission Models
# ==============================================================================

class CommuteMode(str, Enum):
    WALK = "walk"
    BICYCLE = "bicycle"
    TWO_WHEELER = "two_wheeler"
    CAR = "car"
    BUS = "bus"
    METRO = "metro"


class CommuteRequest(BaseModel):
    mode: CommuteMode = Field(..., description="Transport mode ('walk', 'bicycle', 'two_wheeler', 'car', 'bus', 'metro')")
    distance_km: float = Field(..., gt=0.0, description="One-way or total travel distance in kilometres")
    occupancy: int = Field(default=1, ge=1, description="Vehicle occupancy (for carpool / public transit allocation)")
    notes: Optional[str] = Field(default=None, description="Optional notes or trip tag")


class FuelType(str, Enum):
    DIESEL = "diesel"
    PETROL = "petrol"
    CNG = "cng"
    LPG = "lpg"


class FuelRequest(BaseModel):
    fuel_type: FuelType = Field(..., description="Fuel type ('diesel', 'petrol', 'cng', 'lpg')")
    litres: float = Field(..., gt=0.0, description="Volume of fuel consumed in litres (or kg for CNG/LPG)")
    equipment: Optional[str] = Field(default=None, description="Generator, pump, or fleet identifier")
    notes: Optional[str] = Field(default=None, description="Optional notes")


# ==============================================================================
# Samputa & Sequestration Models
# ==============================================================================

class SamputaSealRequest(BaseModel):
    batch_id: str = Field(..., description="Batch identifier, e.g. 'SAMPUTA-2026-001'")
    fill_percentage: float = Field(..., ge=0.0, le=100.0, description="Ultrasonic or visual fill level % (0-100)")
    capacity_litres: float = Field(default=20.0, gt=0.0, description="Cylinder volumetric capacity (default: 20L)")
    assumed_density_kg_per_l: float = Field(default=0.40, gt=0.0, description="Assumed density (default: 0.4 kg/L)")
    depositor: Optional[str] = Field(default=None, description="Farmer, campus, or facility operator name")
    notes: Optional[str] = Field(default=None, description="Biomass substrate details, e.g. rice husk biochar")


class SamputaVerifyRequest(BaseModel):
    batch_id: str = Field(..., description="Batch identifier to verify and credit")
    weighed_mass_kg: float = Field(..., gt=0.0, description="Certified scale weighed mass in kilograms")
    verifier: Optional[str] = Field(default=None, description="Inspector / verifier name or badge")
    notes: Optional[str] = Field(default=None, description="Verification notes")


class TraditionalPracticeType(str, Enum):
    MATKA = "matka"
    HANDLOOM = "handloom"


class TraditionalCreditRequest(BaseModel):
    practice: TraditionalPracticeType = Field(..., description="'matka' (clay pot cooling) or 'handloom' (textile weave)")
    quantity: float = Field(..., gt=0.0, description="Days in service (for matka) or metres produced (for handloom)")
    depositor: str = Field(..., description="Unique person, student or household ID to prevent duplicate same-day credits")
    notes: Optional[str] = Field(default=None, description="Description or location")


# ==============================================================================
# Control & Events Models
# ==============================================================================

class RelayControlRequest(BaseModel):
    node_id: str = Field(..., description="Target node for relay override")
    action: str = Field(..., description="'TURN_OFF', 'TURN_ON', 'SHUTDOWN', or 'RESTORE'")
    reason: str = Field(..., description="Reason for override, e.g. 'Load shedding during net carbon deficit'")
    operator: str = Field(default="admin", description="Operator identity or automated service")
    signature: Optional[str] = Field(default=None, description="Optional HMAC signature for verified remote control")


# ==============================================================================
# Ledger & Verification Responses
# ==============================================================================

class LedgerVerifyResponse(BaseModel):
    status: str = Field(..., description="'OK' if entire hash-chain is integral, 'BROKEN' if tampered")
    records_verified: int
    first_broken_id: Optional[int] = None
    broken_reason: Optional[str] = None
    checked_at: float = Field(default_factory=time.time)


class TamperDemoResponse(BaseModel):
    demonstration: str = "TAMPER_DETECTION_PROOF"
    tampered_record_id: int
    original_record_hash: str
    recalculated_record_hash: str
    verification_result: str
    message: str = "Tamper successfully detected! Hash chain rejected the modified record."


# ==============================================================================
# Net Carbon & Summary Responses
# ==============================================================================

class NetCarbonResponse(BaseModel):
    bad_emissions_kg_co2e: float = Field(..., description="BAD = total gross emitted kg CO2e")
    good_sequestration_kg_co2e: float = Field(..., description="GOOD = total net sequestration & avoidance benefit kg CO2e")
    good_verified_kg_co2e: float = Field(..., description="Subset of GOOD that is physically certified/weighed")
    good_projected_kg_co2e: float = Field(..., description="Subset of GOOD that is modeled / projected")
    net_carbon_kg_co2e: float = Field(..., description="NET = BAD - GOOD (Negative means net-carbon-negative)")
    is_net_negative: bool = Field(..., description="True if net carbon is negative within this accounting boundary")
    yagna_ratio: Optional[float] = Field(..., description="GOOD / BAD ratio (safely None or float if BAD=0)")
    quality_breakdown: Dict[str, float] = Field(default_factory=dict, description="Emissions partitioned by quality tag")
    category_breakdown: Dict[str, float] = Field(default_factory=dict, description="Emissions partitioned by category")
    timestamp: float = Field(default_factory=time.time)


class RecommendationItem(BaseModel):
    id: int
    title: str
    recommendation: str
    estimated_savings_kg_co2e: float
    calculation_basis: str
    advisor_text: str
    validation_status: str = "VALIDATED"
