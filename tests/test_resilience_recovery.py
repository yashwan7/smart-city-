import pytest
from fixtures.mock_node_a import MockNodeA
from fixtures.mock_node_b import MockNodeB

def test_authenticated_ingest_success(client):
    node_a = MockNodeA()
    packet = node_a.generate_packet(current_a=3.2, lux_pct=80.0)
    
    resp = client.post("/api/ingest", json=packet)
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "ok"
    assert data["sig_ok"] is True
    assert "record_hash" in data
    assert data["emissions"] is not None

def test_replay_attack_rejection(client):
    node_a = MockNodeA()
    # First valid packet with seq 10
    pkt1 = node_a.generate_packet(custom_seq=10)
    resp1 = client.post("/api/ingest", json=pkt1)
    assert resp1.status_code == 201
    
    # Replay packet with same seq 10 MUST be rejected with HTTP 409 Conflict
    replay_pkt = node_a.generate_packet(custom_seq=10)
    resp2 = client.post("/api/ingest", json=replay_pkt)
    assert resp2.status_code == 409
    assert "replay detected" in resp2.json()["detail"].lower()
    
    # Packet with older seq 5 MUST also be rejected
    old_pkt = node_a.generate_packet(custom_seq=5)
    resp3 = client.post("/api/ingest", json=old_pkt)
    assert resp3.status_code == 409

def test_invalid_signature_rejection(client):
    node_a = MockNodeA()
    # Generate packet with corrupted signature
    corrupt_pkt = node_a.generate_packet(corrupt_sig=True, custom_seq=50)
    resp = client.post("/api/ingest", json=corrupt_pkt)
    assert resp.status_code == 401
    assert "signature rejected" in resp.json()["detail"].lower()

def test_unregistered_node_rejection(client):
    bad_pkt = {
        "node": "rogue_unknown_device",
        "seq": 1,
        "ts": 1730000000.0,
        "payload": {"data": 123},
        "sig": "abcdef" * 10
    }
    resp = client.post("/api/ingest", json=bad_pkt)
    assert resp.status_code == 400
    assert "not authorized" in resp.json()["detail"].lower()

def test_offline_buffer_flush_batch_recovery(client):
    node_a = MockNodeA()
    # Simulate network outage: node buffers 3 packets locally
    node_a.seq = 100
    node_a.buffer_packet_offline(current_a=2.0)
    node_a.buffer_packet_offline(current_a=2.1)
    node_a.buffer_packet_offline(current_a=2.2)
    
    flushed_packets = node_a.flush_offline_buffer()
    assert len(flushed_packets) == 3
    
    # Reconnection: flush batch to hub
    batch_resp = client.post("/api/ingest/batch", json={"packets": flushed_packets})
    assert batch_resp.status_code == 200
    res_data = batch_resp.json()
    assert res_data["total_submitted"] == 3
    for p in res_data["processed"]:
        assert p["status"] == "accepted"

def test_tamper_demo_and_detection_endpoint(client):
    # 1. Ingest clean packet
    node_b = MockNodeB()
    pkt = node_b.generate_packet(fill_delta_pct=15.0)
    ingest_res = client.post("/api/ingest", json=pkt)
    assert ingest_res.status_code == 201
    rec_id = ingest_res.json()["record_id"]
    
    # 2. Verify ledger is valid before tampering
    verify_before = client.get("/api/ledger/verify")
    assert verify_before.status_code == 200
    assert verify_before.json()["valid"] is True
    
    # 3. Simulate tamper via tamper demo endpoint
    tamper_res = client.post("/api/ledger/tamper_demo", json={
        "record_id": rec_id,
        "tampered_payload": {"fill_delta_pct": 0.0, "fraudulent": True}
    })
    assert tamper_res.status_code == 200
    
    # 4. Verify ledger now catches the fraud and pinpoints record_id
    verify_after = client.get("/api/ledger/verify")
    assert verify_after.status_code == 200
    data_after = verify_after.json()
    assert data_after["valid"] is False
    assert data_after["tampered_record_id"] == rec_id

def test_relay_control_event_logging(client):
    resp = client.post("/api/control/relay", json={
        "node": "node_a",
        "state": "OFF",
        "reason": "Excessive daylight waste detected by edge rule"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "command_queued"
    assert "logged_event_id" in data
