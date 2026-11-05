"""CarbonMesh Scheduler Adapter.

Bridges CarbonMesh edge IoT telemetry, flexible electrical loads, tariffs,
and carbon intensity forecasts into the format expected by the scheduling optimizer.
"""
from typing import Dict, List, Any, Optional, Tuple
import copy
from hub.engine.scheduler_optimizer import decide

# 40 slots representing 04:00 to 24:00 (each slot = 30 minutes)
TOTAL_SLOTS = 40
START_HOUR = 4.0
SLOT_MINUTES = 30
SLOT_CAPACITY_KWH = 4  # 4 kWh per half-hour = 8 kW peak load limit

# Realistic flexible household / campus electrical loads
DEFAULT_FLEXIBLE_JOBS: List[Dict[str, Any]] = [
    {
        "id": "ev_charge",
        "name": "EV Fast Charger",
        "category": "transport",
        "release": 4,      # 06:00
        "deadline": 30,    # 19:00
        "units": 8,        # 8 kWh
        "remaining_units": 8,
        "power_kw": 3.6,
        "priority": "high",
    },
    {
        "id": "heat_pump",
        "name": "Smart Heat Pump / HVAC",
        "category": "cooling",
        "release": 8,      # 08:00
        "deadline": 24,    # 16:00
        "units": 5,        # 5 kWh
        "remaining_units": 5,
        "power_kw": 2.0,
        "priority": "medium",
    },
    {
        "id": "water_geyser",
        "name": "Thermal Water Geyser",
        "category": "thermal",
        "release": 2,      # 05:00
        "deadline": 12,    # 10:00
        "units": 3,        # 3 kWh
        "remaining_units": 3,
        "power_kw": 2.5,
        "priority": "medium",
    },
    {
        "id": "dishwasher",
        "name": "Eco Washing Cycle",
        "category": "appliance",
        "release": 10,     # 09:00
        "deadline": 22,    # 15:00
        "units": 2,        # 2 kWh
        "remaining_units": 2,
        "power_kw": 1.5,
        "priority": "low",
    },
    {
        "id": "battery_bank",
        "name": "Solar Battery Storage Bank",
        "category": "storage",
        "release": 12,     # 10:00
        "deadline": 28,    # 18:00
        "units": 6,        # 6 kWh
        "remaining_units": 6,
        "power_kw": 3.0,
        "priority": "high",
    },
]


def slot_to_time(slot: int) -> str:
    """Converts slot index (0..39) to HH:MM clock string (04:00..23:30)."""
    total_minutes = int(START_HOUR * 60 + slot * SLOT_MINUTES)
    hours = (total_minutes // 60) % 24
    minutes = total_minutes % 60
    return f"{hours:02d}:{minutes:02d}"


def time_to_slot(time_str: str) -> int:
    """Converts HH:MM clock string into the nearest slot index (0..39)."""
    parts = time_str.strip().split(":")
    hours = int(parts[0])
    minutes = int(parts[1]) if len(parts) > 1 else 0
    total_min = hours * 60 + minutes
    start_min = int(START_HOUR * 60)
    diff = total_min - start_min
    if diff < 0:
        return 0
    slot = int(round(diff / SLOT_MINUTES))
    return min(TOTAL_SLOTS - 1, max(0, slot))


def get_default_tariff_profile(currency: str = "INR") -> List[float]:
    """Generates standard 40-slot Time-of-Day (ToD) tariff profile.

    Solar hours (10:00-15:30) are heavily discounted.
    Evening peak hours (18:00-21:30) have peak penalties.
    """
    tariffs = []
    for s in range(TOTAL_SLOTS):
        # 10:00 to 15:30 (slots 12 to 23) -> Solar hours
        if 12 <= s <= 23:
            tariffs.append(4.20 if currency == "INR" else 0.14)
        # 18:00 to 21:30 (slots 28 to 35) -> Peak stress hours
        elif 28 <= s <= 35:
            tariffs.append(10.80 if currency == "INR" else 0.36)
        # 22:00 to 23:30 (slots 36 to 39) -> Night off-peak
        elif s >= 36:
            tariffs.append(5.20 if currency == "INR" else 0.18)
        # Morning & afternoon normal hours
        else:
            tariffs.append(6.80 if currency == "INR" else 0.24)
    return tariffs


def get_default_carbon_forecast() -> List[Dict[str, Any]]:
    """Generates 40-slot grid carbon intensity forecast (g CO2e / kWh).

    Reflects diurnal solar curve: low carbon during midday solar generation,
    and high thermal carbon during evening residential peak.
    """
    forecast = []
    for s in range(TOTAL_SLOTS):
        if 12 <= s <= 23:
            # Solar peak: green energy dominates (210 - 270 g/kWh)
            g_co2 = 210.0 + (s - 17) ** 2 * 2.5
        elif 28 <= s <= 35:
            # Evening thermal peak: coal peakers fire up (720 - 790 g/kWh)
            g_co2 = 740.0 + (s - 31) ** 2 * 3.0
        elif s >= 36:
            # Night off-peak wind & base load (480 - 520 g/kWh)
            g_co2 = 500.0 - (s - 36) * 10.0
        else:
            # Morning ramp-up (450 - 540 g/kWh)
            g_co2 = 470.0 + s * 7.0
        forecast.append({"slot": s, "carbon_g_per_kwh": round(g_co2, 1)})
    return forecast


def validate_dispatch(
    observation: Dict[str, Any],
    dispatch: Dict[str, int]
) -> Tuple[bool, Optional[str]]:
    """Validates dispatch dictionary against capacity, existence and deadlines."""
    if not isinstance(dispatch, dict):
        return False, "Dispatch must be a dictionary of {job_id: units}"

    slot = observation["slot"]
    capacity = observation.get("capacity_units", SLOT_CAPACITY_KWH)
    available_jobs = {j["id"]: j for j in observation.get("jobs", [])}

    total_units = 0
    for jid, units in dispatch.items():
        if jid not in available_jobs:
            return False, f"Job '{jid}' is not released or available at slot {slot}"
        if not isinstance(units, int) or units < 0:
            return False, f"Units for job '{jid}' must be non-negative integer"
        job = available_jobs[jid]
        if units > job["remaining_units"]:
            return False, f"Job '{jid}' dispatched {units} units, but only {job['remaining_units']} remaining"
        if not (job["release"] <= slot < job["deadline"]):
            return False, f"Job '{jid}' dispatched outside window [{job['release']}, {job['deadline']})"
        total_units += units

    if total_units > capacity:
        return False, f"Total dispatched units ({total_units}) exceeds slot capacity ({capacity})"

    return True, None


def simulate_schedule(
    jobs: Optional[List[Dict[str, Any]]] = None,
    current_slot: int = 0,
    currency: str = "INR",
    tariff_profile: Optional[List[float]] = None,
    carbon_forecast: Optional[List[Dict[str, Any]]] = None,
    capacity_units: int = SLOT_CAPACITY_KWH,
) -> Dict[str, Any]:
    """Runs a complete simulation comparing Unmanaged (Immediate) vs Optimized scheduling.

    Returns:
        Dictionary with full schedule timeline, job completion statuses,
        baseline comparison, and cumulative cost & carbon savings.
    """
    job_catalog = [copy.deepcopy(j) for j in (jobs or DEFAULT_FLEXIBLE_JOBS)]
    tariffs = tariff_profile or get_default_tariff_profile(currency)
    forecast = carbon_forecast or get_default_carbon_forecast()
    forecast_dict = {f["slot"]: f["carbon_g_per_kwh"] for f in forecast}

    # ----------------------------------------------------
    # 1. OPTIMIZED ROLLING DISPATCH SIMULATION
    # ----------------------------------------------------
    remaining_opt = {j["id"]: j["remaining_units"] for j in job_catalog}
    opt_schedule = []
    opt_total_cost = 0.0
    opt_total_carbon_kg = 0.0
    opt_units_dispatched = 0
    opt_state = {}

    for s in range(current_slot, TOTAL_SLOTS):
        # Determine available jobs for slot s
        active_jobs = []
        for j in job_catalog:
            jid = j["id"]
            if j["release"] <= s < j["deadline"] and remaining_opt[jid] > 0:
                active_jobs.append({
                    "id": jid,
                    "release": j["release"],
                    "deadline": j["deadline"],
                    "units": j["units"],
                    "remaining_units": remaining_opt[jid]
                })

        obs = {
            "slot": s,
            "jobs": active_jobs,
            "capacity_units": capacity_units,
            "tariff_gbp_per_kwh": tariffs,
            "forecast": forecast,
            "history": [{"slot": max(0, s - 1), "carbon_g_per_kwh": forecast_dict.get(max(0, s - 1), 400.0)}],
            "horizon_slots": TOTAL_SLOTS,
            "total_jobs": len(job_catalog),
        }

        resp = decide(obs, opt_state)
        dispatch = resp.get("action", {}).get("dispatch", {})
        opt_state = resp.get("state", {})

        # Validate dispatch safety
        is_valid, err = validate_dispatch(obs, dispatch)
        if not is_valid:
            dispatch = {}

        slot_units = sum(dispatch.values())
        for jid, units in dispatch.items():
            remaining_opt[jid] -= units

        slot_tariff = tariffs[s]
        slot_carbon_g = forecast_dict.get(s, 400.0)
        slot_cost = slot_units * slot_tariff
        slot_carbon_kg = (slot_units * slot_carbon_g) / 1000.0

        opt_total_cost += slot_cost
        opt_total_carbon_kg += slot_carbon_kg
        opt_units_dispatched += slot_units

        opt_schedule.append({
            "slot": s,
            "time": slot_to_time(s),
            "dispatch": dispatch,
            "units": slot_units,
            "tariff": slot_tariff,
            "carbon_g_per_kwh": slot_carbon_g,
            "cost": round(slot_cost, 2),
            "carbon_kg": round(slot_carbon_kg, 3),
            "is_solar_window": 12 <= s <= 23,
            "is_peak_window": 28 <= s <= 35,
        })

    # ----------------------------------------------------
    # 2. BASELINE (IMMEDIATE / UNMANAGED) SIMULATION
    # ----------------------------------------------------
    remaining_base = {j["id"]: j["remaining_units"] for j in job_catalog}
    base_schedule = []
    base_total_cost = 0.0
    base_total_carbon_kg = 0.0
    base_units_dispatched = 0

    for s in range(current_slot, TOTAL_SLOTS):
        slot_cap = capacity_units
        dispatch_base = {}

        # Greedy: Run as soon as released until capacity is filled
        for j in job_catalog:
            jid = j["id"]
            if j["release"] <= s < j["deadline"] and remaining_base[jid] > 0 and slot_cap > 0:
                amount = min(slot_cap, remaining_base[jid])
                if amount > 0:
                    dispatch_base[jid] = amount
                    remaining_base[jid] -= amount
                    slot_cap -= amount

        slot_units = sum(dispatch_base.values())
        slot_tariff = tariffs[s]
        slot_carbon_g = forecast_dict.get(s, 400.0)
        slot_cost = slot_units * slot_tariff
        slot_carbon_kg = (slot_units * slot_carbon_g) / 1000.0

        base_total_cost += slot_cost
        base_total_carbon_kg += slot_carbon_kg
        base_units_dispatched += slot_units

        base_schedule.append({
            "slot": s,
            "time": slot_to_time(s),
            "dispatch": dispatch_base,
            "units": slot_units,
            "cost": round(slot_cost, 2),
            "carbon_kg": round(slot_carbon_kg, 3),
        })

    # ----------------------------------------------------
    # 3. METRICS & SAVINGS AGGREGATION
    # ----------------------------------------------------
    total_requested_units = sum(j["units"] for j in job_catalog)
    opt_completion_rate = round(opt_units_dispatched / max(1, total_requested_units), 4)
    base_completion_rate = round(base_units_dispatched / max(1, total_requested_units), 4)

    cost_saved = round(max(0.0, base_total_cost - opt_total_cost), 2)
    pct_cost_saved = round((cost_saved / max(0.01, base_total_cost)) * 100.0, 1)

    carbon_saved_kg = round(max(0.0, base_total_carbon_kg - opt_total_carbon_kg), 3)
    pct_carbon_saved = round((carbon_saved_kg / max(0.001, base_total_carbon_kg)) * 100.0, 1)

    job_statuses = []
    for j in job_catalog:
        jid = j["id"]
        rem = remaining_opt[jid]
        comp = j["units"] - rem
        job_statuses.append({
            "id": jid,
            "name": j.get("name", jid),
            "category": j.get("category", "load"),
            "release_time": slot_to_time(j["release"]),
            "deadline_time": slot_to_time(j["deadline"]),
            "total_units_kwh": j["units"],
            "completed_kwh": comp,
            "remaining_kwh": rem,
            "status": "COMPLETED" if rem == 0 else ("IN_PROGRESS" if comp > 0 else "QUEUED"),
            "guaranteed_on_time": rem == 0,
        })

    return {
        "status": "ok",
        "currency": currency,
        "current_slot": current_slot,
        "current_time": slot_to_time(current_slot),
        "total_jobs": len(job_catalog),
        "total_units_kwh": total_requested_units,
        "summary": {
            "baseline": {
                "total_cost": round(base_total_cost, 2),
                "total_carbon_kg": round(base_total_carbon_kg, 3),
                "completion_fraction": base_completion_rate,
            },
            "optimized": {
                "total_cost": round(opt_total_cost, 2),
                "total_carbon_kg": round(opt_total_carbon_kg, 3),
                "completion_fraction": opt_completion_rate,
            },
            "savings": {
                "cost_saved": cost_saved,
                "pct_cost_saved": pct_cost_saved,
                "carbon_saved_kg": carbon_saved_kg,
                "pct_carbon_saved": pct_carbon_saved,
            },
            "horns_condition_guarantee": opt_completion_rate >= 0.999,
        },
        "jobs": job_statuses,
        "timeline": opt_schedule,
    }

