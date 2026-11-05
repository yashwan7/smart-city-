"""
backend/app/security.py
=======================
Cryptographic security, canonical JSON serialization, HMAC-SHA256 verification,
constant-time comparisons, and SHA256 hash-chaining for CarbonMesh v2.
"""

import hashlib
import hmac
import json
import time
from typing import Any, Dict, Optional, Tuple

from . import config


def canonical_json(data: Dict[str, Any]) -> str:
    """
    Serializes a dictionary to canonical JSON:
      - Keys sorted recursively
      - No insignificant whitespace (separators=(',', ':'))
      - UTF-8 clean
    """
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def build_signature_input(node: str, seq: int, ts: float, data: Dict[str, Any]) -> str:
    """
    Constructs the canonical signature input string per specification:
        node|seq|ts|canonical_json(d)
    """
    # Float timestamps formatted cleanly (e.g. 1718000000.0 or integer-style if exact)
    # Using str(ts) or formatted float
    ts_str = f"{ts:.6f}".rstrip("0").rstrip(".") if isinstance(ts, float) else str(ts)
    c_json = canonical_json(data)
    return f"{node}|{seq}|{ts_str}|{c_json}"


def generate_hmac_sha256(message: str, secret_key: str) -> str:
    """Generates lowercase 64-char hex HMAC-SHA256 signature."""
    return hmac.new(
        secret_key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest().lower()


def sign_packet(node: str, seq: int, ts: float, data: Dict[str, Any], secret_key: str) -> str:
    """Utility to generate the HMAC-SHA256 signature for a sensor packet."""
    msg = build_signature_input(node, seq, ts, data)
    return generate_hmac_sha256(msg, secret_key)


def generate_hmac_signature(secret_key: str, node: str, seq: int, ts: float, data: Dict[str, Any]) -> str:
    """Convenience alias taking secret_key as first parameter."""
    return sign_packet(node=node, seq=seq, ts=ts, data=data, secret_key=secret_key)


def verify_packet_signature(
    node: str,
    seq: int,
    ts: float,
    data: Dict[str, Any],
    provided_sig: str,
    secret_key: str,
) -> bool:
    """
    Verifies an HMAC-SHA256 signature using constant-time comparison.
    Tolerates float timestamp precision formatting.
    """
    clean_sig = provided_sig.strip().lower()

    # Attempt primary signature input
    msg1 = build_signature_input(node, seq, ts, data)
    expected_sig1 = generate_hmac_sha256(msg1, secret_key)
    if hmac.compare_digest(expected_sig1, clean_sig):
        return True

    # Fallback attempt with raw str(ts) in case node sent unrounded float
    msg2 = f"{node}|{seq}|{str(ts)}|{canonical_json(data)}"
    expected_sig2 = generate_hmac_sha256(msg2, secret_key)
    return hmac.compare_digest(expected_sig2, clean_sig)


def validate_timestamp_skew(ts: float, max_skew_seconds: Optional[float] = None) -> Tuple[bool, float]:
    """
    Verifies that the packet timestamp does not exceed allowed clock skew.
    Returns: (is_valid, delta_seconds)
    """
    skew_limit = max_skew_seconds if max_skew_seconds is not None else config.ALLOWED_CLOCK_SKEW_SECONDS
    now = time.time()
    delta = abs(now - float(ts))
    return (delta <= skew_limit), delta


def calculate_record_hash(prev_hash: str, canonical_payload: str, signature: str) -> str:
    """
    Calculates the tamper-evident record hash for the append-only ledger:
        record_hash = SHA256(prev_hash || canonical_payload || sig)
    Using byte encoding with '||' delimiter:
        hashlib.sha256(f"{prev_hash}||{canonical_payload}||{signature}".encode("utf-8"))
    """
    combined = f"{prev_hash}||{canonical_payload}||{signature.lower()}"
    return hashlib.sha256(combined.encode("utf-8")).hexdigest().lower()
