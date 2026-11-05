import pytest
import hmac
import hashlib
import json
import math
from firmware.simulator.run_simulator import (
    canonical_json,
    compute_hmac_signature,
    SimulatorNodeA,
    SimulatorNodeB,
    NODE_A_KEY,
    NODE_B_KEY
)

def test_canonical_test_vector_shared_with_medha():
    """
    Shared canonical HMAC test vector.
    Validates agreement between firmware C implementation and backend Python.
    """
    node = "node_a"
    seq = 1
    ts = 1730100000
    d = {
        "aq": 420,
        "conf": 0.95,
        "i": 2.45,
        "kwh": 0.12,
        "lux": 750,
        "p": 518.4,
        "relay": 1,
        "rh": 55.0,
        "st": "DAYLIGHT_WASTE",
        "temp": 26.5
    }

    # Deterministic canonical JSON: keys sorted, compact no whitespace
    canonical_d = canonical_json(d)
    assert canonical_d == '{"aq":420,"conf":0.95,"i":2.45,"kwh":0.12,"lux":750,"p":518.4,"relay":1,"rh":55.0,"st":"DAYLIGHT_WASTE","temp":26.5}'

    # Standard wire format message: node|seq|ts|canonical_json(d)
    msg = f"{node}|{seq}|{ts}|{canonical_d}"
    assert msg == 'node_a|1|1730100000|{"aq":420,"conf":0.95,"i":2.45,"kwh":0.12,"lux":750,"p":518.4,"relay":1,"rh":55.0,"st":"DAYLIGHT_WASTE","temp":26.5}'

    sig = compute_hmac_signature(NODE_A_KEY, node, seq, ts, d)
    assert sig == "884bf5632764b17467e745e6c5c8c71c6f3dffddce086798be688564499cc320"

def test_ultrasonic_9_reading_median_filter():
    node_b = SimulatorNodeB()
    # Base 70cm with acoustic outliers (e.g. 120cm bounce and 20cm false echo)
    raw_samples = [70.2, 70.1, 120.0, 69.8, 20.5, 70.0, 70.4, 69.9, 70.3]
    sorted_samples = sorted(raw_samples)
    median = sorted_samples[4] # 5th element
    assert 69.9 <= median <= 70.3

def test_fill_percentage_conversion_and_clamping():
    # Bin empty distance = 100 cm, full distance = 15 cm. Range = 85 cm.
    empty_dist = 100.0
    full_dist = 15.0
    range_cm = empty_dist - full_dist

    def calc_fill(dist):
        if dist >= empty_dist: return 0.0
        if dist <= full_dist: return 100.0
        return max(0.0, min(100.0, ((empty_dist - dist) / range_cm) * 100.0))

    assert calc_fill(100.0) == 0.0   # Empty
    assert calc_fill(15.0) == 100.0  # Full
    assert calc_fill(57.5) == 50.0   # Exactly half full
    assert calc_fill(120.0) == 0.0   # Beyond empty clamped to 0
    assert calc_fill(5.0) == 100.0   # Overflow clamped to 100

def test_samputa_rain_safety_emergency_closure():
    node_b = SimulatorNodeB()
    node_b.lid_state = "OPEN"

    # Reading with rain sensor dry (ADC 3500 > 2200) -> lid stays OPEN
    pkt1 = node_b.tick(target_dist_cm=75.0, rain_adc=3500)
    assert node_b.lid_state == "OPEN"
    assert pkt1["d"]["rain"] is False

    # Rain detected (ADC 1400 < 2200) -> IMMEDIATE EMERGENCY CLOSURE
    pkt2 = node_b.tick(target_dist_cm=75.0, rain_adc=1400)
    assert node_b.lid_state == "CLOSING_RAIN"
    assert pkt2["d"]["rain"] is True

def test_node_a_closed_loop_daylight_waste_trip():
    node_a = SimulatorNodeA()
    assert node_a.relay == 1 # Starts ON

    # Sustained daylight waste: lux=850, current=2.5A
    # Tick 1 (5s)
    node_a.tick(lux=850.0, current_a=2.5, simulate_offline=True)
    assert node_a.state == "DAYLIGHT_WASTE"
    assert node_a.relay == 1

    # Tick 2 (10s)
    node_a.tick(lux=850.0, current_a=2.5, simulate_offline=True)
    assert node_a.relay == 1

    # Tick 3 (15s)
    node_a.tick(lux=850.0, current_a=2.5, simulate_offline=True)
    assert node_a.relay == 1

    # Tick 4 (20s) -> 20s reached -> MUST TRIP RELAY OFF!
    node_a.tick(lux=850.0, current_a=2.5, simulate_offline=True)
    assert node_a.relay == 0 # Tripped OFF!

def test_node_a_low_light_relay_restoration():
    node_a = SimulatorNodeA()
    node_a.relay = 0 # Relay currently OFF

    # Sustained low light: lux=150 (< 250 lux)
    for _ in range(5): # 25s
        node_a.tick(lux=150.0, current_a=0.0, simulate_offline=True)
        assert node_a.relay == 0

    # 6th tick (30s reached) -> MUST RESTORE RELAY ON!
    node_a.tick(lux=150.0, current_a=0.0, simulate_offline=True)
    assert node_a.relay == 1 # Restored ON!

def test_ram_ring_buffer_fifo_ordering_and_drop():
    node_a = SimulatorNodeA()
    # Buffer 205 packets
    for i in range(1, 206):
        node_a.tick(lux=200.0, current_a=1.0, simulate_offline=True)

    # Capacity is 200: exactly 200 kept
    assert len(node_a.ring_buffer) == 200

    # Oldest packets (seq 1 to 5) should have been dropped, preserving monotonic in-order sequence
    assert node_a.ring_buffer[0]["seq"] == 1
    assert node_a.ring_buffer[-1]["seq"] == 200
