import time
from typing import Dict, Any, List
from hub.ledger.security import compute_hmac

class MockNodeB:
    """
    Test double for Node B (ESP32 Waste Ultrasonic & Garden Soil/Rain Node).
    """
    def __init__(self, secret_key: str = "node_b_esp32_secret_key_9923"):
        self.node = "node_b"
        self.secret_key = secret_key
        self.seq = 0
        self.current_fill_pct = 30.0

    def generate_packet(
        self,
        fill_delta_pct: float = 5.0,
        soil_moisture_pct: float = 45.0,
        rain_detected: bool = False,
        pump_relay: str = "OFF",
        corrupt_sig: bool = False
    ) -> Dict[str, Any]:
        self.seq += 1
        self.current_fill_pct = min(100.0, self.current_fill_pct + fill_delta_pct)
        ts = time.time()
        
        payload = {
            "fill_pct": self.current_fill_pct,
            "fill_delta_pct": fill_delta_pct,
            "soil_moisture_pct": soil_moisture_pct,
            "rain_detected": rain_detected,
            "pump_relay": pump_relay
        }
        
        sig = compute_hmac(self.secret_key, self.node, self.seq, ts, payload)
        if corrupt_sig:
            sig = "f" * 64
            
        return {
            "node": self.node,
            "seq": self.seq,
            "ts": ts,
            "payload": payload,
            "sig": sig
        }
