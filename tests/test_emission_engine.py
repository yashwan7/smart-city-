import pytest
from hub.engine.emission_engine import (
    calculate_electricity_emissions,
    calculate_commute_emissions,
    calculate_fuel_emissions,
    calculate_waste_emissions,
    get_summary_metrics,
    get_category_breakdown
)

def test_electricity_emissions(db_conn):
    # 2.0 A at 230 V, PF 0.92 = 423.2 W. Over 1 hour (3600s) = 0.4232 kWh.
    # Grid factor 0.716 kg/kWh -> ~0.303 kg CO2e
    res = calculate_electricity_emissions(
        conn=db_conn,
        current_a=2.0,
        duration_s=3600.0,
        voltage_v=230.0,
        pf=0.92
    )
    assert res["power_w"] == 423.2
    assert abs(res["energy_kwh"] - 0.4232) < 0.001
    assert abs(res["kg_co2e"] - (0.4232 * 0.716)) < 0.001
    assert res["source"] == "measured"

def test_commute_emissions_and_avoidance(db_conn):
    # Solo car: 10 km * 0.180 = 1.80 kg CO2e, avoided = 0.0
    car_res = calculate_commute_emissions(db_conn, "car_solo", km=10.0)
    assert car_res["kg_co2e"] == 1.8
    assert car_res["avoided_kg_co2e"] == 0.0
    
    # Bus: 10 km * 0.045 = 0.45 kg CO2e, avoided = 1.80 - 0.45 = 1.35 kg CO2e
    bus_res = calculate_commute_emissions(db_conn, "bus", km=10.0)
    assert bus_res["kg_co2e"] == 0.45
    assert bus_res["avoided_kg_co2e"] == 1.35
    
    # Bicycle: 10 km * 0.000 = 0.0 kg CO2e, avoided = 1.80 kg CO2e
    bike_res = calculate_commute_emissions(db_conn, "bicycle", km=10.0)
    assert bike_res["kg_co2e"] == 0.0
    assert bike_res["avoided_kg_co2e"] == 1.8

def test_fuel_emissions(db_conn):
    # Diesel: 10 L * 2.68 = 26.8 kg CO2e
    diesel_res = calculate_fuel_emissions(db_conn, "diesel", 10.0)
    assert diesel_res["kg_co2e"] == 26.8
    
    # Petrol: 5 L * 2.31 = 11.55 kg CO2e
    petrol_res = calculate_fuel_emissions(db_conn, "petrol", 5.0)
    assert petrol_res["kg_co2e"] == 11.55

def test_waste_emissions(db_conn):
    # 20% fill delta on 50 kg bin = 10 kg waste * 0.450 kg/kg = 4.5 kg CO2e
    waste_res = calculate_waste_emissions(db_conn, fill_delta_pct=20.0, bin_capacity_kg=50.0)
    assert waste_res["waste_kg"] == 10.0
    assert waste_res["kg_co2e"] == 4.5
    assert waste_res["source"] == "estimated"

def test_breakdown_and_summary(db_conn):
    summary = get_summary_metrics(db_conn)
    assert "total_kg_co2e" in summary
    assert "quality_split_kg" in summary
    assert summary["quality_split_kg"]["measured"] >= 0.0
    assert summary["quality_split_kg"]["manual"] >= 0.0
    
    breakdown = get_category_breakdown(db_conn)
    assert len(breakdown["categories"]) == 4
    categories = [c["category"] for c in breakdown["categories"]]
    assert "electricity" in categories
    assert "transport" in categories
    assert "fuel" in categories
    assert "waste" in categories
