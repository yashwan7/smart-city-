"""
backend/app/config.py
=====================
Configuration management for CarbonMesh v2 Hub.
Reads from environment variables and provides sensible defaults for local edge operations.
"""

import os
from pathlib import Path
from typing import Dict

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
FACTORS_YAML_PATH = Path(os.getenv("FACTORS_PATH", str(BASE_DIR / "factors.yaml")))
SCHEMA_SQL_PATH = Path(__file__).resolve().parent / "schema.sql"
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", str(BASE_DIR / "carbonmesh.db")))

# Ingest Security & Clock Skew
# 300 seconds (5 minutes) allowed clock skew between node RTC and hub
ALLOWED_CLOCK_SKEW_SECONDS: float = float(os.getenv("ALLOWED_CLOCK_SKEW_SECONDS", "300.0"))

# Genesis Hash for append-only hash-chained reading ledger
# 64 hexadecimal zero characters representing block 0
GENESIS_HASH: str = "0000000000000000000000000000000000000000000000000000000000000000"

# Provisioned Demo Node Keys (Node ID -> Secret Key)
# In production, these are loaded from secure environment secrets or HSM/EdgeLock.
DEMO_NODE_KEYS: Dict[str, str] = {
    "node-01": os.getenv("NODE_KEY_01", "demo_secret_key_node_01_2026"),
    "esp32-grid-01": os.getenv("NODE_KEY_ESP32_01", "esp32_secret_kwh_monitor_2026"),
    "nxp-hub-01": os.getenv("NODE_KEY_NXP_01", "nxp_mcxn947_secret_key_2026"),
    "kiosk-phone-01": os.getenv("NODE_KEY_KIOSK_01", "kiosk_mobile_secret_key_2026"),
}

# Hub Control Signing Key (for signed relay override commands)
HUB_CONTROL_SECRET_KEY: str = os.getenv("HUB_CONTROL_KEY", "carbonmesh_hub_control_secret_2026")

# Server Configuration
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))

# Optional Local AI Advisor (Ollama)
OLLAMA_BASE_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL_NAME: str = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
