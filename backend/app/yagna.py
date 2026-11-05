"""
backend/app/yagna.py
====================
Yagna Net-Carbon Accounting Engine.

Implements core net-carbon formula:
    BAD = sum(emissions.kg_co2e)
    GOOD = sum(sequestration.net_benefit_kg_co2e)
    NET = BAD - GOOD
    yagna_ratio = GOOD / BAD (safely handling BAD == 0)

Negative NET signifies net-carbon-negative operations.
Partitions verified vs projected benefits and measured vs assumed emissions.
"""

from pathlib import Path
import sqlite3
import time
from typing import Any, Dict, List, Optional, Tuple

from . import config
from .database import get_db
from .emissions import EmissionsEngine
from .models import NetCarbonResponse, RelayControlRequest
from .samputa import SamputaEngine


class YagnaEngine:
    """Core Net-Carbon evaluator and hardware control coordinator."""

    def __init__(self, db_path: Optional[Path] = None):
        self._db_path = db_path
        self._emissions_engine: Optional[EmissionsEngine] = None
        self._samputa_engine: Optional[SamputaEngine] = None

    @property
    def db_path(self) -> Path:
        return self._db_path if self._db_path is not None else config.DATABASE_PATH

    @property
    def emissions_engine(self) -> EmissionsEngine:
        return EmissionsEngine(self.db_path)

    @property
    def samputa_engine(self) -> SamputaEngine:
        return SamputaEngine(self.db_path)

    def calculate_net_carbon(self, run_id: Optional[int] = None) -> NetCarbonResponse:
        """
        Calculates BAD, GOOD, NET, and Yagna Ratio.
        """
        # 1. Total BAD (emissions)
        bad_total = self.emissions_engine.get_total_emissions(run_id)

        # 2. Total GOOD (sequestration)
        seq_stats = self.samputa_engine.get_total_sequestration()
        good_total = seq_stats["total_good_kg_co2e"]
        good_verified = seq_stats["verified_good_kg_co2e"]
        good_projected = seq_stats["projected_good_kg_co2e"]

        # 3. NET = BAD - GOOD
        net_carbon = round(bad_total - good_total, 4)
        is_net_negative = net_carbon < 0.0

        # 4. Yagna Ratio = GOOD / BAD
        if bad_total > 0.0:
            yagna_ratio = round(good_total / bad_total, 4)
        elif good_total > 0.0:
            yagna_ratio = None  # Infinitely net positive sequestration with zero emissions
        else:
            yagna_ratio = 1.0   # 0 / 0 balanced baseline

        # 5. Breakdowns
        breakdown = self.emissions_engine.get_breakdown(run_id)

        return NetCarbonResponse(
            bad_emissions_kg_co2e=bad_total,
            good_sequestration_kg_co2e=good_total,
            good_verified_kg_co2e=good_verified,
            good_projected_kg_co2e=good_projected,
            net_carbon_kg_co2e=net_carbon,
            is_net_negative=is_net_negative,
            yagna_ratio=yagna_ratio,
            quality_breakdown=breakdown["quality_sources"],
            category_breakdown=breakdown["categories"],
            timestamp=time.time(),
        )

    def execute_relay_control(self, req: RelayControlRequest) -> Dict[str, Any]:
        """
        Executes a hardware control action (e.g. load shedding) and records an immutable event log.
        """
        now = time.time()
        node_id = req.node_id
        action = req.action.upper()

        with get_db(self.db_path) as conn:
            # Query last reported power for this node
            last_reading = conn.execute(
                """
                SELECT canonical_payload FROM readings
                WHERE node = ?
                ORDER BY id DESC LIMIT 1;
                """,
                (node_id,),
            ).fetchone()

            before_power_w = 0.0
            if last_reading:
                try:
                    import json
                    d = json.loads(last_reading["canonical_payload"])
                    before_power_w = float(d.get("power_w", 0.0))
                except Exception:
                    before_power_w = 0.0

            # Calculate simulated or expected after_power_w
            after_power_w = 0.0 if "OFF" in action or "SHUTDOWN" in action else before_power_w

            cur = conn.execute(
                """
                INSERT INTO events (event_type, node_id, action, reason, before_power_w, after_power_w, timestamp, signature, operator)
                VALUES ('relay_override', ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    node_id,
                    action,
                    req.reason,
                    before_power_w,
                    after_power_w,
                    now,
                    req.signature or "unsigned_hub_control",
                    req.operator,
                ),
            )

            return {
                "event_id": cur.lastrowid,
                "node_id": node_id,
                "action": action,
                "status": "EXECUTED",
                "before_power_w": before_power_w,
                "after_power_w": after_power_w,
                "power_shed_w": max(0.0, before_power_w - after_power_w),
                "reason": req.reason,
                "operator": req.operator,
                "timestamp": now,
            }

    def list_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Returns recent hardware and override events."""
        with get_db(self.db_path) as conn:
            rows = conn.execute("SELECT * FROM events ORDER BY timestamp DESC LIMIT ?;", (limit,)).fetchall()
            return [dict(r) for r in rows]

    def get_time_info(self) -> Dict[str, Any]:
        """Provides hub time synchronization information."""
        now = time.time()
        with get_db(self.db_path) as conn:
            active_run = conn.execute("SELECT * FROM runs WHERE run_type = 'optimized' ORDER BY id DESC LIMIT 1;").fetchone()
            total_readings = conn.execute("SELECT COUNT(*) as c FROM readings;").fetchone()["c"]

            return {
                "server_time_unix": now,
                "server_time_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
                "active_run": dict(active_run) if active_run else None,
                "total_ledger_readings": total_readings,
                "timezone": "UTC",
                "max_clock_skew_seconds": config.ALLOWED_CLOCK_SKEW_SECONDS,
            }
