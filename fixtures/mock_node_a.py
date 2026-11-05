import time
from typing import Dict, Any, List
from hub.ledger.security import compute_hmac

class MockNodeA:
    """
    Test double for Node A (NXP FRDM-MCXN236 Sensing & TinyML + ESP32 WiFi Bridge).
    Generates realistic, signed sensor packets and simulates network buffering.
    """
    def __init__(self, secret_key: str = "node_a_nxp_secret_key_8841"):
        self.node = "node_a"
        self.secret_key = secret_key
        self.seq = 0
        self.relay_state = "ON"
        self.offline_queue: List[Dict[str, Any]] = []

    def generate_packet(
        self,
        current_a: float = 2.4,
        lux_pct: float = 75.0,
        temp_c: float = 26.5,
        humidity_pct: float = 58.0,
        mq135_raw: int = 420,
        state: str = "DAYLIGHT_WASTE",
        corrupt_sig: bool = False,
        custom_seq: int = None
    ) -> Dict[str, Any]:
        if custom_seq is not None:
            seq = custom_seq
        else:
            self.seq += 1
            seq = self.seq
            
        ts = time.time()
        payload = {
            "current_a": current_a,
            "lux_pct": lux_pct,
            "temp_c": temp_c,
            "humidity_pct": humidity_pct,
            "mq135_raw": mq135_raw,
            "relay": self.relay_state,
            "state": state,
            "interval_s": 5.0
        }
        
        sig = compute_hmac(self.secret_key, self.node, seq, ts, payload)
        if corrupt_sig:
            sig = "0" * 64 # intentionally bad signature
            
        return {
            "node": self.node,
            "seq": seq,
            "ts": ts,
            "payload": payload,
            "sig": sig
        }

    def buffer_packet_offline(self, **kwargs):
        """Simulates buffering readings while offline."""
        pkt = self.generate_packet(**kwargs)
        self.offline_queue.append(pkt)
        return pkt

    def flush_offline_buffer(self) -> List[Dict[str, Any]]:
        """Returns all queued packets in sequence order and clears buffer."""
        queued = list(self.offline_queue)
        self.offline_queue.clear()
        return queued
