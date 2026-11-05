import sqlite3
import os
from pathlib import Path
from typing import Optional
from hub.config import settings

def get_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    target_path = db_path or settings.SQLITE_DB_PATH
    Path(target_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(target_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # Configure WAL mode for high concurrency and resilience against power loss
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db(db_path: Optional[str] = None):
    conn = get_connection(db_path)
    with conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            node TEXT NOT NULL,
            seq INTEGER NOT NULL,
            ts REAL NOT NULL,
            payload_json TEXT NOT NULL,
            sig TEXT NOT NULL DEFAULT '',
            sig_ok INTEGER NOT NULL,
            prev_hash TEXT NOT NULL,
            record_hash TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS emissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts REAL NOT NULL,
            category TEXT NOT NULL,
            activity_value REAL NOT NULL,
            activity_unit TEXT NOT NULL,
            factor_id TEXT NOT NULL,
            kg_co2e REAL NOT NULL,
            source TEXT NOT NULL CHECK(source IN ('measured', 'estimated', 'manual')),
            run_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS factors (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            value REAL NOT NULL,
            unit TEXT NOT NULL,
            source_citation TEXT NOT NULL,
            version TEXT NOT NULL,
            verified INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL CHECK(label IN ('baseline', 'optimized')),
            start_ts REAL NOT NULL,
            end_ts REAL
        );

        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts REAL NOT NULL,
            node TEXT NOT NULL,
            action TEXT NOT NULL,
            reason TEXT NOT NULL,
            p_before_w REAL,
            p_after_w REAL
        );

        CREATE TABLE IF NOT EXISTS recs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts REAL NOT NULL,
            action TEXT NOT NULL,
            saving_kwh_day REAL NOT NULL,
            saving_kg_day REAL NOT NULL,
            basis_json TEXT NOT NULL,
            llm_text TEXT NOT NULL,
            validated INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS devices (
            node TEXT PRIMARY KEY,
            key_id TEXT,
            last_seen REAL,
            last_seq INTEGER DEFAULT 0,
            sig_failures INTEGER DEFAULT 0,
            fw_version TEXT
        );

        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_ts REAL NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('PREVIEW', 'APPROVED', 'EXECUTED', 'CANCELLED', 'OVERRIDDEN')),
            current_slot INTEGER NOT NULL,
            mode TEXT NOT NULL DEFAULT 'SIMULATION',
            jobs_json TEXT NOT NULL,
            schedule_json TEXT NOT NULL,
            summary_json TEXT NOT NULL,
            approved_ts REAL,
            executed_ts REAL
        );

        CREATE INDEX IF NOT EXISTS idx_readings_node_seq ON readings(node, seq);
        CREATE INDEX IF NOT EXISTS idx_emissions_cat_ts ON emissions(category, ts);
        """)
    return conn
