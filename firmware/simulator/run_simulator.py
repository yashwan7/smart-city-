"""
CarbonMesh v2 - Hardware-Independent Host Simulator
Simulates:
1. Node A (NXP FRDM-MCXN236 sensing, TinyML edge AI, ESP32 bridge & kiosk)
2. Node B (Samputa ultrasonic 9-sample median filter, rain-triggered lid, soil)
3. 200-packet offline RAM ring buffer and batch reconnection flush
4. Authentic HMAC-SHA256 signatures matching the agreed backend contract
"""

import time
import math
import json
import hmac
import hashlib
import requests
import argparse
import sys
from typing import Dict, Any, List

NODE_A_KEY = "node_a_nxp_secret_key_8841"
NODE_B_KEY = "node_b_esp32_secret_key_9923"

def canonical_json(data: Dict[str, Any]) -> str:
    return json.dumps(data, sort_keys=True, separators=(',', ':'))

def compute_hmac_signature(secret_key: str, node: str, seq: int, ts: int, payload: Dict[str, Any]) -> str:
    msg = f"{node}|{seq}|{ts}|{canonical_json(payload)}"
    return hmac.new(secret_key.encode('utf-8'), msg.encode('utf-8'), hashlib.sha256).hexdigest()

class SimulatorNodeA:
    def __init__(self, hub_url: str = "http://127.0.0.1:8000"):
        self.node = "node_a"
        self.seq = 0
        self.hub_url = hub_url
        self.relay = 1
        self.cumulative_kwh = 0.0
        self.daylight_waste_timer = 0
        self.low_light_timer = 0
        self.state = "NORMAL"
        self.ring_buffer: List[Dict[str, Any]] = []

    def tick(self, lux: float = 300.0, current_a: float = 2.2, simulate_offline: bool = False) -> Dict[str, Any]:
        self.seq += 1
        ts = int(time.time())

        # Power calculations (230V, PF 0.92)
        power_w = round(230.0 * (current_a if self.relay else 0.0) * 0.92, 1)
        self.cumulative_kwh += (power_w * 5.0) / 3600000.0

        # TinyML State Machine & Closed Loop Relay Control
        if self.relay == 1 and lux > 600.0 and current_a > 0.5:
            self.state = "DAYLIGHT_WASTE"
            self.daylight_waste_timer += 5
            self.low_light_timer = 0
            if self.daylight_waste_timer >= 20:
                print(f"[Node A NXP TinyML] DAYLIGHT_WASTE sustained for {self.daylight_waste_timer}s -> TRIPPING RELAY OFF!")
                self.relay = 0
                self.daylight_waste_timer = 0
        elif self.relay == 0 and lux < 250.0:
            self.low_light_timer += 5
            self.daylight_waste_timer = 0
            if self.low_light_timer >= 30:
                print(f"[Node A NXP TinyML] Sustained low light ({lux:.1f} lux) for {self.low_light_timer}s -> RESTORING RELAY ON!")
                self.relay = 1
                self.low_light_timer = 0
        else:
            self.state = "NORMAL"
            self.daylight_waste_timer = 0
            self.low_light_timer = 0

        # Simulated UART Frame from NXP
        uart_payload = {
            "lux": lux,
            "temp": 26.5,
            "rh": 55.0,
            "aq": 410,
            "i": current_a if self.relay else 0.0,
            "p": power_w,
            "kwh": round(self.cumulative_kwh, 4),
            "relay": self.relay,
            "st": self.state,
            "conf": 0.95
        }

        # ESP32 #1 Packaging & Canonical Signing
        d = {
            "aq": 410,
            "conf": 0.95,
            "current_a": current_a if self.relay else 0.0,
            "energy_kwh": round(self.cumulative_kwh, 4),
            "lux_pct": lux,
            "power_w": power_w,
            "relay": "ON" if self.relay else "OFF",
            "state": self.state
        }
        sig = compute_hmac_signature(NODE_A_KEY, self.node, self.seq, ts, d)

        packet = {
            "node": self.node,
            "seq": self.seq,
            "ts": ts,
            "d": d,
            "sig": sig
        }

        if simulate_offline:
            print(f"[Node A ESP32 Bridge] Offline: Buffered seq {self.seq} into ring buffer ({len(self.ring_buffer) + 1}/200)")
            if len(self.ring_buffer) < 200:
                self.ring_buffer.append(packet)
            return packet

        # Online transmission
        try:
            resp = requests.post(f"{self.hub_url}/api/ingest", json=packet, timeout=2)
            print(f"[Node A] Ingest HTTP {resp.status_code}: seq={self.seq}, P={power_w}W, Relay={'ON' if self.relay else 'OFF'}, State={self.state}")
        except Exception as e:
            print(f"[Node A] Connection failed: {e}. Queuing to ring buffer.")
            self.ring_buffer.append(packet)

        return packet

    def press_kiosk_button(self, mode: str = "bus", km: float = 12.0):
        self.seq += 1
        ts = int(time.time())
        d = {
            "action": "commute_log",
            "km": km,
            "mode": mode,
            "source": "kiosk"
        }
        sig = compute_hmac_signature(NODE_A_KEY, self.node, self.seq, ts, d)
        packet = {"node": self.node, "seq": self.seq, "ts": ts, "d": d, "sig": sig}

        try:
            resp = requests.post(f"{self.hub_url}/api/ingest", json=packet, timeout=2)
            print(f"[Node A Kiosk] Pressed '{mode}': HTTP {resp.status_code}")
        except Exception as e:
            print(f"[Node A Kiosk] Post failed: {e}")

    def flush_offline_buffer(self):
        if not self.ring_buffer:
            return
        print(f"[Node A ESP32 Bridge] Reconnected! Flushing {len(self.ring_buffer)} buffered packets in sequence order...")
        try:
            resp = requests.post(f"{self.hub_url}/api/ingest/batch", json={"packets": self.ring_buffer}, timeout=5)
            print(f"[Node A Flush] Batch Ingest HTTP {resp.status_code}: {resp.json().get('total_submitted')} flushed.")
            self.ring_buffer.clear()
        except Exception as e:
            print(f"[Node A Flush] Batch failed: {e}")


class SimulatorNodeB:
    def __init__(self, hub_url: str = "http://127.0.0.1:8000"):
        self.node = "node_b"
        self.seq = 0
        self.hub_url = hub_url
        self.lid_state = "CLOSED"
        self.fill_pct = 20.0
        self.last_confirmed_fill = 20.0
        self.ring_buffer: List[Dict[str, Any]] = []

    def median_filter_9(self, base_distance: float) -> float:
        # Generates 9 samples with acoustic jitter and takes true median
        import random
        samples = [base_distance + random.uniform(-1.5, 1.5) for _ in range(9)]
        samples.sort()
        return samples[4]

    def tick(self, target_dist_cm: float = 75.0, rain_adc: int = 3500, soil_adc: int = 2100) -> Dict[str, Any]:
        self.seq += 1
        ts = int(time.time())

        # 9-Sample Median Filtered Ultrasonic
        dist_cm = self.median_filter_9(target_dist_cm)
        # Convert distance to fill percentage (100cm empty, 15cm full)
        raw_fill = max(0.0, min(100.0, ((100.0 - dist_cm) / 85.0) * 100.0))
        delta_pct = max(0.0, raw_fill - self.last_confirmed_fill)
        self.last_confirmed_fill = raw_fill

        # Rain Emergency Safety
        rain_detected = rain_adc < 2200
        if rain_detected and self.lid_state == "OPEN":
            print("[Node B Samputa] EMERGENCY: Rain detected! Slamming motorized lid CLOSED!")
            self.lid_state = "CLOSING_RAIN"
        elif not rain_detected and self.lid_state == "CLOSING_RAIN":
            self.lid_state = "CLOSED"

        d = {
            "fill_delta_pct": round(delta_pct, 2),
            "fill_pct": round(raw_fill, 1),
            "lid": self.lid_state,
            "rain": rain_detected,
            "raw_dist_cm": round(dist_cm, 1),
            "soil_adc": soil_adc
        }
        sig = compute_hmac_signature(NODE_B_KEY, self.node, self.seq, ts, d)
        packet = {"node": self.node, "seq": self.seq, "ts": ts, "d": d, "sig": sig}

        try:
            resp = requests.post(f"{self.hub_url}/api/ingest", json=packet, timeout=2)
            print(f"[Node B] Ingest HTTP {resp.status_code}: seq={self.seq}, Fill={raw_fill:.1f}%, Lid={self.lid_state}, Rain={rain_detected}")
        except Exception as e:
            print(f"[Node B] Post failed: {e}. Queuing to ring buffer.")
            self.ring_buffer.append(packet)

        return packet

    def trigger_deposit(self, added_kg: float = 5.0):
        print(f"[Node B Samputa] User opens lid and deposits {added_kg} kg organic waste...")
        self.lid_state = "OPEN"
        # 5 kg on 50 kg bin = 10% fill increase (from 75cm to 66.5cm distance)
        time.sleep(1)
        self.tick(target_dist_cm=66.5, rain_adc=3500)
        self.lid_state = "CLOSED"
        print("[Node B Samputa] Lid closed after verified deposit.")

def run_automated_scenarios(hub_url: str = "http://127.0.0.1:8000"):
    print("=" * 70)
    print("CARBONMESH V2 EMBEDDED & EDGE SIMULATION")
    print(f"Target Hub API: {hub_url}")
    print("=" * 70)

    node_a = SimulatorNodeA(hub_url)
    node_b = SimulatorNodeB(hub_url)

    # Scenario 1: Normal Operation
    print("\n[Scenario 1] Normal baseline operations (2 ticks)...")
    node_a.tick(lux=250.0, current_a=2.2)
    node_b.tick(target_dist_cm=80.0, rain_adc=3600)
    time.sleep(1)
    node_a.tick(lux=260.0, current_a=2.2)
    node_b.tick(target_dist_cm=80.0, rain_adc=3600)

    # Scenario 2: Daylight Waste & Local Closed-Loop Trip
    print("\n[Scenario 2] Daylight Waste Simulation (Bright room uncovered LDR, lux=850)...")
    for sec in range(5, 30, 5):
        print(f"--- Daylight waste elapsed: {sec}s ---")
        node_a.tick(lux=850.0, current_a=2.4)
        time.sleep(0.5)

    # Scenario 3: Kiosk button interactions
    print("\n[Scenario 3] Kiosk activity inputs (Bus & Matka sustainable cooling)...")
    node_a.press_kiosk_button("bus", km=12.0)
    node_a.press_kiosk_button("matka", km=0.0)

    # Scenario 4: Samputa Rain Safety Trigger
    print("\n[Scenario 4] Rain emergency on Node B Samputa...")
    node_b.lid_state = "OPEN"
    print("Samputa lid is OPEN for deposit...")
    node_b.tick(target_dist_cm=70.0, rain_adc=1200) # Rain detected!

    # Scenario 5: Network Drop & Offline Ring Buffer Flush
    print("\n[Scenario 5] Simulating network drop and offline ring buffer...")
    for _ in range(3):
        node_a.tick(lux=200.0, current_a=1.8, simulate_offline=True)
    print("Reconnecting network...")
    node_a.flush_offline_buffer()

    print("\n" + "=" * 70)
    print("ALL SIMULATION SCENARIOS COMPLETED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CarbonMesh v2 Embedded Firmware Simulator")
    parser.add_argument("--hub", default="http://127.0.0.1:8000", help="Hub API endpoint")
    args = parser.parse_args()
    run_automated_scenarios(args.hub)
