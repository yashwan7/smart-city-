-- ==============================================================================
-- CARBONMESH V2 SQLITE DATABASE SCHEMA
-- ==============================================================================
-- SQLite PRAGMA journal_mode = WAL and foreign_keys = ON are executed at connection.
-- ==============================================================================

-- 1. Devices (Nodes provisioned for HMAC-SHA256 authenticated telemetry)
CREATE TABLE IF NOT EXISTS devices (
    node_id TEXT PRIMARY KEY,
    key_id TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    last_seen REAL,
    firmware_version TEXT DEFAULT 'v2.0.0',
    last_accepted_seq INTEGER DEFAULT 0,
    signature_failures INTEGER DEFAULT 0,
    created_at REAL NOT NULL
);

-- 2. Append-Only Hash-Chained Ingest Ledger
CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node TEXT NOT NULL REFERENCES devices(node_id) ON DELETE RESTRICT,
    seq INTEGER NOT NULL,
    timestamp REAL NOT NULL,
    canonical_payload TEXT NOT NULL,
    signature TEXT NOT NULL,
    signature_status TEXT NOT NULL CHECK(signature_status IN ('VALID', 'INVALID', 'REJECTED')),
    prev_hash TEXT NOT NULL,
    record_hash TEXT NOT NULL UNIQUE,
    created_at REAL NOT NULL,
    UNIQUE(node, seq)
);

CREATE INDEX IF NOT EXISTS idx_readings_node_seq ON readings(node, seq);
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_readings_record_hash ON readings(record_hash);

-- 3. Emission & Sequestration Factors
CREATE TABLE IF NOT EXISTS factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    factor_name TEXT NOT NULL UNIQUE,
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    source_citation TEXT NOT NULL,
    version TEXT NOT NULL,
    verified_flag BOOLEAN NOT NULL DEFAULT 0,
    quality_tag TEXT NOT NULL DEFAULT 'assumed' CHECK(quality_tag IN ('measured', 'estimated', 'manual', 'assumed')),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_factors_name ON factors(factor_name);

-- 4. Operational Accounting Runs (Baseline vs Optimized)
CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    run_type TEXT NOT NULL CHECK(run_type IN ('baseline', 'optimized', 'live')),
    start_timestamp REAL NOT NULL,
    end_timestamp REAL,
    description TEXT
);

-- 5. Emissions Ledger (Carbon Deficit / "BAD")
CREATE TABLE IF NOT EXISTS emissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER REFERENCES runs(id) ON DELETE SET NULL,
    reading_id INTEGER REFERENCES readings(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK(category IN ('electricity', 'fuel', 'transport', 'waste')),
    activity_quantity REAL NOT NULL,
    activity_unit TEXT NOT NULL,
    factor_name TEXT NOT NULL REFERENCES factors(factor_name),
    factor_value REAL NOT NULL,
    kg_co2e REAL NOT NULL,
    quality_source TEXT NOT NULL CHECK(quality_source IN ('measured', 'estimated', 'manual', 'assumed')),
    timestamp REAL NOT NULL,
    metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_emissions_timestamp ON emissions(timestamp);
CREATE INDEX IF NOT EXISTS idx_emissions_category ON emissions(category);
CREATE INDEX IF NOT EXISTS idx_emissions_run ON emissions(run_id);

-- 6. Samputa Biochar / Compost Batches
CREATE TABLE IF NOT EXISTS samputa_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT UNIQUE NOT NULL,
    lifecycle_status TEXT NOT NULL CHECK(lifecycle_status IN ('OPEN', 'SEALED', 'VERIFIED', 'CREDITED', 'REJECTED')),
    capacity_litres REAL NOT NULL DEFAULT 20.0,
    fill_percentage REAL NOT NULL DEFAULT 0.0,
    assumed_density_kg_per_l REAL NOT NULL DEFAULT 0.40,
    projected_mass_kg REAL,
    weighed_mass_kg REAL,
    gross_factor REAL NOT NULL DEFAULT 0.50,
    haircut_pct REAL NOT NULL DEFAULT 0.30,
    projected_net_co2e REAL,
    verified_net_co2e REAL,
    depositor TEXT,
    notes TEXT,
    opened_at REAL NOT NULL,
    sealed_at REAL,
    verified_at REAL,
    credited_at REAL
);

CREATE INDEX IF NOT EXISTS idx_samputa_batch_id ON samputa_batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_samputa_status ON samputa_batches(lifecycle_status);

-- 7. Sequestration & Avoidance Ledger (Carbon Credit / "GOOD")
CREATE TABLE IF NOT EXISTS sequestration (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('samputa_biochar', 'matka', 'handloom', 'other')),
    batch_id INTEGER REFERENCES samputa_batches(id) ON DELETE SET NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    factor_name TEXT NOT NULL REFERENCES factors(factor_name),
    gross_emissions_benefit REAL NOT NULL,
    haircut_pct REAL NOT NULL DEFAULT 0.0,
    net_benefit_kg_co2e REAL NOT NULL,
    quality_source TEXT NOT NULL CHECK(quality_source IN ('measured', 'estimated', 'manual', 'assumed')),
    is_projected BOOLEAN NOT NULL DEFAULT 1,
    timestamp REAL NOT NULL,
    depositor TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_sequestration_timestamp ON sequestration(timestamp);
CREATE INDEX IF NOT EXISTS idx_sequestration_type ON sequestration(type);

-- 8. Hardware Control & Tamper Events
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    node_id TEXT,
    action TEXT NOT NULL,
    reason TEXT NOT NULL,
    before_power_w REAL,
    after_power_w REAL,
    timestamp REAL NOT NULL,
    signature TEXT,
    operator TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);

-- 9. Recommendations & Savings Audit
CREATE TABLE IF NOT EXISTS recs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recommendation TEXT NOT NULL,
    estimated_savings_kg_co2e REAL NOT NULL,
    calculation_basis TEXT NOT NULL,
    advisor_text TEXT NOT NULL,
    validation_status TEXT NOT NULL CHECK(validation_status IN ('VALIDATED', 'FALLBACK')),
    created_at REAL NOT NULL
);
