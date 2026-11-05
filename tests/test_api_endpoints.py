import pytest

def test_health_endpoints(client):
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert res_root.json()["status"] == "healthy"
    
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

def test_api_summary_and_breakdown(client):
    res_summary = client.get("/api/summary")
    assert res_summary.status_code == 200
    summary_data = res_summary.json()
    assert "total_kg_co2e" in summary_data
    assert "current_kw" in summary_data
    assert "quality_split_pct" in summary_data

    res_breakdown = client.get("/api/breakdown")
    assert res_breakdown.status_code == 200
    breakdown_data = res_breakdown.json()
    assert "categories" in breakdown_data
    assert len(breakdown_data["categories"]) == 4

def test_api_timeseries(client):
    res_ts = client.get("/api/timeseries?limit=50")
    assert res_ts.status_code == 200
    ts_data = res_ts.json()
    assert "series" in ts_data

def test_api_device_monitoring_and_time(client):
    res_dev = client.get("/api/devices")
    assert res_dev.status_code == 200
    assert "devices" in res_dev.json()

    res_time = client.get("/api/time")
    assert res_time.status_code == 200
    assert "server_time" in res_time.json()

def test_api_recommendations(client):
    res_recs = client.get("/api/recommendations")
    assert res_recs.status_code == 200
    recs_data = res_recs.json()
    assert recs_data["count"] >= 3
    for r in recs_data["recommendations"]:
        assert r["validated"] is True
        assert "saving_kg_day" in r

def test_api_ledger_records(client):
    res_rec = client.get("/api/ledger/records?limit=10")
    assert res_rec.status_code == 200
    assert "records" in res_rec.json()

def test_invalid_commute_mode_rejected(client):
    # Invalid mode should be rejected with 422 Unprocessable Entity by Pydantic
    bad_commute = {"mode": "supersonic_jet", "km": 100.0, "source": "kiosk"}
    res = client.post("/api/commute", json=bad_commute)
    assert res.status_code == 422

def test_invalid_fuel_litres_rejected(client):
    # Non-positive fuel volume must be rejected with 422
    bad_fuel = {"fuel": "diesel", "litres": -5.0}
    res = client.post("/api/fuel", json=bad_fuel)
    assert res.status_code == 422
