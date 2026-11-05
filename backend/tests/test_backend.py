"""
backend/tests/test_backend.py
==============================
Comprehensive automated test suite for CarbonMesh v2 backend.
Tests HMAC authentication, replay protection, hash-chained ledger integrity,
tamper detection, emissions calculations, Samputa lifecycle & haircut,
traditional practices anti-repeat, Yagna net-carbon math, AI recommendation
validation, and REST API endpoints.
"""

from pathlib import Path
import shutil
import sys
import tempfile
import time
import unittest

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import config
from app.database import init_db, get_db
from app.security import (
    canonical_json,
    build_signature_input,
    sign_packet,
    generate_hmac_signature,
    verify_packet_signature,
    validate_timestamp_skew,
    calculate_record_hash,
)
from app.ledger import LedgerEngine
from app.emissions import EmissionsEngine
from app.samputa import SamputaEngine
from app.yagna import YagnaEngine
from app.recommendations import RecommendationEngine
from app.models import RelayControlRequest
from app.main import app


class TestCarbonMeshBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create a dedicated temporary directory for test database
        cls.test_dir = tempfile.mkdtemp(prefix="carbonmesh_test_")
        cls.test_db_path = Path(cls.test_dir) / "test_carbonmesh.db"

        # Override config database path
        cls.orig_db_path = config.DATABASE_PATH
        config.DATABASE_PATH = cls.test_db_path

        # Initialize schema and seed data
        init_db(cls.test_db_path)

        # Set up FastAPI TestClient
        cls.client = TestClient(app)

        # Demo secret for node-01
        cls.node_id = "node-01"
        cls.secret_key = config.DEMO_NODE_KEYS[cls.node_id]

    @classmethod
    def tearDownClass(cls):
        # Restore original database path and clean up temp folder
        config.DATABASE_PATH = cls.orig_db_path
        shutil.rmtree(cls.test_dir, ignore_errors=True)

    # =========================================================================
    # 1. SECURITY & HMAC TESTS
    # =========================================================================

    def test_01_canonical_json_key_ordering(self):
        """Tests that canonical JSON produces identical output regardless of dictionary key insertion order."""
        dict_a = {"voltage_v": 230.5, "current_a": 4.2, "active_power_w": 968.1}
        dict_b = {"active_power_w": 968.1, "voltage_v": 230.5, "current_a": 4.2}

        canonical_a = canonical_json(dict_a)
        canonical_b = canonical_json(dict_b)

        self.assertEqual(canonical_a, canonical_b)
        self.assertIn('"active_power_w":968.1', canonical_a)
        self.assertNotIn(": ", canonical_a)
        self.assertNotIn(", ", canonical_a)

    def test_02_hmac_signature_generation_and_verification(self):
        """Tests generating a valid HMAC-SHA256 signature and verifying it against secret."""
        seq = 1
        ts = time.time()
        data = {"power_w": 500.0, "power_factor": 0.95}

        sig = generate_hmac_signature(self.secret_key, self.node_id, seq, ts, data)
        self.assertEqual(len(sig), 64)

        # Verification must succeed with exact payload
        is_valid = verify_packet_signature(self.node_id, seq, ts, data, sig, self.secret_key)
        self.assertTrue(is_valid)

        # Verification must fail if any single field is altered
        tampered_data = {"power_w": 500.1, "power_factor": 0.95}
        is_tampered_valid = verify_packet_signature(self.node_id, seq, ts, tampered_data, sig, self.secret_key)
        self.assertFalse(is_tampered_valid)

        # Verification must fail with incorrect secret key
        is_wrong_key_valid = verify_packet_signature(self.node_id, seq, ts, data, sig, "wrong_secret_key")
        self.assertFalse(is_wrong_key_valid)

    def test_03_timestamp_clock_skew(self):
        """Tests clock skew validation within ±300 seconds and rejection of stale/future timestamps."""
        now = time.time()

        # Exactly now -> valid
        self.assertTrue(validate_timestamp_skew(now)[0])

        # 60 seconds ago -> valid
        self.assertTrue(validate_timestamp_skew(now - 60.0)[0])

        # 60 seconds ahead -> valid
        self.assertTrue(validate_timestamp_skew(now + 60.0)[0])

        # 305 seconds ago -> rejected
        valid, delta = validate_timestamp_skew(now - 305.0)
        self.assertFalse(valid)
        self.assertGreater(delta, 300.0)

        # 305 seconds ahead -> rejected
        valid, delta = validate_timestamp_skew(now + 305.0)
        self.assertFalse(valid)
        self.assertGreater(delta, 300.0)

    def test_04_record_hash_calculation(self):
        """Tests deterministic SHA-256 calculation for ledger hash chaining."""
        prev_hash = config.GENESIS_HASH
        canonical_payload = 'node-01|1|1700000000.0|{"power_w":500.0}'
        signature = "a" * 64

        hash_1 = calculate_record_hash(prev_hash, canonical_payload, signature)
        hash_2 = calculate_record_hash(prev_hash, canonical_payload, signature)

        self.assertEqual(hash_1, hash_2)
        self.assertEqual(len(hash_1), 64)

        # Different prev_hash must produce different record_hash
        diff_prev_hash = "1" * 64
        hash_diff = calculate_record_hash(diff_prev_hash, canonical_payload, signature)
        self.assertNotEqual(hash_1, hash_diff)

    # =========================================================================
    # 2. LEDGER ENGINE & TAMPER RESISTANCE
    # =========================================================================

    def test_05_ledger_append_and_verify_chain(self):
        """Tests appending sequentially chained readings and verifying the cryptographic chain."""
        ledger = LedgerEngine(db_path=self.test_db_path)
        base_ts = time.time() - 100.0

        for i in range(1, 4):
            data = {"voltage_v": 230.0, "active_power_w": 250.0 + i * 50.0}
            ts = base_ts + i * 10.0
            sig = generate_hmac_signature(self.secret_key, self.node_id, i, ts, data)

            reading_id, rec_hash, prev_h = ledger.append_reading(
                node=self.node_id,
                seq=i,
                ts=ts,
                data=data,
                signature=sig,
            )

            self.assertGreater(reading_id, 0)
            self.assertTrue(rec_hash)

            if i == 1:
                self.assertEqual(prev_h, config.GENESIS_HASH)

        # Verify chain integrity
        audit = ledger.verify_chain()
        self.assertEqual(audit.status, "OK")
        self.assertGreaterEqual(audit.records_verified, 3)
        self.assertIsNone(audit.first_broken_id)

    def test_06_replay_protection_non_increasing_sequence(self):
        """Tests rejection of replay packets with duplicate or non-increasing sequence numbers."""
        ledger = LedgerEngine(db_path=self.test_db_path)
        ts = time.time()
        data = {"active_power_w": 100.0}

        # Sequence 2 was already ingested in test_05, replaying seq 2 must fail
        sig_replay = generate_hmac_signature(self.secret_key, self.node_id, 2, ts, data)
        with self.assertRaises(ValueError) as ctx:
            ledger.append_reading(self.node_id, 2, ts, data, sig_replay)
        self.assertIn("Replay detected", str(ctx.exception))

        # Replaying seq 1 must also fail
        sig_old = generate_hmac_signature(self.secret_key, self.node_id, 1, ts, data)
        with self.assertRaises(ValueError) as ctx:
            ledger.append_reading(self.node_id, 1, ts, data, sig_old)
        self.assertIn("Replay detected", str(ctx.exception))

    def test_07_tamper_demo_detection(self):
        """Tests in-memory tamper demonstration where altered past record is immediately caught."""
        ledger = LedgerEngine(db_path=self.test_db_path)
        tamper_report = ledger.run_tamper_demo()

        self.assertEqual(tamper_report.demonstration, "TAMPER_DETECTION_PROOF")
        self.assertIn("mismatch", tamper_report.verification_result.lower())
        self.assertNotEqual(tamper_report.original_record_hash, tamper_report.recalculated_record_hash)

    # =========================================================================
    # 3. EMISSIONS ENGINE
    # =========================================================================

    def test_08_emissions_commute_and_fuel_calculation(self):
        """Tests commute and fuel emissions math based on factors.yaml."""
        emissions = EmissionsEngine(db_path=self.test_db_path)

        # 10 km by car @ 0.18 kg/km = 1.8 kg CO2e
        car_commute = emissions.record_commute(
            mode="car",
            distance_km=10.0,
            occupancy=1,
            notes="Solo drive",
            run_name="baseline_2026",
        )
        self.assertAlmostEqual(car_commute["kg_co2e"], 1.80, places=3)
        self.assertEqual(car_commute["mode"], "car")

        # 5 km walk @ 0.0 kg/km = 0.0 kg CO2e
        walk_commute = emissions.record_commute(
            mode="walk",
            distance_km=5.0,
            occupancy=1,
            notes="Walking to office",
            run_name="baseline_2026",
        )
        self.assertEqual(walk_commute["kg_co2e"], 0.0)

        # 10 Litres diesel @ 2.68 kg/L = 26.8 kg CO2e
        diesel_fuel = emissions.record_fuel(
            fuel_type="diesel",
            litres=10.0,
            equipment="Backup diesel generator 15kVA",
            notes="Grid outage simulation",
            run_name="baseline_2026",
        )
        self.assertAlmostEqual(diesel_fuel["kg_co2e"], 26.80, places=3)

        # Breakdown summary check
        breakdown = emissions.get_breakdown(run_id=None)
        self.assertIn("transport", breakdown["categories"])
        self.assertIn("fuel", breakdown["categories"])
        self.assertGreaterEqual(breakdown["categories"]["fuel"], 26.80)

    # =========================================================================
    # 4. SAMPUTA CARBON BANK ENGINE & HAIRCUT
    # =========================================================================

    def test_09_samputa_batch_lifecycle_and_haircut(self):
        """Tests batch lifecycle: OPEN -> SEALED -> CREDITED with 30% haircut."""
        samputa = SamputaEngine(db_path=self.test_db_path)

        # Create batch in OPEN state
        batch = samputa.create_batch(
            batch_id="SAMPUTA-BIOCHAR-01",
            capacity_litres=20.0,
            assumed_density_kg_per_l=0.40,
            depositor="farmer_gowda",
            notes="Coconut shell pyrolysis",
        )
        self.assertEqual(batch["lifecycle_status"], "OPEN")

        # Seal batch with fill level 85%
        # Volume = 20L * 0.85 = 17L -> Mass = 17 * 0.40 = 6.8 kg
        # Gross = 6.8 * 0.50 = 3.4 kg
        # Net projected with 30% haircut = 3.4 * 0.70 = 2.38 kg
        sealed = samputa.seal_batch(
            batch_id="SAMPUTA-BIOCHAR-01",
            fill_percentage=85.0,
            notes="Kiln cooled, batch sealed",
        )
        self.assertEqual(sealed["lifecycle_status"], "SEALED")
        self.assertEqual(sealed["haircut_applied_pct"], 30.0)
        self.assertAlmostEqual(sealed["net_projected_co2e"], 2.38, places=2)

        # Verify batch with certified scale weighing (e.g. 6.8 kg)
        verified = samputa.verify_and_credit_batch(
            batch_id="SAMPUTA-BIOCHAR-01",
            weighed_mass_kg=6.8,
            verifier="auditor_dr_rao",
            notes="Certified weight scale verified and biochar applied to farm soil",
        )
        self.assertEqual(verified["lifecycle_status"], "CREDITED")
        self.assertAlmostEqual(verified["verified_net_co2e"], 2.38, places=2)

    def test_10_samputa_anti_double_crediting(self):
        """Tests that attempting to re-verify an already credited batch raises error."""
        samputa = SamputaEngine(db_path=self.test_db_path)

        with self.assertRaises(ValueError) as ctx:
            samputa.verify_and_credit_batch(
                batch_id="SAMPUTA-BIOCHAR-01",
                weighed_mass_kg=6.8,
                verifier="second_auditor",
            )
        self.assertIn("Anti-double-crediting triggered", str(ctx.exception))

    def test_11_traditional_practices_anti_repeat(self):
        """Tests recording traditional matka credit and enforcing 24h anti-repeat rule."""
        samputa = SamputaEngine(db_path=self.test_db_path)

        # First recording must succeed
        credit1 = samputa.record_traditional_credit(
            practice="matka",
            quantity=1.0,
            depositor="student_ramesh",
            notes="Clay pot evaporative water cooling in hostel",
        )
        self.assertEqual(credit1["status"], "CREDITED")
        self.assertAlmostEqual(credit1["net_benefit_kg_co2e"], 0.25, places=2)

        # Second recording within 24 hours must be rejected
        with self.assertRaises(ValueError) as ctx:
            samputa.record_traditional_credit(
                practice="matka",
                quantity=1.0,
                depositor="student_ramesh",
                notes="Attempting immediate duplicate credit",
            )
        self.assertIn("already claimed 'matka' within the last 24 hours", str(ctx.exception))

    # =========================================================================
    # 5. YAGNA NET-CARBON ENGINE & MATH
    # =========================================================================

    def test_12_yagna_net_carbon_calculations(self):
        """Tests NET = BAD - GOOD, yagna_ratio = GOOD / BAD, and zero division safety."""
        yagna = YagnaEngine(db_path=self.test_db_path)

        net_status = yagna.calculate_net_carbon()

        bad = net_status.bad_emissions_kg_co2e
        good = net_status.good_sequestration_kg_co2e
        net = net_status.net_carbon_kg_co2e
        ratio = net_status.yagna_ratio

        # NET = BAD - GOOD
        self.assertAlmostEqual(net, round(bad - good, 4), places=3)

        # Ratio safety
        if bad > 0:
            self.assertAlmostEqual(ratio, round(good / bad, 4), places=3)
        elif good > 0:
            self.assertIsNone(ratio)
        else:
            self.assertEqual(ratio, 1.0)

    def test_13_relay_control_override_and_event_logging(self):
        """Tests manual relay control command logging to audit events."""
        yagna = YagnaEngine(db_path=self.test_db_path)

        req = RelayControlRequest(
            node_id="esp32-grid-01",
            action="TURN_OFF",
            reason="Peak grid carbon intensity shedding test",
            operator="admin_medha",
        )
        cmd = yagna.execute_relay_control(req)
        self.assertEqual(cmd["status"], "EXECUTED")

        # Verify event was persisted in database
        events = yagna.list_events()
        self.assertTrue(any(e["operator"] == "admin_medha" for e in events))

    # =========================================================================
    # 6. STRICT AI RECOMMENDATION VALIDATOR
    # =========================================================================

    def test_14_ai_recommendation_hallucination_filter(self):
        """Tests that the recommendation validator strictly rejects numbers hallucinated by AI."""
        # Allowed set of numbers derived from actual accounting
        allowed_numbers = {10.0, 1.80, 26.80, 2.38, 0.85, 0.70}
        fallback_text = "Shift high-power appliances to off-peak solar hours to cut grid emissions."

        # Valid AI text: contains only numbers from allowed set
        valid_ai_text = "By shifting 10.0 kg of diesel fuel to solar, you eliminate 26.80 kg CO2e."
        text_out, status_out = RecommendationEngine.validate_ai_text(
            valid_ai_text, allowed_numbers, fallback_text
        )
        self.assertEqual(status_out, "VALIDATED")
        self.assertEqual(text_out, valid_ai_text)

        # Hallucinated AI text: invents arbitrary number not in system (e.g. 9988.77)
        hallucinated_text = "Switching your water cooler will magically save 9988.77 kg CO2e every month."
        text_out, status_out = RecommendationEngine.validate_ai_text(
            hallucinated_text, allowed_numbers, fallback_text
        )
        self.assertEqual(status_out, "FALLBACK")
        self.assertEqual(text_out, fallback_text)
        self.assertNotIn("9988.77", text_out)

    # =========================================================================
    # 7. FASTAPI REST API INTEGRATION TESTS
    # =========================================================================

    def test_15_api_health_and_time(self):
        """Tests GET /health and GET /api/time endpoints."""
        r = self.client.get("/health")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "healthy")

        r_time = self.client.get("/api/time")
        self.assertEqual(r_time.status_code, 200)
        self.assertIn("server_time_unix", r_time.json())
        self.assertEqual(r_time.json()["max_clock_skew_seconds"], 300.0)

    def test_16_api_ingest_flow(self):
        """Tests POST /api/ingest with valid HMAC, bad HMAC, and replay attack."""
        node_id = "node-01"
        secret = config.DEMO_NODE_KEYS[node_id]

        # 1. Ingest valid packet seq 10
        seq = 10
        ts = time.time()
        data = {"power_w": 350.0, "voltage_v": 230.0}
        sig = generate_hmac_signature(secret, node_id, seq, ts, data)

        payload = {
            "node": node_id,
            "seq": seq,
            "ts": ts,
            "d": data,
            "sig": sig,
        }

        resp = self.client.post("/api/ingest", json=payload)
        self.assertEqual(resp.status_code, 201)
        json_resp = resp.json()
        self.assertEqual(json_resp["status"], "ACCEPTED")
        self.assertEqual(json_resp["seq"], 10)
        self.assertTrue(json_resp["record_hash"])

        # 2. Tampered signature on new sequence 11 -> 401 Unauthorized
        bad_payload = {
            "node": node_id,
            "seq": 11,
            "ts": ts,
            "d": data,
            "sig": "0" * 64,
        }
        resp_bad = self.client.post("/api/ingest", json=bad_payload)
        self.assertEqual(resp_bad.status_code, 401)

        # 3. Replay attack (replaying accepted seq 10) -> 409 Conflict
        resp_replay = self.client.post("/api/ingest", json=payload)
        self.assertEqual(resp_replay.status_code, 409)

    def test_17_api_ledger_verify_and_tamper_demo(self):
        """Tests GET /api/ledger/verify and GET /api/ledger/tamper-demo."""
        resp_verify = self.client.get("/api/ledger/verify")
        self.assertEqual(resp_verify.status_code, 200)
        self.assertEqual(resp_verify.json()["status"], "OK")

        resp_tamper = self.client.get("/api/ledger/tamper-demo")
        self.assertEqual(resp_tamper.status_code, 200)
        self.assertEqual(resp_tamper.json()["demonstration"], "TAMPER_DETECTION_PROOF")

    def test_18_api_emissions_and_summary(self):
        """Tests POST /api/commute, POST /api/fuel, and GET /api/summary."""
        # Commute endpoint
        commute_req = {
            "mode": "metro",
            "distance_km": 15.0,
            "occupancy": 1,
            "notes": "Namma Metro Purple Line",
        }
        r_commute = self.client.post("/api/commute", json=commute_req)
        self.assertEqual(r_commute.status_code, 201)
        self.assertAlmostEqual(r_commute.json()["kg_co2e"], 15.0 * 0.03, places=3)

        # Fuel endpoint
        fuel_req = {
            "fuel_type": "cng",
            "litres": 5.0,
            "equipment": "Campus delivery auto",
        }
        r_fuel = self.client.post("/api/fuel", json=fuel_req)
        self.assertEqual(r_fuel.status_code, 201)
        self.assertAlmostEqual(r_fuel.json()["kg_co2e"], 5.0 * 2.75, places=3)

        # Summary endpoint
        r_sum = self.client.get("/api/summary")
        self.assertEqual(r_sum.status_code, 200)
        self.assertIn("bad_total_kg_co2e", r_sum.json())

    def test_19_api_samputa_flow(self):
        """Tests full Samputa REST API workflow."""
        # Create batch
        r_create = self.client.post("/api/samputa/batch?batch_id=API-BATCH-01&capacity_litres=20.0")
        self.assertEqual(r_create.status_code, 201)
        self.assertEqual(r_create.json()["lifecycle_status"], "OPEN")

        # Seal batch
        seal_payload = {
            "batch_id": "API-BATCH-01",
            "fill_percentage": 75.0,
            "notes": "Pyrolysis drum batch sealed",
        }
        r_seal = self.client.post("/api/samputa/seal", json=seal_payload)
        self.assertEqual(r_seal.status_code, 200)
        self.assertEqual(r_seal.json()["lifecycle_status"], "SEALED")

        # Verify batch
        verify_payload = {
            "batch_id": "API-BATCH-01",
            "weighed_mass_kg": 6.0,
            "verifier": "Dr. Ramesh (Agronomist)",
            "notes": "Biochar quality certified",
        }
        r_verify = self.client.post("/api/samputa/verify", json=verify_payload)
        self.assertEqual(r_verify.status_code, 200)
        self.assertEqual(r_verify.json()["lifecycle_status"], "CREDITED")

        # Traditional practice endpoint
        trad_payload = {
            "practice": "handloom",
            "quantity": 5.0,
            "depositor": "weaver_anjaneya",
            "notes": "5 meters handwoven khadi cotton",
        }
        r_trad = self.client.post("/api/traditional", json=trad_payload)
        self.assertEqual(r_trad.status_code, 201)

        # Duplicate traditional practice same day -> 400 Bad Request
        r_trad_dup = self.client.post("/api/traditional", json=trad_payload)
        self.assertEqual(r_trad_dup.status_code, 400)

        # Summary check
        r_samp_sum = self.client.get("/api/samputa/summary")
        self.assertEqual(r_samp_sum.status_code, 200)
        self.assertGreater(r_samp_sum.json()["total_good_kg_co2e"], 0.0)

    def test_20_api_yagna_net_and_recommendations(self):
        """Tests GET /api/net and GET /api/recommendations."""
        r_net = self.client.get("/api/net")
        self.assertEqual(r_net.status_code, 200)
        data = r_net.json()
        self.assertIn("net_carbon_kg_co2e", data)
        self.assertIn("yagna_ratio", data)

        r_recs = self.client.get("/api/recommendations")
        self.assertEqual(r_recs.status_code, 200)
        recs_data = r_recs.json()
        self.assertIsInstance(recs_data, list)
        self.assertGreater(len(recs_data), 0)

        # Relay control endpoint
        relay_payload = {
            "node_id": "esp32-grid-01",
            "action": "TURN_ON",
            "reason": "Test load restoration",
            "operator": "test_operator",
        }
        r_relay = self.client.post("/api/control/relay", json=relay_payload)
        self.assertEqual(r_relay.status_code, 200)

        # Events endpoint
        r_events = self.client.get("/api/events")
        self.assertEqual(r_events.status_code, 200)
        self.assertIsInstance(r_events.json(), list)


if __name__ == "__main__":
    unittest.main()
