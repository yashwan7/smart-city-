import yaml
import sqlite3
import time
from pathlib import Path
from typing import Dict, Any, Optional, List
from hub.config import settings

def load_factors_from_yaml(conn: sqlite3.Connection, yaml_path: Optional[str] = None) -> None:
    path = yaml_path or settings.FACTORS_YAML_PATH
    if not Path(path).exists():
        return
    
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
        
    cursor = conn.cursor()
    version = data.get("version", "1.0.0")
    
    # Electricity factors
    for key, item in data.get("electricity", {}).items():
        cursor.execute("""
            INSERT OR REPLACE INTO factors (id, category, name, value, unit, source_citation, version, verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (item["id"], "electricity", item["name"], float(item["value"]), item["unit"], item["source"], version, 1 if item.get("verified") else 0))
        
    # Fuel factors
    for key, item in data.get("fuels", {}).items():
        cursor.execute("""
            INSERT OR REPLACE INTO factors (id, category, name, value, unit, source_citation, version, verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (item["id"], "fuel", item["name"], float(item["value"]), item["unit"], item["source"], version, 1 if item.get("verified") else 0))
        
    # Transport factors
    for key, item in data.get("transport", {}).items():
        cursor.execute("""
            INSERT OR REPLACE INTO factors (id, category, name, value, unit, source_citation, version, verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (item["id"], "transport", item["name"], float(item["value"]), item["unit"], item["source"], version, 1 if item.get("verified") else 0))

    # Waste factors
    for key, item in data.get("waste", {}).items():
        cursor.execute("""
            INSERT OR REPLACE INTO factors (id, category, name, value, unit, source_citation, version, verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (item["id"], "waste", item["name"], float(item["value"]), item["unit"], item["source"], version, 1 if item.get("verified") else 0))
    conn.commit()

def get_factor(conn: sqlite3.Connection, factor_id: str) -> Optional[sqlite3.Row]:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM factors WHERE id = ?;", (factor_id,))
    return cursor.fetchone()

def calculate_electricity_emissions(
    conn: sqlite3.Connection,
    current_a: float,
    duration_s: float,
    voltage_v: float = 230.0,
    pf: float = 0.92,
    run_id: Optional[int] = None
) -> Dict[str, Any]:
    """Calculates real-time electricity consumption (kWh) and associated emissions."""
    power_w = voltage_v * current_a * pf
    power_kw = power_w / 1000.0
    energy_kwh = power_kw * (duration_s / 3600.0)
    
    factor_row = get_factor(conn, "elec_in_grid_2024")
    factor_val = factor_row["value"] if factor_row else 0.716
    factor_id = factor_row["id"] if factor_row else "elec_in_grid_2024"
    
    kg_co2e = energy_kwh * factor_val
    now = time.time()
    
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO emissions (ts, category, activity_value, activity_unit, factor_id, kg_co2e, source, run_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (now, "electricity", energy_kwh, "kWh", factor_id, kg_co2e, "measured", run_id))
    emission_id = cursor.lastrowid
    
    return {
        "emission_id": emission_id,
        "power_w": round(power_w, 2),
        "power_kw": round(power_kw, 4),
        "energy_kwh": round(energy_kwh, 6),
        "kg_co2e": round(kg_co2e, 6),
        "factor_value": factor_val,
        "source": "measured"
    }

def calculate_commute_emissions(
    conn: sqlite3.Connection,
    mode: str,
    km: Optional[float] = None,
    source: str = "kiosk"
) -> Dict[str, Any]:
    """Computes transport footprint and avoided carbon compared to solo driving."""
    # Standard urban commute trip default is 10.0 km
    trip_km = km if (km is not None and km > 0) else 10.0
    
    mode_map = {
        "car_solo": "trans_car_solo",
        "two_wheeler": "trans_two_wheeler",
        "bus": "trans_bus_transit",
        "metro": "trans_metro_rail",
        "bicycle": "trans_bicycle",
        "walking": "trans_walking",
    }
    factor_id = mode_map.get(mode, "trans_bus_transit")
    factor_row = get_factor(conn, factor_id)
    factor_val = factor_row["value"] if factor_row else 0.045
    
    car_factor_row = get_factor(conn, "trans_car_solo")
    car_factor_val = car_factor_row["value"] if car_factor_row else 0.180
    
    kg_co2e = trip_km * factor_val
    avoided_kg = max(0.0, (trip_km * car_factor_val) - kg_co2e) if mode != "car_solo" else 0.0
    
    now = time.time()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO emissions (ts, category, activity_value, activity_unit, factor_id, kg_co2e, source)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    """, (now, "transport", trip_km, "passenger-km", factor_id, kg_co2e, "manual"))
    emission_id = cursor.lastrowid
    
    return {
        "emission_id": emission_id,
        "mode": mode,
        "km": trip_km,
        "kg_co2e": round(kg_co2e, 4),
        "avoided_kg_co2e": round(avoided_kg, 4),
        "factor_citation": factor_row["source_citation"] if factor_row else "MoRTH India & DEFRA"
    }

def calculate_fuel_emissions(
    conn: sqlite3.Connection,
    fuel: str,
    litres: float,
    source: str = "manual"
) -> Dict[str, Any]:
    """Calculates emissions from generator or vehicular fuel consumption."""
    fuel_map = {
        "diesel": "fuel_diesel_stationary",
        "petrol": "fuel_petrol_motor"
    }
    factor_id = fuel_map.get(fuel, "fuel_diesel_stationary")
    factor_row = get_factor(conn, factor_id)
    factor_val = factor_row["value"] if factor_row else 2.68
    
    kg_co2e = litres * factor_val
    now = time.time()
    
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO emissions (ts, category, activity_value, activity_unit, factor_id, kg_co2e, source)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    """, (now, "fuel", litres, "litres", factor_id, kg_co2e, source))
    emission_id = cursor.lastrowid
    
    return {
        "emission_id": emission_id,
        "fuel": fuel,
        "litres": litres,
        "kg_co2e": round(kg_co2e, 4),
        "factor_value": factor_val,
        "source": source
    }

def calculate_waste_emissions(
    conn: sqlite3.Connection,
    fill_delta_pct: float,
    bin_capacity_kg: float = 50.0,
    source: str = "estimated"
) -> Dict[str, Any]:
    """Estimates emissions from ultrasonic bin fill increments and municipal landfill factors."""
    waste_kg = (max(0.0, fill_delta_pct) / 100.0) * bin_capacity_kg
    factor_row = get_factor(conn, "waste_mixed_landfill")
    factor_val = factor_row["value"] if factor_row else 0.450
    
    kg_co2e = waste_kg * factor_val
    now = time.time()
    
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO emissions (ts, category, activity_value, activity_unit, factor_id, kg_co2e, source)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    """, (now, "waste", waste_kg, "kg", "waste_mixed_landfill", kg_co2e, source))
    emission_id = cursor.lastrowid
    
    return {
        "emission_id": emission_id,
        "waste_kg": round(waste_kg, 2),
        "kg_co2e": round(kg_co2e, 4),
        "source": source
    }

def get_summary_metrics(conn: sqlite3.Connection) -> Dict[str, Any]:
    """Generates real-time top-level dashboard metrics, quality badges, and ledger state."""
    cursor = conn.cursor()
    
    # Total emissions
    cursor.execute("SELECT COALESCE(SUM(kg_co2e), 0.0) as total_kg FROM emissions;")
    total_kg = float(cursor.fetchone()["total_kg"])
    
    # Electricity kWh today
    cursor.execute("SELECT COALESCE(SUM(activity_value), 0.0) as total_kwh FROM emissions WHERE category = 'electricity';")
    total_kwh = float(cursor.fetchone()["total_kwh"])
    
    # Latest reading power (Node A)
    cursor.execute("SELECT payload_json FROM readings WHERE node = 'node_a' ORDER BY id DESC LIMIT 1;")
    latest_a = cursor.fetchone()
    current_kw = 0.0
    node_a_state = "OFFLINE"
    if latest_a:
        import json
        p = json.loads(latest_a["payload_json"])
        current_a = float(p.get("current_a", 0.0))
        current_kw = (230.0 * current_a * 0.92) / 1000.0
        node_a_state = p.get("state", "ONLINE")
        
    # Data Quality breakdown: measured vs estimated vs manual
    cursor.execute("""
        SELECT source, COUNT(*) as cnt, COALESCE(SUM(kg_co2e), 0.0) as kg
        FROM emissions
        GROUP BY source;
    """)
    quality_rows = cursor.fetchall()
    quality_map = {"measured": 0.0, "estimated": 0.0, "manual": 0.0}
    for r in quality_rows:
        src = r["source"]
        if src in quality_map:
            quality_map[src] = round(float(r["kg"]), 3)
            
    # Calculate percentages
    total_q = sum(quality_map.values())
    quality_pct = {}
    for k, v in quality_map.items():
        quality_pct[k] = round((v / total_q) * 100.0, 1) if total_q > 0 else 0.0
        
    return {
        "total_kg_co2e": round(total_kg, 3),
        "total_kwh": round(total_kwh, 3),
        "current_kw": round(current_kw, 3),
        "node_a_state": node_a_state,
        "quality_split_kg": quality_map,
        "quality_split_pct": quality_pct,
        "timestamp": time.time()
    }

def get_category_breakdown(conn: sqlite3.Connection) -> Dict[str, Any]:
    """Returns emissions aggregated across all four categories with formulas and cited sources."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.category, COALESCE(SUM(e.kg_co2e), 0.0) as total_kg,
               f.source_citation, f.value as factor_val, f.unit as factor_unit
        FROM emissions e
        LEFT JOIN factors f ON e.factor_id = f.id
        GROUP BY e.category;
    """)
    rows = cursor.fetchall()
    
    categories = {"electricity": 0.0, "transport": 0.0, "fuel": 0.0, "waste": 0.0}
    citations = {}
    for r in rows:
        cat = r["category"]
        if cat in categories:
            categories[cat] = round(float(r["total_kg"]), 3)
            citations[cat] = {
                "citation": r["source_citation"] or "Standard Emission Benchmark",
                "factor_value": r["factor_val"],
                "unit": r["factor_unit"]
            }
            
    total = sum(categories.values())
    breakdown = []
    formulas = {
        "electricity": "kWh (measured from ACS712 current) * 0.716 kg CO2e/kWh (CEA Grid Database)",
        "transport": "Commute passenger-km * mode emission factor (MoRTH / DEFRA)",
        "fuel": "Litres consumed * fuel emission factor (IPCC / DEFRA)",
        "waste": "Bin fill volume delta (%) * capacity (kg) * 0.450 kg CO2e/kg (CPCB Landfill Factor)"
    }
    
    for cat, val in categories.items():
        pct = round((val / total) * 100.0, 1) if total > 0 else 0.0
        breakdown.append({
            "category": cat,
            "kg_co2e": val,
            "percentage": pct,
            "formula": formulas.get(cat, ""),
            "factor_info": citations.get(cat, {})
        })
        
    return {
        "total_kg_co2e": round(total, 3),
        "categories": breakdown
    }
