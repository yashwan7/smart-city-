"""
backend/app/emissions.py
========================
Emission accounting engine for CarbonMesh v2.
Calculates and records emissions for electricity, fuel, transport, and waste.
Enforces the rule: BAD = sum(emissions.kg_co2e).
Carefully differentiates power (Watts) from energy (kWh).
"""

from pathlib import Path
import sqlite3
import time
from typing import Any, Dict, List, Optional, Tuple

from . import config
from .database import get_db


class EmissionsEngine:
    def __init__(self, db_path: Optional[Path] = None):
        self._db_path = db_path
        # In-memory energy integrator state per node: node -> (last_timestamp, last_power_w)
        self._power_integrator_state: Dict[str, Tuple[float, float]] = {}

    @property
    def db_path(self) -> Path:
        return self._db_path if self._db_path is not None else config.DATABASE_PATH

    def get_factor(self, factor_name: str, conn: Optional[sqlite3.Connection] = None) -> Tuple[float, str, str]:
        """
        Retrieves factor value, unit, and quality tag from factors table.
        Returns: (value, unit, quality_tag)
        """
        should_close = False
        if conn is None:
            conn = sqlite3.connect(str(self.db_path))
            conn.row_factory = sqlite3.Row
            should_close = True

        try:
            row = conn.execute(
                "SELECT value, unit, quality_tag FROM factors WHERE factor_name = ?;",
                (factor_name,),
            ).fetchone()
            if not row:
                raise ValueError(f"Emission factor '{factor_name}' not found in factors database.")
            return float(row["value"]), row["unit"], row["quality_tag"]
        finally:
            if should_close:
                conn.close()

    def get_active_run_id(self, conn: sqlite3.Connection, run_name: str = "optimized_live") -> Optional[int]:
        """Gets run ID by name."""
        row = conn.execute("SELECT id FROM runs WHERE name = ?;", (run_name,)).fetchone()
        return row["id"] if row else None

    # ==========================================================================
    # 1. Telemetry / Electricity Integration
    # ==========================================================================

    def process_telemetry_reading(
        self,
        node: str,
        reading_id: int,
        timestamp: float,
        data: Dict[str, Any],
    ) -> Optional[float]:
        """
        Processes electricity telemetry from a reading packet.
        Handles both integrated energy_kwh meters and instantaneous power_w integration.
        Returns: kg_co2e emitted for this interval, or None if no power/energy reported.
        """
        energy_kwh: Optional[float] = None

        # Case A: Cumulative or interval energy reported directly
        if "energy_kwh" in data:
            energy_kwh = float(data["energy_kwh"])

        # Case B: Instantaneous power_w reported -> integrate over time delta
        elif "power_w" in data:
            power_w = float(data["power_w"])

            if "dt_s" in data:
                # Node explicitly provided delta seconds
                dt_s = float(data["dt_s"])
            elif node in self._power_integrator_state:
                last_t, last_p = self._power_integrator_state[node]
                dt_s = max(0.0, min(3600.0, timestamp - last_t))
                # Trapezoidal integration average power
                power_w = (power_w + last_p) / 2.0
            else:
                # Default minimal sample window (e.g. 1 second if continuous)
                dt_s = 1.0

            self._power_integrator_state[node] = (timestamp, float(data["power_w"]))

            # Convert: Watt * seconds / (1000 W/kW * 3600 s/h) = kWh
            energy_kwh = (power_w * dt_s) / 3_600_000.0

        if energy_kwh is None or energy_kwh <= 0.0:
            return None

        with get_db(self.db_path) as conn:
            factor_val, factor_unit, quality = self.get_factor("grid_electricity_karnataka", conn)
            kg_co2e = energy_kwh * factor_val
            run_id = self.get_active_run_id(conn, "optimized_live")

            conn.execute(
                """
                INSERT INTO emissions (run_id, reading_id, category, activity_quantity, activity_unit, factor_name, factor_value, kg_co2e, quality_source, timestamp, metadata)
                VALUES (?, ?, 'electricity', ?, 'kwh', 'grid_electricity_karnataka', ?, ?, ?, ?, ?);
                """,
                (
                    run_id,
                    reading_id,
                    energy_kwh,
                    factor_val,
                    kg_co2e,
                    "measured",
                    timestamp,
                    f"Node {node} power telemetry",
                ),
            )

            return round(kg_co2e, 6)

    # ==========================================================================
    # 2. Commute & Transport Emissions
    # ==========================================================================

    def record_commute(
        self,
        mode: str,
        distance_km: float,
        occupancy: int = 1,
        notes: Optional[str] = None,
        run_name: str = "optimized_live",
    ) -> Dict[str, Any]:
        """
        Calculates and records transport emissions.
        """
        factor_map = {
            "walk": "commute_walk",
            "bicycle": "commute_bicycle",
            "two_wheeler": "commute_two_wheeler",
            "car": "commute_car",
            "bus": "commute_bus",
            "metro": "commute_metro",
        }
        factor_name = factor_map.get(mode.lower())
        if not factor_name:
            raise ValueError(f"Unsupported commute mode '{mode}'. Choose from: {list(factor_map.keys())}")

        with get_db(self.db_path) as conn:
            factor_val, unit, quality = self.get_factor(factor_name, conn)

            # Calculation: if car and carpooled, allocate per passenger
            effective_factor = factor_val
            if mode.lower() == "car" and occupancy > 1:
                effective_factor = factor_val / occupancy

            kg_co2e = round(distance_km * effective_factor, 4)
            now = time.time()
            run_id = self.get_active_run_id(conn, run_name)

            cur = conn.execute(
                """
                INSERT INTO emissions (run_id, category, activity_quantity, activity_unit, factor_name, factor_value, kg_co2e, quality_source, timestamp, metadata)
                VALUES (?, 'transport', ?, 'km', ?, ?, ?, ?, ?, ?);
                """,
                (
                    run_id,
                    distance_km,
                    factor_name,
                    effective_factor,
                    kg_co2e,
                    quality,
                    now,
                    notes or f"Commute mode: {mode}, occupancy: {occupancy}",
                ),
            )

            return {
                "id": cur.lastrowid,
                "mode": mode,
                "distance_km": distance_km,
                "occupancy": occupancy,
                "factor_applied": effective_factor,
                "kg_co2e": kg_co2e,
                "quality_source": quality,
                "timestamp": now,
            }

    # ==========================================================================
    # 3. Fuel Emissions
    # ==========================================================================

    def record_fuel(
        self,
        fuel_type: str,
        litres: float,
        equipment: Optional[str] = None,
        notes: Optional[str] = None,
        run_name: str = "optimized_live",
    ) -> Dict[str, Any]:
        """Calculates and records combustion fuel emissions."""
        factor_map = {
            "diesel": "fuel_diesel",
            "petrol": "fuel_petrol",
            "cng": "fuel_cng",
            "lpg": "fuel_lpg",
        }
        factor_name = factor_map.get(fuel_type.lower())
        if not factor_name:
            raise ValueError(f"Unsupported fuel type '{fuel_type}'. Choose from: {list(factor_map.keys())}")

        with get_db(self.db_path) as conn:
            factor_val, unit, quality = self.get_factor(factor_name, conn)
            kg_co2e = round(litres * factor_val, 4)
            now = time.time()
            run_id = self.get_active_run_id(conn, run_name)

            cur = conn.execute(
                """
                INSERT INTO emissions (run_id, category, activity_quantity, activity_unit, factor_name, factor_value, kg_co2e, quality_source, timestamp, metadata)
                VALUES (?, 'fuel', ?, 'litres', ?, ?, ?, ?, ?, ?);
                """,
                (
                    run_id,
                    litres,
                    factor_name,
                    factor_val,
                    kg_co2e,
                    quality,
                    now,
                    notes or f"Fuel: {fuel_type}, equipment: {equipment or 'standard'}",
                ),
            )

            return {
                "id": cur.lastrowid,
                "fuel_type": fuel_type,
                "litres": litres,
                "factor_applied": factor_val,
                "kg_co2e": kg_co2e,
                "quality_source": quality,
                "timestamp": now,
            }

    # ==========================================================================
    # 4. Aggregations & Breakdowns
    # ==========================================================================

    def get_total_emissions(self, run_id: Optional[int] = None) -> float:
        """Calculates BAD = sum(emissions.kg_co2e)."""
        with get_db(self.db_path) as conn:
            if run_id is not None:
                row = conn.execute("SELECT COALESCE(SUM(kg_co2e), 0.0) as total FROM emissions WHERE run_id = ?;", (run_id,)).fetchone()
            else:
                row = conn.execute("SELECT COALESCE(SUM(kg_co2e), 0.0) as total FROM emissions;").fetchone()
            return round(float(row["total"]), 4)

    def get_breakdown(self, run_id: Optional[int] = None) -> Dict[str, Any]:
        """Returns emissions partitioned by category and quality source."""
        with get_db(self.db_path) as conn:
            query_cat = "SELECT category, COALESCE(SUM(kg_co2e), 0.0) as total FROM emissions"
            query_qual = "SELECT quality_source, COALESCE(SUM(kg_co2e), 0.0) as total FROM emissions"
            params: Tuple[Any, ...] = ()
            if run_id is not None:
                query_cat += " WHERE run_id = ?"
                query_qual += " WHERE run_id = ?"
                params = (run_id,)
            query_cat += " GROUP BY category;"
            query_qual += " GROUP BY quality_source;"

            cats = {r["category"]: round(float(r["total"]), 4) for r in conn.execute(query_cat, params).fetchall()}
            quals = {r["quality_source"]: round(float(r["total"]), 4) for r in conn.execute(query_qual, params).fetchall()}

            return {
                "categories": cats,
                "quality_sources": quals,
                "total_kg_co2e": self.get_total_emissions(run_id),
            }

    def get_timeseries(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Returns recent emissions time series."""
        with get_db(self.db_path) as conn:
            rows = conn.execute(
                """
                SELECT id, category, activity_quantity, activity_unit, kg_co2e, quality_source, timestamp
                FROM emissions
                ORDER BY timestamp DESC
                LIMIT ?;
                """,
                (limit,),
            ).fetchall()
            return [dict(r) for r in rows]

    def compare_runs(self, run_a_name: str = "baseline_2026", run_b_name: str = "optimized_live") -> Dict[str, Any]:
        """Compares baseline vs optimized runs."""
        with get_db(self.db_path) as conn:
            id_a = self.get_active_run_id(conn, run_a_name)
            id_b = self.get_active_run_id(conn, run_b_name)

            bad_a = self.get_total_emissions(id_a) if id_a else 0.0
            bad_b = self.get_total_emissions(id_b) if id_b else 0.0
            savings_kg = round(bad_a - bad_b, 4)
            pct_savings = round((savings_kg / bad_a) * 100.0, 2) if bad_a > 0 else 0.0

            return {
                "run_a": {"name": run_a_name, "total_kg_co2e": bad_a},
                "run_b": {"name": run_b_name, "total_kg_co2e": bad_b},
                "absolute_savings_kg_co2e": savings_kg,
                "reduction_percentage": pct_savings,
            }
