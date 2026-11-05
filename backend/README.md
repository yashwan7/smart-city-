# CarbonMesh v2 Backend

**Verifiable Net-Carbon Platform for Hack Fest 2026 S1, SalT Bengaluru, Green Tech & Sustainability, PS-01.**

Built with **FastAPI**, **SQLite** (WAL mode + Foreign Keys), **Pydantic v2**, and **HMAC-SHA256 / SHA256 Chained Hash Ledger**.

---

## 🏗️ Architecture & Pipeline

```
ESP32 / NXP Node / Phone Kiosk
   │
   ▼ (HMAC-SHA256 Signed JSON: node|seq|ts|canonical_json(d))
FastAPI Ingest Hub (POST /api/ingest)
   │
   ├── Replay Protection (seq > last_accepted_seq)
   ├── Clock Skew Check (|now - ts| <= 300s)
   └── Constant-Time HMAC Verification
   │
   ▼
SQLite Append-Only Hash-Chained Ledger (record_hash = SHA256(prev_hash || payload || sig))
   │
   ├── Emissions Engine (BAD = sum(emissions.kg_co2e)) [Electricity, Transport, Fuel]
   └── Samputa Carbon Bank (GOOD = sum(sequestration.kg_co2e)) [Biochar Batches & Traditional Practices]
   │
   ▼
Yagna Net-Carbon Calculator:
   NET = BAD - GOOD  (Negative = Net-Carbon-Negative)
   yagna_ratio = GOOD / BAD
   │
   ├── REST API (/api/*)
   └── Live WebSocket Stream (/ws/live) -> React / Vite Dashboard
```

---

## 🚀 Quick Start & Run Commands

### 1. Install Dependencies
```bash
# In active virtual environment:
pip install -r backend/requirements.txt
```

### 2. Start Backend Server
From the repository root:
```bash
uvicorn app.main:app --app-dir backend --reload --host 0.0.0.0 --port 8000
```

- Interactive OpenAPI Documentation: `http://localhost:8000/docs`
- Service Health Probe: `http://localhost:8000/health`
- Live WebSocket Stream: `ws://localhost:8000/ws/live`

---

## 📡 API Contract for Frontend & Firmware Teammates

### 1. Ingest Telemetry (`POST /api/ingest`)
Expected packet format:
```json
{
  "node": "esp32-grid-01",
  "seq": 1,
  "ts": 1718000000.123,
  "d": {
    "power_w": 250.0,
    "dt_s": 5.0,
    "voltage_v": 230.1,
    "current_a": 1.08
  },
  "sig": "3a8c...64_hex_chars..."
}
```
**Signature Generation**:
```python
message = f"{node}|{seq}|{ts}|{canonical_json(d)}"
sig = hmac.new(secret_key.encode(), message.encode(), hashlib.sha256).hexdigest()
```

### 2. Ledger Chain Verification & Proofs
- `GET /api/ledger/verify`: Walks hash chain and verifies every prev_hash pointer and HMAC signature.
- `GET /api/ledger/tamper-demo`: Simulates tampering on an in-memory database copy to prove detection.
- `GET /api/ledger/readings`: Fetches recent chained ledger entries.

### 3. Emissions (`/api/commute`, `/api/fuel`, `/api/summary`, `/api/breakdown`)
- `POST /api/commute`: `{"mode": "metro", "distance_km": 12.0, "occupancy": 1}`
- `POST /api/fuel`: `{"fuel_type": "diesel", "litres": 15.0}`
- `GET /api/summary`: Total `BAD`, category totals, and quality source distribution.
- `GET /api/breakdown`: Categorized by `electricity`, `transport`, `fuel`, `waste`.
- `GET /api/runs/compare?run_a=baseline_2026&run_b=optimized_live`: Baseline vs optimized delta.

### 4. Samputa Carbon Bank (`/api/samputa/*`)
- Lifecycle: `OPEN` -> `SEALED` (projected with 30% haircut) -> `VERIFIED` -> `CREDITED` (certified scale mass).
- `POST /api/samputa/seal`: `{"batch_id": "SAMPUTA-2026-001", "fill_percentage": 60.0}`
- `POST /api/samputa/verify`: `{"batch_id": "SAMPUTA-2026-001", "weighed_mass_kg": 4.5}` (prevents double crediting).
- `POST /api/traditional`: `{"practice": "matka", "quantity": 1.0, "depositor": "student-101"}` (anti-repeat within 24h).

### 5. Yagna Net-Carbon & Relay Control
- `GET /api/net`: Full net carbon response (`bad_emissions_kg_co2e`, `good_sequestration_kg_co2e`, `net_carbon_kg_co2e`, `yagna_ratio`, `is_net_negative`).
- `GET /api/recommendations`: Deterministic savings recommendations (with strict AI numeric validation).
- `GET /api/time`: Server timestamp and synchronization clock skew limits.
- `POST /api/control/relay`: `{"node_id": "esp32-grid-01", "action": "TURN_OFF", "reason": "Net deficit load shed"}`

---

## 🧪 Automated Testing
Run the backend test suite:
```bash
python -m unittest discover -s backend/tests -p "test_*.py" -v
```
