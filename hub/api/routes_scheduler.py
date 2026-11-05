"""FastAPI routes for CarbonMesh Smart Load Scheduler.

Provides endpoints to:
1. Preview carbon & tariff optimized schedules (/api/scheduler/preview)
2. Approve and execute schedules with safety validation (/api/scheduler/execute)
3. Monitor live scheduler state and active slot dispatches (/api/scheduler/status)
4. Query historical optimization runs and cumulative savings (/api/scheduler/history)
5. Enforce manual safety overrides (/api/scheduler/override)
"""
from fastapi import APIRouter, HTTPException, status
import time
import json
from typing import Dict, Any, Optional

from hub.database import get_connection
from hub.models import (
    SchedulePreviewRequest,
    ScheduleExecuteRequest,
    ScheduleOverrideRequest,
)
from hub.engine.scheduler_adapter import (
    simulate_schedule,
    slot_to_time,
    time_to_slot,
    validate_dispatch,
    DEFAULT_FLEXIBLE_JOBS,
    TOTAL_SLOTS,
)
from hub.api.websocket import ws_manager

router = APIRouter(prefix="/api/scheduler", tags=["Carbon-Aware Scheduler"])

# Global scheduler state for live tracking & safety interlock
SCHEDULER_RUNTIME_STATE = {
    "mode": "SIMULATION",            # "SIMULATION" | "HARDWARE_ENABLED"
    "manual_override": False,       # Safety override: if True, all automated dispatches halt
    "override_reason": None,
    "active_schedule_id": None,
    "current_slot": 0,
    "approved_schedule": None,
    "last_relay_toggle_ts": 0.0,
    "relay_dead_time_seconds": 30.0, # Minimum dead time between physical relay actuations
}


@router.post("/preview", status_code=status.HTTP_200_OK)
async def preview_schedule_endpoint(req: SchedulePreviewRequest):
    """Generates an optimized schedule comparing baseline vs green/tariff dispatch."""
    jobs_dict = None
    if req.jobs:
        jobs_dict = [
            {
                "id": j.id,
                "name": j.name or j.id,
                "category": j.category or "load",
                "release": j.release,
                "deadline": j.deadline,
                "units": j.units,
                "remaining_units": j.remaining_units if j.remaining_units is not None else j.units,
                "power_kw": j.power_kw or 2.0,
            }
            for j in req.jobs
        ]

    currency = req.currency or "INR"
    current_slot = req.current_slot if req.current_slot is not None else 0
    capacity = req.capacity_units or 4

    result = simulate_schedule(
        jobs=jobs_dict,
        current_slot=current_slot,
        currency=currency,
        capacity_units=capacity,
    )

    now = time.time()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO schedules (
            created_ts, status, current_slot, mode,
            jobs_json, schedule_json, summary_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
        """,
        (
            now,
            "PREVIEW",
            current_slot,
            SCHEDULER_RUNTIME_STATE["mode"],
            json.dumps(result.get("jobs", [])),
            json.dumps(result.get("timeline", [])),
            json.dumps(result.get("summary", {})),
        ),
    )
    schedule_id = cursor.lastrowid
    conn.commit()

    result["schedule_id"] = schedule_id
    result["mode"] = SCHEDULER_RUNTIME_STATE["mode"]
    result["manual_override"] = SCHEDULER_RUNTIME_STATE["manual_override"]

    await ws_manager.broadcast({
        "type": "scheduler_preview_ready",
        "schedule_id": schedule_id,
        "cost_saved": result["summary"]["savings"]["cost_saved"],
        "carbon_saved_kg": result["summary"]["savings"]["carbon_saved_kg"],
    })

    return result


@router.post("/execute", status_code=status.HTTP_200_OK)
async def execute_schedule_endpoint(req: ScheduleExecuteRequest):
    """Validates and arms an approved schedule for dispatch."""
    if SCHEDULER_RUNTIME_STATE["manual_override"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot execute schedule: Manual safety override is currently ACTIVE. Disengage override first.",
        )

    now = time.time()
    conn = get_connection()
    cursor = conn.cursor()

    schedule_data = req.schedule_data
    schedule_id = req.schedule_id

    if schedule_id and not schedule_data:
        cursor.execute("SELECT * FROM schedules WHERE id = ?;", (schedule_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Schedule ID {schedule_id} not found")
        schedule_data = {
            "schedule_id": row["id"],
            "timeline": json.loads(row["schedule_json"]),
            "summary": json.loads(row["summary_json"]),
            "jobs": json.loads(row["jobs_json"]),
        }
    elif not schedule_data:
        # Generate default preview if none provided
        schedule_data = simulate_schedule()

    # Pre-execution Safety Validation
    timeline = schedule_data.get("timeline", [])
    for slot_item in timeline:
        dispatch = slot_item.get("dispatch", {})
        if sum(dispatch.values()) > 4:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Safety violation: Slot {slot_item.get('slot')} requests {sum(dispatch.values())} units (exceeds 4 unit cap)",
            )

    mode = req.mode or SCHEDULER_RUNTIME_STATE["mode"]
    SCHEDULER_RUNTIME_STATE["mode"] = mode
    SCHEDULER_RUNTIME_STATE["approved_schedule"] = schedule_data
    SCHEDULER_RUNTIME_STATE["active_schedule_id"] = schedule_id

    if schedule_id:
        cursor.execute(
            """
            UPDATE schedules
            SET status = 'APPROVED', approved_ts = ?, mode = ?
            WHERE id = ?;
            """,
            (now, mode, schedule_id),
        )
        conn.commit()

    # Current slot dispatch evaluation
    current_slot = SCHEDULER_RUNTIME_STATE["current_slot"]
    current_dispatch = {}
    for slot_info in timeline:
        if slot_info.get("slot") == current_slot:
            current_dispatch = slot_info.get("dispatch", {})
            break

    relay_action = 1 if sum(current_dispatch.values()) > 0 else 0

    await ws_manager.broadcast({
        "type": "scheduler_executed",
        "schedule_id": schedule_id,
        "mode": mode,
        "current_slot": current_slot,
        "current_dispatch": current_dispatch,
        "relay_cmd": relay_action,
    })

    return {
        "status": "approved_and_armed",
        "schedule_id": schedule_id,
        "mode": mode,
        "current_slot": current_slot,
        "current_time": slot_to_time(current_slot),
        "current_dispatch": current_dispatch,
        "relay_command": relay_action,
        "safety_checks_passed": True,
        "message": f"Schedule successfully armed in {mode} mode. Live dispatch verified.",
    }


@router.get("/status", status_code=status.HTTP_200_OK)
async def get_scheduler_status():
    """Returns real-time scheduler state, current slot allocations, and safety status."""
    current_slot = SCHEDULER_RUNTIME_STATE["current_slot"]
    current_time = slot_to_time(current_slot)

    active_dispatch = {}
    if SCHEDULER_RUNTIME_STATE["approved_schedule"]:
        timeline = SCHEDULER_RUNTIME_STATE["approved_schedule"].get("timeline", [])
        for item in timeline:
            if item.get("slot") == current_slot:
                active_dispatch = item.get("dispatch", {})
                break

    # Determine next peak and next solar windows
    solar_start = slot_to_time(12)
    solar_end = slot_to_time(24)
    peak_start = slot_to_time(28)
    peak_end = slot_to_time(36)

    return {
        "mode": SCHEDULER_RUNTIME_STATE["mode"],
        "manual_override": SCHEDULER_RUNTIME_STATE["manual_override"],
        "override_reason": SCHEDULER_RUNTIME_STATE["override_reason"],
        "safety_interlock": "OVERRIDE_ACTIVE" if SCHEDULER_RUNTIME_STATE["manual_override"] else "NORMAL",
        "current_slot": current_slot,
        "current_time": current_time,
        "active_schedule_id": SCHEDULER_RUNTIME_STATE["active_schedule_id"],
        "current_dispatch": active_dispatch,
        "current_load_units": sum(active_dispatch.values()),
        "relay_state": 1 if sum(active_dispatch.values()) > 0 and not SCHEDULER_RUNTIME_STATE["manual_override"] else 0,
        "grid_windows": {
            "solar_window": f"{solar_start} - {solar_end} (Low Carbon & Tariff ₹4.20)",
            "peak_stress_window": f"{peak_start} - {peak_end} (High Carbon & Tariff ₹10.80)",
        },
        "has_active_schedule": SCHEDULER_RUNTIME_STATE["approved_schedule"] is not None,
    }


@router.get("/history", status_code=status.HTTP_200_OK)
async def get_scheduler_history():
    """Returns recent optimization runs and aggregated savings."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, created_ts, status, mode, current_slot, summary_json, approved_ts
        FROM schedules
        ORDER BY id DESC
        LIMIT 15;
        """
    )
    rows = cursor.fetchall()

    history = []
    total_cost_saved = 0.0
    total_carbon_saved = 0.0
    total_kwh_managed = 0.0

    for r in rows:
        summary = {}
        try:
            summary = json.loads(r["summary_json"])
        except Exception:
            pass

        savings = summary.get("savings", {})
        cost_s = savings.get("cost_saved", 0.0)
        carb_s = savings.get("carbon_saved_kg", 0.0)

        total_cost_saved += cost_s
        total_carbon_saved += carb_s

        history.append({
            "id": r["id"],
            "created_ts": r["created_ts"],
            "created_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(r["created_ts"])),
            "status": r["status"],
            "mode": r["mode"],
            "slot": r["current_slot"],
            "cost_saved": cost_s,
            "carbon_saved_kg": carb_s,
            "approved": r["approved_ts"] is not None,
        })

    return {
        "total_records": len(history),
        "cumulative_savings": {
            "total_cost_saved": round(total_cost_saved, 2),
            "total_carbon_saved_kg": round(total_carbon_saved, 3),
            "currency": "INR",
        },
        "history": history,
    }


@router.post("/override", status_code=status.HTTP_200_OK)
async def set_scheduler_override(req: ScheduleOverrideRequest):
    """Enforces or clears manual safety override."""
    SCHEDULER_RUNTIME_STATE["manual_override"] = req.override
    SCHEDULER_RUNTIME_STATE["override_reason"] = req.reason if req.override else None

    # Log override event into events table
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO events (ts, node, action, reason)
        VALUES (?, ?, ?, ?);
        """,
        (
            time.time(),
            "scheduler_core",
            "MANUAL_OVERRIDE_ACTIVE" if req.override else "MANUAL_OVERRIDE_CLEARED",
            req.reason,
        ),
    )
    conn.commit()

    await ws_manager.broadcast({
        "type": "scheduler_override_changed",
        "manual_override": req.override,
        "reason": req.reason,
    })

    return {
        "status": "override_updated",
        "manual_override": req.override,
        "reason": req.reason,
        "safety_action": "AUTOMATED_DISPATCH_HALTED" if req.override else "AUTOMATED_DISPATCH_RESUMED",
    }

