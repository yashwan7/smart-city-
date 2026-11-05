import json
import sqlite3
import time
from typing import List, Dict, Any
from hub.advisor.validator import validate_numbers_in_text

def get_daylight_waste_rule(conn: sqlite3.Connection) -> Dict[str, Any]:
    """Rule 1: Daylight waste detection and quantified savings."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT payload_json FROM readings 
        WHERE node = 'node_a' 
        ORDER BY id DESC LIMIT 50;
    """)
    rows = cursor.fetchall()
    
    total_watts = 0.0
    daylight_count = 0
    for r in rows:
        try:
            p = json.loads(r["payload_json"])
            lux = float(p.get("lux_pct", 0.0))
            relay = str(p.get("relay", "OFF")).upper()
            curr = float(p.get("current_a", 0.0))
            watts = 230.0 * curr * 0.92
            if relay == "ON" and lux > 60.0:
                daylight_count += 1
                total_watts += watts
        except Exception:
            continue

    if daylight_count > 0:
        avg_w = total_watts / daylight_count
    else:
        # Fallback realistic baseline if node just started: 450W office lighting
        avg_w = 450.0

    hours_per_day = 6.0  # 6 hours of unnecessary daylight illumination
    kwh_day = round((avg_w * hours_per_day) / 1000.0, 2)
    kg_day = round(kwh_day * 0.716, 2)

    basis = {
        "rule": "daylight_waste",
        "avg_power_w": round(avg_w, 1),
        "daylight_hours_assumed": hours_per_day,
        "grid_factor": 0.716,
        "detected_waste_events": daylight_count
    }

    template_text = f"Automating lighting shutoff during peak ambient daylight saves {kwh_day:.2f} kWh/day and avoids {kg_day:.2f} kg CO2e/day."
    allowed_numbers = [round(kwh_day, 2), round(kg_day, 2), round(hours_per_day, 2)]

    is_valid, reason = validate_numbers_in_text(template_text, allowed_numbers)

    return {
        "action": "Automated Daylight Lighting Cutoff",
        "category": "electricity",
        "saving_kwh_day": kwh_day,
        "saving_kg_day": kg_day,
        "basis": basis,
        "llm_text": template_text,
        "validated": is_valid
    }

def get_commute_swap_rule(conn: sqlite3.Connection) -> Dict[str, Any]:
    """Rule 2: High-emission commute mode swap recommendation."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COUNT(*) as car_trips 
        FROM emissions 
        WHERE factor_id = 'trans_car_solo';
    """)
    row = cursor.fetchone()
    car_trips = row["car_trips"] if row else 0
    trip_count = max(10, car_trips) # assume 10 daily solo car trips for campus estimate
    avg_km = 12.0

    # Car (0.180 kg/km) vs Bus (0.045 kg/km)
    solo_kg = trip_count * avg_km * 0.180
    bus_kg = trip_count * avg_km * 0.045
    saved_kg = round(solo_kg - bus_kg, 2)
    saved_kwh = 0.0

    basis = {
        "rule": "commute_mode_swap",
        "daily_car_trips": trip_count,
        "avg_km_per_trip": avg_km,
        "target_mode": "bus_transit",
        "car_factor": 0.180,
        "bus_factor": 0.045
    }

    template_text = f"Transitioning campus solo car commutes to shared transit saves {saved_kg:.2f} kg CO2e/day across {trip_count} daily trips."
    allowed_numbers = [round(saved_kg, 2), float(trip_count)]

    is_valid, reason = validate_numbers_in_text(template_text, allowed_numbers)

    return {
        "action": "Campus Commuter Transit Incentive",
        "category": "transport",
        "saving_kwh_day": saved_kwh,
        "saving_kg_day": saved_kg,
        "basis": basis,
        "llm_text": template_text,
        "validated": is_valid
    }

def get_waste_diversion_rule(conn: sqlite3.Connection) -> Dict[str, Any]:
    """Rule 3: Organic waste diversion from landfill."""
    assumed_daily_waste_kg = 80.0
    # Landfill (0.450 kg/kg) vs Composting (0.080 kg/kg)
    saved_kg = round(assumed_daily_waste_kg * (0.450 - 0.080), 2)
    
    basis = {
        "rule": "waste_diversion_compost",
        "daily_waste_kg": assumed_daily_waste_kg,
        "landfill_factor": 0.450,
        "compost_factor": 0.080
    }
    
    template_text = f"Diverting {assumed_daily_waste_kg:.1f} kg of organic cafeteria waste to campus composting reduces landfill emissions by {saved_kg:.2f} kg CO2e/day."
    allowed_numbers = [round(saved_kg, 2), round(assumed_daily_waste_kg, 1)]
    is_valid, reason = validate_numbers_in_text(template_text, allowed_numbers)

    return {
        "action": "Cafeteria Organic Waste Composting",
        "category": "waste",
        "saving_kwh_day": 0.0,
        "saving_kg_day": saved_kg,
        "basis": basis,
        "llm_text": template_text,
        "validated": is_valid
    }

def generate_recommendations(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    """Runs all deterministic rules, validates numbers, saves to DB, and returns ranked actions."""
    rules = [
        get_daylight_waste_rule(conn),
        get_commute_swap_rule(conn),
        get_waste_diversion_rule(conn)
    ]
    # Sort descending by emission savings
    rules.sort(key=lambda x: x["saving_kg_day"], reverse=True)
    
    now = time.time()
    cursor = conn.cursor()
    for item in rules:
        cursor.execute("""
            INSERT INTO recs (ts, action, saving_kwh_day, saving_kg_day, basis_json, llm_text, validated)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            now,
            item["action"],
            item["saving_kwh_day"],
            item["saving_kg_day"],
            json.dumps(item["basis"]),
            item["llm_text"],
            1 if item["validated"] else 0
        ))
    conn.commit()
    return rules
