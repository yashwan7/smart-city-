import hmac
import hashlib
import json
from typing import Any, Dict

def canonical_json(data: Dict[str, Any]) -> str:
    """Produces deterministic canonical JSON string without whitespace, sorted keys."""
    return json.dumps(data, sort_keys=True, separators=(',', ':'))

def build_signing_message(node: str, seq: int, ts: Any, payload: Dict[str, Any]) -> bytes:
    """
    Standard CarbonMesh canonical message format:
    node|seq|ts|canonical_json(d)
    """
    ts_val = int(ts) if (isinstance(ts, (int, float)) and float(ts).is_integer()) else (f"{ts:.3f}" if isinstance(ts, float) else str(ts))
    payload_str = canonical_json(payload)
    raw = f"{node}|{seq}|{ts_val}|{payload_str}"
    return raw.encode('utf-8')

def build_legacy_signing_message(node: str, seq: int, ts: float, payload: Dict[str, Any]) -> bytes:
    """Legacy colon-separated format."""
    ts_str = f"{ts:.3f}"
    payload_str = canonical_json(payload)
    raw = f"{node}:{seq}:{ts_str}:{payload_str}"
    return raw.encode('utf-8')

def compute_hmac(secret_key: str, node: str, seq: int, ts: Any, payload: Dict[str, Any]) -> str:
    """Calculates HMAC-SHA256 hex digest for standard canonical message."""
    msg = build_signing_message(node, seq, ts, payload)
    return hmac.new(secret_key.encode('utf-8'), msg, hashlib.sha256).hexdigest()

def verify_hmac(secret_key: str, node: str, seq: int, ts: Any, payload: Dict[str, Any], received_sig: str) -> bool:
    """Verifies HMAC signature against standard contract node|seq|ts|canonical_json(d)."""
    # 1. Primary standard check: node|seq|ts|canonical_json(d)
    expected_standard = compute_hmac(secret_key, node, seq, ts, payload)
    if hmac.compare_digest(expected_standard.lower(), received_sig.lower()):
        return True

    # 2. Alternative float representation check if ts had float precision
    alt_raw = f"{node}|{seq}|{ts}|{canonical_json(payload)}".encode('utf-8')
    alt_sig = hmac.new(secret_key.encode('utf-8'), alt_raw, hashlib.sha256).hexdigest()
    if hmac.compare_digest(alt_sig.lower(), received_sig.lower()):
        return True

    # 3. Fallback colon format check
    if isinstance(ts, (int, float)):
        legacy_msg = build_legacy_signing_message(node, seq, float(ts), payload)
        legacy_sig = hmac.new(secret_key.encode('utf-8'), legacy_msg, hashlib.sha256).hexdigest()
        if hmac.compare_digest(legacy_sig.lower(), received_sig.lower()):
            return True

    return False
