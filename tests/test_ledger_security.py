import pytest
import json
from hub.ledger.security import canonical_json, compute_hmac, verify_hmac
from hub.ledger.chain import append_to_ledger, verify_ledger, compute_record_hash, GENESIS_HASH

def test_canonical_json_determinism():
    dict1 = {"b": 2, "a": 1, "c": {"y": 20, "x": 10}}
    dict2 = {"a": 1, "c": {"x": 10, "y": 20}, "b": 2}
    assert canonical_json(dict1) == canonical_json(dict2)
    assert canonical_json(dict1) == '{"a":1,"b":2,"c":{"x":10,"y":20}}'

def test_hmac_verification():
    key = "secret_key_123"
    node = "node_a"
    seq = 1
    ts = 1730000000.123
    payload = {"current_a": 4.5, "relay": "ON"}
    
    sig = compute_hmac(key, node, seq, ts, payload)
    assert len(sig) == 64
    assert verify_hmac(key, node, seq, ts, payload, sig) is True
    # Tampered payload should fail
    bad_payload = {"current_a": 1.5, "relay": "ON"}
    assert verify_hmac(key, node, seq, ts, bad_payload, sig) is False

def test_ledger_append_and_verify(db_conn):
    # Verify initial ledger state
    res = verify_ledger(db_conn)
    assert res["valid"] is True
    
    # Append record 1
    p1 = {"current_a": 2.0}
    sig1 = compute_hmac("k", "node_a", 101, 100.0, p1)
    rec_id1, prev1, hash1 = append_to_ledger(db_conn, "node_a", 101, 100.0, p1, sig1, True)
    assert prev1 == GENESIS_HASH
    
    # Append record 2
    p2 = {"current_a": 2.5}
    sig2 = compute_hmac("k", "node_a", 102, 105.0, p2)
    rec_id2, prev2, hash2 = append_to_ledger(db_conn, "node_a", 102, 105.0, p2, sig2, True)
    assert prev2 == hash1
    
    # Verify ledger integrity
    verify_res = verify_ledger(db_conn)
    assert verify_res["valid"] is True
    assert verify_res["head_hash"] == hash2

def test_tamper_detection(db_conn):
    # Insert record to tamper
    p = {"current_a": 10.0, "power_kw": 2.1}
    sig = compute_hmac("k", "node_a", 999, 200.0, p)
    rec_id, prev_hash, rec_hash = append_to_ledger(db_conn, "node_a", 999, 200.0, p, sig, True)
    
    # Silent database alteration
    db_conn.execute("UPDATE readings SET payload_json = ? WHERE id = ?;", (json.dumps({"current_a": 1.0}), rec_id))
    db_conn.commit()
    
    # Verification walk MUST detect tampering and pinpoint exact record
    tamper_res = verify_ledger(db_conn)
    assert tamper_res["valid"] is False
    assert tamper_res["tampered_record_id"] == rec_id
    assert "tampered" in tamper_res["reason"].lower()
    
    # Clean up tampered row so downstream tests have an untampered database
    db_conn.execute("DELETE FROM readings WHERE id = ?;", (rec_id,))
    db_conn.commit()
