from typing import Dict, List, Optional, Any, Literal
from pydantic import BaseModel, Field, model_validator
import time

class NodePacket(BaseModel):
    node: str = Field(..., description="Unique node identifier, e.g., 'node_a', 'node_b'")
    seq: int = Field(..., ge=1, description="Strictly monotonic sequence number per node")
    ts: float = Field(default_factory=time.time, description="Unix timestamp of sensor reading")
    d: Optional[Dict[str, Any]] = Field(default=None, description="Sensor/activity payload dictionary (agreed backend contract)")
    payload: Optional[Dict[str, Any]] = Field(default=None, description="Alternative alias for telemetry payload")
    sig: str = Field(..., description="HMAC-SHA256 signature of canonical payload")

    @model_validator(mode="after")
    def populate_payload(self):
        if self.d is None and self.payload is None:
            raise ValueError("Either 'd' or 'payload' dictionary must be provided")
        if self.d is not None and self.payload is None:
            self.payload = self.d
        elif self.payload is not None and self.d is None:
            self.d = self.payload
        return self

class BatchIngestRequest(BaseModel):
    packets: List[NodePacket] = Field(..., description="Buffered array of packets for offline recovery")

class CommuteRequest(BaseModel):
    mode: Literal["car_solo", "two_wheeler", "bus", "metro", "bicycle", "walking"] = Field(
        ..., description="Commute transportation mode"
    )
    km: Optional[float] = Field(default=None, description="Distance in km (defaults to standard trip distance if omitted)")
    source: Literal["kiosk", "phone"] = Field(default="kiosk", description="Origin of commute entry")

class FuelRequest(BaseModel):
    fuel: Literal["diesel", "petrol"] = Field(..., description="Type of fuel consumed")
    litres: float = Field(..., gt=0, description="Volume of fuel in litres")
    source: Literal["manual", "sensor_hotspot"] = Field(default="manual", description="Source of fuel activity data")

class RelayControlRequest(BaseModel):
    node: str = Field(..., description="Target node identifier")
    state: Literal["ON", "OFF"] = Field(..., description="Target relay state")
    reason: str = Field(..., description="Reason for state transition override")
    auth_token: Optional[str] = Field(default=None, description="Signed hub command authorization token")

class RunStartRequest(BaseModel):
    label: Literal["baseline", "optimized"] = Field(..., description="Type of comparative run")

class TamperDemoRequest(BaseModel):
    record_id: int = Field(..., description="Database record ID to silently tamper with")
    tampered_payload: Dict[str, Any] = Field(..., description="Tampered payload dictionary")


class ScheduleJobModel(BaseModel):
    id: str = Field(..., description="Unique job identifier, e.g., 'ev_charge'")
    name: Optional[str] = Field(default=None, description="Human readable device name")
    category: Optional[str] = Field(default="load", description="Appliance load category")
    release: int = Field(default=0, ge=0, le=39, description="Release slot index (0..39)")
    deadline: int = Field(default=40, ge=1, le=40, description="Exclusive deadline slot (1..40)")
    units: int = Field(..., ge=1, description="Total work units in kWh")
    remaining_units: Optional[int] = Field(default=None, ge=0, description="Remaining unfinished kWh units")
    power_kw: Optional[float] = Field(default=2.0, description="Nominal power draw in kW")


class SchedulePreviewRequest(BaseModel):
    jobs: Optional[List[ScheduleJobModel]] = Field(default=None, description="Custom list of flexible load jobs")
    current_slot: Optional[int] = Field(default=0, ge=0, le=39, description="Current simulated or wall clock slot")
    currency: Optional[Literal["INR", "GBP"]] = Field(default="INR", description="Tariff currency")
    capacity_units: Optional[int] = Field(default=4, ge=1, le=16, description="Max units of work per slot")


class ScheduleExecuteRequest(BaseModel):
    schedule_id: Optional[int] = Field(default=None, description="Optional ID of a previously previewed schedule")
    schedule_data: Optional[Dict[str, Any]] = Field(default=None, description="Direct preview response payload to approve")
    mode: Optional[Literal["SIMULATION", "HARDWARE_ENABLED"]] = Field(default="SIMULATION", description="Execution target mode")


class ScheduleOverrideRequest(BaseModel):
    override: bool = Field(..., description="True to activate manual safety override, False to resume scheduler")
    reason: str = Field(default="Manual user override", description="Explanation for safety log")

