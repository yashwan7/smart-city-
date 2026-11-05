"""
backend/app/database.py
=======================
SQLite database management with WAL mode, foreign key enforcement,
safe schema initialization, and factors seed synchronization.
"""

from contextlib import contextmanager
from pathlib import Path
import sqlite3
import time
from typing import Generator, Optional
import yaml

from . import config


def get_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """
    Creates and configures a SQLite connection with WAL mode and foreign keys enabled.
    """
    target_path = Path(db_path) if db_path else config.DATABASE_PATH
    target_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(target_path), timeout=20.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row

    # Crucial PRAGMAs for performance and relational integrity
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn


@contextmanager
def get_db(db_path: Optional[Path] = None) -> Generator[sqlite3.Connection, None, None]:
    """Context manager for safe database transactions with auto-commit/rollback."""
    conn = get_connection(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(db_path: Optional[Path] = None) -> None:
    """
    Initializes tables from schema.sql and syncs factors and demo devices
    without deleting any existing data.
    """
    target_path = Path(db_path) if db_path else config.DATABASE_PATH

    with get_db(target_path) as conn:
        # 1. Execute schema.sql
        if config.SCHEMA_SQL_PATH.exists():
            schema_sql = config.SCHEMA_SQL_PATH.read_text(encoding="utf-8")
            conn.executescript(schema_sql)

        # 2. Seed factors from factors.yaml if table is empty or missing factors
        if config.FACTORS_YAML_PATH.exists():
            _seed_factors_from_yaml(conn, config.FACTORS_YAML_PATH)

        # 3. Seed provisioned demo devices if not already present
        _seed_demo_devices(conn)

        # 4. Seed default operational runs ('baseline' and 'optimized')
        _seed_default_runs(conn)


def _seed_factors_from_yaml(conn: sqlite3.Connection, yaml_path: Path) -> None:
    """Parses factors.yaml and upserts factors into database."""
    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    categories = ["electricity", "fuel", "transport", "sequestration", "traditional"]
    for cat in categories:
        items = data.get(cat, {})
        for _, entry in items.items():
            factor_name = entry.get("factor_name")
            if not factor_name:
                continue

            # Handle biochar which has gross/net
            val = float(entry.get("value", entry.get("gross_factor_value", 0.0)))
            unit = entry.get("unit", "")
            citation = entry.get("source_citation", "Documented factor")
            version = str(entry.get("version", "2026.1"))
            verified = bool(entry.get("verified_flag", False))
            quality = entry.get("quality_tag", "assumed")
            notes = entry.get("notes", entry.get("description", ""))

            conn.execute(
                """
                INSERT INTO factors (category, factor_name, value, unit, source_citation, version, verified_flag, quality_tag, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(factor_name) DO UPDATE SET
                    value = excluded.value,
                    unit = excluded.unit,
                    source_citation = excluded.source_citation,
                    version = excluded.version,
                    verified_flag = excluded.verified_flag,
                    quality_tag = excluded.quality_tag,
                    notes = excluded.notes;
                """,
                (cat, factor_name, val, unit, citation, version, verified, quality, notes),
            )


def _seed_demo_devices(conn: sqlite3.Connection) -> None:
    """Inserts demo device provisioning if not existing."""
    now = time.time()
    for node_id, secret_key in config.DEMO_NODE_KEYS.items():
        conn.execute(
            """
            INSERT INTO devices (node_id, key_id, secret_key, last_seen, firmware_version, last_accepted_seq, signature_failures, created_at)
            VALUES (?, ?, ?, ?, ?, 0, 0, ?)
            ON CONFLICT(node_id) DO NOTHING;
            """,
            (node_id, f"key-{node_id}", secret_key, now, "v2.0.0", now),
        )


def _seed_default_runs(conn: sqlite3.Connection) -> None:
    """Creates initial 'baseline' and 'optimized' runs if not already present."""
    now = time.time()
    conn.execute(
        """
        INSERT INTO runs (name, run_type, start_timestamp, description)
        VALUES ('baseline_2026', 'baseline', ?, 'Pre-optimization grid and transport carbon footprint baseline')
        ON CONFLICT(name) DO NOTHING;
        """,
        (now - 86400 * 7,),  # started 7 days ago
    )
    conn.execute(
        """
        INSERT INTO runs (name, run_type, start_timestamp, description)
        VALUES ('optimized_live', 'optimized', ?, 'Active optimized run with automated load shedding and Samputa sequestration')
        ON CONFLICT(name) DO NOTHING;
        """,
        (now,),
    )
