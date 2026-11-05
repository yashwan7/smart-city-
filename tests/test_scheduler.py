"""Comprehensive test suite for CarbonMesh Carbon-Aware Smart Load Scheduler.

Verifies:
1. Core optimizer contract (decide function signature, bounds, and Horn's feasibility)
2. Scheduler adapter (timeline simulation, baseline vs optimized comparison, 100% completion)
3. Safety mechanisms (capacity limits, dead-time, invalid dispatch rejection)
4. FastAPI endpoints (/preview, /execute, /status, /history, /override)
"""
import pytest
from fastapi.testclient import TestClient

from hub.main import app
from hub.database import init_db
from hub.engine.scheduler_optimizer import decide
from hub.engine.scheduler_adapter import (
    simulate_schedule,
    validate_dispatch,
    slot_to_time,
    time_to_slot,
    DEFAULT_FLEXIBLE_JOBS,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db(tmp_path):
    test_db = str(tmp_path / "test_carbonmesh.db")
    init_db(test_db)


# ---------------------------------------------------------
# 1. OPTIMIZER CONTRACT & HORN'S INVARIANT TESTS
# ---------------------------------------------------------
def test_optimizer_decide_structure():
    """Optimizer must strictly return {'action': {'dispatch': ...}, 'state': ...}."""
    obs = {
        "slot": 10,
        "jobs": [
            {"id": "j1", "release": 8, "deadline": 14, "units": 4, "remaining_units": 4},
            {"id": "j2", "release": 10, "deadline": 20, "units": 6, "remaining_units": 6},
        ],
        "capacity_units": 4,
        "tariff_gbp_per_kwh": [5.0] * 40,
        "forecast": [{"slot": s, "carbon_g_per_kwh": 300.0} for s in range(40)],
        "history": [{"slot": 9, "carbon_g_per_kwh": 320.0}],
        "horizon_slots": 40,
    }
    state = {}
    resp = decide(obs, state)

    assert isinstance(resp, dict)
    assert set(resp.keys()) == {"action", "state"}
    assert "dispatch" in resp["action"]
    dispatch = resp["action"]["dispatch"]

    assert isinstance(dispatch, dict)
    total_dispatched = sum(dispatch.values())
    assert total_dispatched <= obs["capacity_units"]
    for jid, amt in dispatch.items():
        assert amt >= 0
        assert amt <= 4


def test_optimizer_horns_condition_forces_work():
    """When remaining units equal remaining slots * capacity, Horn's condition forces maximum capacity work."""
    # Slot 18, deadline 19 (only 1 slot left!). Job has 4 units remaining.
    obs = {
        "slot": 18,
        "jobs": [
            {"id": "urgent_job", "release": 10, "deadline": 19, "units": 4, "remaining_units": 4}
        ],
        "capacity_units": 4,
        "tariff_gbp_per_kwh": [10.0] * 40, # expensive slot, but MUST run
        "forecast": [{"slot": s, "carbon_g_per_kwh": 800.0} for s in range(40)],
        "horizon_slots": 40,
    }
    resp = decide(obs, {})
    dispatch = resp["action"]["dispatch"]
    # Must dispatch all 4 units because deadline is at slot 19
    assert dispatch.get("urgent_job") == 4


# ---------------------------------------------------------
# 2. SCHEDULER ADAPTER & SIMULATION TESTS
# ---------------------------------------------------------
def test_time_conversions():
    """Verify clock to slot bidirectional mapping."""
    assert slot_to_time(0) == "04:00"
    assert slot_to_time(12) == "10:00"
    assert slot_to_time(28) == "18:00"
    assert slot_to_time(39) == "23:30"

    assert time_to_slot("04:00") == 0
    assert time_to_slot("10:00") == 12
    assert time_to_slot("18:00") == 28


def test_simulation_100_percent_completion_and_savings():
    """Simulation must achieve 100% completion and demonstrate cost/carbon savings."""
    res = simulate_schedule(currency="INR", capacity_units=4)
    assert res["status"] == "ok"
    summary = res["summary"]

    # 100% Completion guarantee
    assert summary["optimized"]["completion_fraction"] == 1.0
    assert summary["horns_condition_guarantee"] is True

    # Real positive savings
    savings = summary["savings"]
    assert savings["cost_saved"] > 0
    assert savings["carbon_saved_kg"] > 0
    assert savings["pct_cost_saved"] >= 15.0  # Significant savings from solar shift
    assert savings["pct_carbon_saved"] >= 20.0

    # Ensure no slot exceeds 4 units
    for s_info in res["timeline"]:
        assert s_info["units"] <= 4


# ---------------------------------------------------------
# 3. SAFETY VALIDATOR TESTS
# ---------------------------------------------------------
def test_safety_validator_rejects_overcapacity():
    obs = {
        "slot": 10,
        "capacity_units": 4,
        "jobs": [{"id": "j1", "release": 5, "deadline": 15, "remaining_units": 6}],
    }
    is_valid, err = validate_dispatch(obs, {"j1": 5})
    assert is_valid is False
    assert "exceeds" in err.lower()


def test_safety_validator_rejects_expired_jobs():
    obs = {
        "slot": 16,
        "capacity_units": 4,
        "jobs": [{"id": "j1", "release": 5, "deadline": 15, "remaining_units": 2}],
    }
    is_valid, err = validate_dispatch(obs, {"j1": 2})
    assert is_valid is False
    assert "outside window" in err.lower()


# ---------------------------------------------------------
# 4. API ENDPOINT INTEGRATION TESTS
# ---------------------------------------------------------
def test_api_scheduler_preview_endpoint():
    resp = client.post("/api/scheduler/preview", json={
        "current_slot": 10,
        "currency": "INR",
        "capacity_units": 4
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "schedule_id" in data
    assert data["summary"]["horns_condition_guarantee"] is True
    assert len(data["timeline"]) == 30  # slots 10 to 39


def test_api_scheduler_execute_and_status():
    # First preview
    prev_resp = client.post("/api/scheduler/preview", json={"current_slot": 12})
    schedule_id = prev_resp.json()["schedule_id"]

    # Execute
    exec_resp = client.post("/api/scheduler/execute", json={
        "schedule_id": schedule_id,
        "mode": "SIMULATION"
    })
    assert exec_resp.status_code == 200
    exec_data = exec_resp.json()
    assert exec_data["status"] == "approved_and_armed"
    assert exec_data["safety_checks_passed"] is True

    # Status
    status_resp = client.get("/api/scheduler/status")
    assert status_resp.status_code == 200
    s_data = status_resp.json()
    assert s_data["mode"] == "SIMULATION"
    assert s_data["has_active_schedule"] is True


def test_api_scheduler_history():
    # Ensure history returns array and cumulative counters
    hist_resp = client.get("/api/scheduler/history")
    assert hist_resp.status_code == 200
    data = hist_resp.json()
    assert "total_records" in data
    assert "cumulative_savings" in data
    assert isinstance(data["history"], list)


def test_api_manual_override_blocks_execution():
    # Set override
    ov_resp = client.post("/api/scheduler/override", json={
        "override": True,
        "reason": "Emergency maintenance at substation"
    })
    assert ov_resp.status_code == 200
    assert ov_resp.json()["manual_override"] is True

    # Status check confirms interlock
    status_resp = client.get("/api/scheduler/status")
    assert status_resp.json()["safety_interlock"] == "OVERRIDE_ACTIVE"

    # Execution must now be rejected
    exec_resp = client.post("/api/scheduler/execute", json={"mode": "SIMULATION"})
    assert exec_resp.status_code == 400
    assert "override" in exec_resp.json()["detail"].lower()

    # Clear override
    clear_resp = client.post("/api/scheduler/override", json={
        "override": False,
        "reason": "Maintenance complete"
    })
    assert clear_resp.status_code == 200
    assert clear_resp.json()["manual_override"] is False

