"""
backend/app/samputa.py
======================
Samputa Carbon Bank: Biochar / Compost Batch Lifecycle & Traditional Practices Engine.

Enforces strict lifecycle states:
    OPEN -> SEALED -> VERIFIED -> CREDITED (or REJECTED)

Prevents duplicate crediting, ultrasonic distance false-mass representation,
and repeated same-day traditional claims.
"""

from pathlib import Path
import sqlite3
import time
from typing import Any, Dict, List, Optional, Tuple

from . import config
from .database import get_db


class SamputaEngine:
    """Manages Samputa biochar sequestration batches and traditional practice offsets."""

    def __init__(self, db_path: Optional[Path] = None):
        self._db_path = db_path

    @property
    def db_path(self) -> Path:
        return self._db_path if self._db_path is not None else config.DATABASE_PATH

    def create_batch(
        self,
        batch_id: str,
        capacity_litres: float = 20.0,
        assumed_density_kg_per_l: float = 0.40,
        depositor: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates a new OPEN Samputa batch."""
        clean_id = batch_id.strip().upper()
        now = time.time()

        with get_db(self.db_path) as conn:
            # Check duplicate batch ID
            existing = conn.execute("SELECT id, lifecycle_status FROM samputa_batches WHERE batch_id = ?;", (clean_id,)).fetchone()
            if existing:
                raise ValueError(f"Batch '{clean_id}' already exists with status '{existing['lifecycle_status']}'.")

            cur = conn.execute(
                """
                INSERT INTO samputa_batches (batch_id, lifecycle_status, capacity_litres, fill_percentage, assumed_density_kg_per_l, depositor, notes, opened_at)
                VALUES (?, 'OPEN', ?, 0.0, ?, ?, ?, ?);
                """,
                (clean_id, capacity_litres, assumed_density_kg_per_l, depositor, notes, now),
            )
            return {
                "id": cur.lastrowid,
                "batch_id": clean_id,
                "lifecycle_status": "OPEN",
                "capacity_litres": capacity_litres,
                "opened_at": now,
            }

    def seal_batch(
        self,
        batch_id: str,
        fill_percentage: float,
        capacity_litres: float = 20.0,
        assumed_density_kg_per_l: float = 0.40,
        depositor: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Transitions batch from OPEN -> SEALED.
        Calculates PROJECTED net CO2e benefit with disclosed 30% haircut:
            Volume = Capacity * Fill%
            Mass_projected = Volume * Assumed_density
            Gross = Mass_projected * 0.5 kg CO2e/kg
            Net_projected = Gross * (1 - 0.30)
        Explicitly flagged as projected/assumed.
        """
        clean_id = batch_id.strip().upper()
        now = time.time()

        if not (0.0 <= fill_percentage <= 100.0):
            raise ValueError("fill_percentage must be between 0.0 and 100.0%")

        # Ensure batch exists in DB or auto-open
        with get_db(self.db_path) as conn:
            batch = conn.execute("SELECT * FROM samputa_batches WHERE batch_id = ?;", (clean_id,)).fetchone()
            if not batch:
                conn.execute(
                    """
                    INSERT INTO samputa_batches (batch_id, lifecycle_status, capacity_litres, assumed_density_kg_per_l, depositor, notes, opened_at)
                    VALUES (?, 'OPEN', ?, ?, ?, ?, ?);
                    """,
                    (clean_id, capacity_litres, assumed_density_kg_per_l, depositor, notes, now),
                )
                batch = conn.execute("SELECT * FROM samputa_batches WHERE batch_id = ?;", (clean_id,)).fetchone()

            if batch["lifecycle_status"] != "OPEN":
                raise ValueError(
                    f"Cannot seal batch '{clean_id}': current status is '{batch['lifecycle_status']}'. "
                    f"Batches can only be sealed from 'OPEN' status."
                )

            cap_l = float(batch["capacity_litres"])
            density = float(batch["assumed_density_kg_per_l"])
            gross_factor = float(batch["gross_factor"])
            haircut = float(batch["haircut_pct"])

            # Projections
            fill_fraction = fill_percentage / 100.0
            volume_l = cap_l * fill_fraction
            projected_mass = round(volume_l * density, 4)
            gross_benefit = round(projected_mass * gross_factor, 4)
            net_projected_co2e = round(gross_benefit * (1.0 - haircut), 4)

            # Update batch table
            conn.execute(
                """
                UPDATE samputa_batches
                SET lifecycle_status = 'SEALED',
                    fill_percentage = ?,
                    projected_mass_kg = ?,
                    projected_net_co2e = ?,
                    sealed_at = ?,
                    notes = COALESCE(?, notes)
                WHERE batch_id = ?;
                """,
                (fill_percentage, projected_mass, net_projected_co2e, now, notes, clean_id),
            )

            # Record in sequestration table as projected credit
            cur = conn.execute(
                """
                INSERT INTO sequestration (type, batch_id, quantity, unit, factor_name, gross_emissions_benefit, haircut_pct, net_benefit_kg_co2e, quality_source, is_projected, timestamp, depositor, notes)
                VALUES ('samputa_biochar', ?, ?, 'kg_biochar', 'samputa_biochar_sequestration', ?, ?, ?, 'assumed', 1, ?, ?, ?);
                """,
                (
                    batch["id"],
                    projected_mass,
                    gross_benefit,
                    haircut,
                    net_projected_co2e,
                    now,
                    depositor or batch["depositor"],
                    f"Projected {fill_percentage}% fill biochar batch. Unverified until certified scale weighing.",
                ),
            )

            return {
                "batch_id": clean_id,
                "lifecycle_status": "SEALED",
                "fill_percentage": fill_percentage,
                "projected_mass_kg": projected_mass,
                "gross_factor": gross_factor,
                "haircut_applied_pct": round(haircut * 100.0, 1),
                "net_projected_co2e": net_projected_co2e,
                "is_projected": True,
                "quality_source": "assumed",
                "notes": "Estimated from ultrasonic/visual fill level. Must be weighed for verified credit.",
                "sealed_at": now,
            }

    def verify_and_credit_batch(
        self,
        batch_id: str,
        weighed_mass_kg: float,
        verifier: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Transitions batch from SEALED -> VERIFIED -> CREDITED using certified scale mass.
        Calculates VERIFIED net benefit:
            Gross = weighed_mass_kg * 0.5
            Net_verified = Gross * (1 - 0.30)
        Prevents double-crediting!
        """
        clean_id = batch_id.strip().upper()
        now = time.time()

        if weighed_mass_kg <= 0.0:
            raise ValueError("weighed_mass_kg must be greater than zero.")

        with get_db(self.db_path) as conn:
            batch = conn.execute("SELECT * FROM samputa_batches WHERE batch_id = ?;", (clean_id,)).fetchone()
            if not batch:
                raise ValueError(f"Samputa batch '{clean_id}' does not exist.")

            status = batch["lifecycle_status"]
            if status == "CREDITED":
                raise ValueError(f"Batch '{clean_id}' has ALREADY been credited on {batch['credited_at']}. Anti-double-crediting triggered!")
            if status == "REJECTED":
                raise ValueError(f"Cannot credit rejected batch '{clean_id}'.")
            if status != "SEALED":
                raise ValueError(f"Cannot verify batch '{clean_id}': status must be 'SEALED' (currently '{status}').")

            gross_factor = float(batch["gross_factor"])
            haircut = float(batch["haircut_pct"])

            gross_benefit = round(weighed_mass_kg * gross_factor, 4)
            verified_net_co2e = round(gross_benefit * (1.0 - haircut), 4)

            # Update batch record
            conn.execute(
                """
                UPDATE samputa_batches
                SET lifecycle_status = 'CREDITED',
                    weighed_mass_kg = ?,
                    verified_net_co2e = ?,
                    verified_at = ?,
                    credited_at = ?,
                    notes = COALESCE(?, notes)
                WHERE batch_id = ?;
                """,
                (weighed_mass_kg, verified_net_co2e, now, now, notes, clean_id),
            )

            # Remove previous projected sequestration entry for this batch if present
            conn.execute(
                "DELETE FROM sequestration WHERE batch_id = ? AND is_projected = 1;",
                (batch["id"],),
            )

            # Insert certified verified sequestration entry
            conn.execute(
                """
                INSERT INTO sequestration (type, batch_id, quantity, unit, factor_name, gross_emissions_benefit, haircut_pct, net_benefit_kg_co2e, quality_source, is_projected, timestamp, depositor, notes)
                VALUES ('samputa_biochar', ?, ?, 'kg_biochar', 'samputa_biochar_sequestration', ?, ?, ?, 'measured', 0, ?, ?, ?);
                """,
                (
                    batch["id"],
                    weighed_mass_kg,
                    gross_benefit,
                    haircut,
                    verified_net_co2e,
                    now,
                    verifier or "Certified Scale",
                    f"Physically weighed {weighed_mass_kg} kg biochar. Verified and credited.",
                ),
            )

            return {
                "batch_id": clean_id,
                "lifecycle_status": "CREDITED",
                "weighed_mass_kg": weighed_mass_kg,
                "verified_net_co2e": verified_net_co2e,
                "haircut_applied_pct": round(haircut * 100.0, 1),
                "is_projected": False,
                "quality_source": "measured",
                "credited_at": now,
                "message": "Batch verified and awarded net sequestration credit.",
            }

    # ==========================================================================
    # Traditional Practices Offset (Matka & Handloom)
    # ==========================================================================

    def record_traditional_credit(
        self,
        practice: str,
        quantity: float,
        depositor: str,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Credits traditional climate practices:
          - matka: Evaporative cooling avoiding refrigeration
          - handloom: Hand weaving avoiding industrial motorized power
        Anti-spam: Rejects repeated claims from the same depositor within 24 hours.
        """
        clean_practice = practice.strip().lower()
        clean_depositor = depositor.strip()
        now = time.time()

        if quantity <= 0.0:
            raise ValueError("Quantity must be greater than zero.")

        factor_map = {
            "matka": ("traditional_matka", "days"),
            "handloom": ("traditional_handloom", "meters"),
        }
        if clean_practice not in factor_map:
            raise ValueError(f"Unknown traditional practice '{practice}'. Supported: 'matka', 'handloom'")

        factor_name, unit_label = factor_map[clean_practice]

        with get_db(self.db_path) as conn:
            # 1. Anti-repeat check within 24 hours (86400 seconds)
            one_day_ago = now - 86400.0
            recent = conn.execute(
                """
                SELECT id, timestamp FROM sequestration
                WHERE type = ? AND depositor = ? AND timestamp > ?;
                """,
                (clean_practice, clean_depositor, one_day_ago),
            ).fetchone()

            if recent:
                raise ValueError(
                    f"Depositor '{clean_depositor}' already claimed '{clean_practice}' within the last 24 hours. "
                    f"Repeated same-day traditional claims are rejected to prevent unsupported credit inflation."
                )

            # Retrieve factor
            row = conn.execute("SELECT value, quality_tag, notes FROM factors WHERE factor_name = ?;", (factor_name,)).fetchone()
            if not row:
                raise ValueError(f"Factor '{factor_name}' missing from factors table.")

            factor_val = float(row["value"])
            quality = row["quality_tag"]
            net_benefit = round(quantity * factor_val, 4)

            cur = conn.execute(
                """
                INSERT INTO sequestration (type, quantity, unit, factor_name, gross_emissions_benefit, haircut_pct, net_benefit_kg_co2e, quality_source, is_projected, timestamp, depositor, notes)
                VALUES (?, ?, ?, ?, ?, 0.0, ?, ?, 1, ?, ?, ?);
                """,
                (
                    clean_practice,
                    quantity,
                    unit_label,
                    factor_name,
                    net_benefit,
                    net_benefit,
                    quality,
                    now,
                    clean_depositor,
                    notes or f"Traditional offset: {clean_practice} ({quantity} {unit_label})",
                ),
            )

            return {
                "id": cur.lastrowid,
                "status": "CREDITED",
                "practice": clean_practice,
                "quantity": quantity,
                "unit": unit_label,
                "factor_applied": factor_val,
                "net_benefit_kg_co2e": net_benefit,
                "quality_source": quality,
                "is_projected": True,
                "depositor": clean_depositor,
                "timestamp": now,
            }

    def get_total_sequestration(self) -> Dict[str, float]:
        """Calculates GOOD = sum(sequestration.net_benefit_kg_co2e) partitioned by status."""
        with get_db(self.db_path) as conn:
            row_total = conn.execute("SELECT COALESCE(SUM(net_benefit_kg_co2e), 0.0) as total FROM sequestration;").fetchone()
            row_verified = conn.execute("SELECT COALESCE(SUM(net_benefit_kg_co2e), 0.0) as total FROM sequestration WHERE is_projected = 0;").fetchone()
            row_projected = conn.execute("SELECT COALESCE(SUM(net_benefit_kg_co2e), 0.0) as total FROM sequestration WHERE is_projected = 1;").fetchone()

            return {
                "total_good_kg_co2e": round(float(row_total["total"]), 4),
                "verified_good_kg_co2e": round(float(row_verified["total"]), 4),
                "projected_good_kg_co2e": round(float(row_projected["total"]), 4),
            }

    def list_batches(self) -> List[Dict[str, Any]]:
        """Returns all Samputa batches."""
        with get_db(self.db_path) as conn:
            rows = conn.execute("SELECT * FROM samputa_batches ORDER BY id DESC;").fetchall()
            return [dict(r) for r in rows]
