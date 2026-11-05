import pytest
import time
from hub.engine.emission_engine import calculate_electricity_emissions

def test_runs_comparison(client, db_conn):
    # 1. Start Baseline Run
    start_b = client.post("/api/runs/start", json={"label": "baseline"})
    assert start_b.status_code == 201
    b_id = start_b.json()["run_id"]
    
    # Simulate high power consumption in baseline (Load ON, 10.0 A)
    calculate_electricity_emissions(db_conn, current_a=10.0, duration_s=1800.0, run_id=b_id)
    db_conn.commit()
    
    stop_b = client.post("/api/runs/stop")
    assert stop_b.status_code == 200
    
    # 2. Start Optimized Run
    start_o = client.post("/api/runs/start", json={"label": "optimized"})
    assert start_o.status_code == 201
    o_id = start_o.json()["run_id"]
    
    # Simulate low power consumption in optimized (Load tripped by relay, 1.0 A idle)
    calculate_electricity_emissions(db_conn, current_a=1.0, duration_s=1800.0, run_id=o_id)
    db_conn.commit()
    
    stop_o = client.post("/api/runs/stop")
    assert stop_o.status_code == 200
    
    # 3. Compare Runs
    compare = client.get("/api/runs/compare")
    assert compare.status_code == 200
    data = compare.json()
    
    assert data["baseline"]["kwh"] > data["optimized"]["kwh"]
    assert data["comparison"]["saved_kwh"] > 0.0
    assert data["comparison"]["saved_kg_co2e"] > 0.0
    assert data["comparison"]["reduction_percentage"] > 80.0 # ~90% reduction
