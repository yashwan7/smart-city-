import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings:
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    SQLITE_DB_PATH: str = os.getenv("SQLITE_DB_PATH", str(BASE_DIR / "data" / "carbonmesh.db"))
    FACTORS_YAML_PATH: str = os.getenv("FACTORS_YAML_PATH", str(BASE_DIR / "data" / "factors.yaml"))
    
    HUB_SECRET_KEY: str = os.getenv("HUB_SECRET_KEY", "dev_hub_master_signing_key_41cd")
    
    # Pre-shared HMAC keys for authenticated edge nodes
    NODE_KEYS: dict = {
        "node_a": os.getenv("NODE_A_SECRET_KEY", "node_a_nxp_secret_key_8841"),
        "node_b": os.getenv("NODE_B_SECRET_KEY", "node_b_esp32_secret_key_9923"),
    }
    
    # Grid Voltage & Power Factor assumptions for energy calculation when only current (RMS) is measured
    MAINS_VOLTAGE_V: float = 230.0
    POWER_FACTOR: float = 0.92

settings = Settings()
