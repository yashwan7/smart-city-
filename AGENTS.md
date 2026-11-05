# AGENTS.md: CarbonMesh

## What We Are Building
CarbonMesh is an offline-first carbon footprint tracker for Hack Fest 2026 Season 1 (Sai Vidya Institute of Technology, Bengaluru - Green Tech & Sustainability Track).
Sensor nodes send HMAC-signed readings to a hub. The hub maintains a hash-chained ledger, converts activity data into kg CO2e using cited emission factors, serves a real-time clean dashboard, runs a local LLM advisor, and an automated relay cuts wasted load so Before/After carbon and energy savings are proven on stage.

## Architecture & Hardware
- **Node A (Energy + Kiosk)**: NXP FRDM-MCXN236 (LDR, MQ-135, current sensor, OLED, relay controlled load, TinyML INT8 classifier) plus ESP32 #1 (WiFi bridge, DHT11, 4 commute buttons, 1.8in TFT, buzzer). NXP and ESP32 #1 communicate over UART @ 115200 baud (one JSON line per second).
- **Node B (Waste + Garden)**: ESP32 #2 (HC-SR04 bin level, soil moisture, raindrop sensor, pump relay, OLED, buzzer).
- **Hub**: Arduino UNO Q (Linux). Python 3.11, FastAPI, SQLite in WAL mode, hash-chained ledger, Ollama SLM. Serves the built dashboard.
- **Dashboard**: React + Vite + Tailwind CSS + Lucide Icons. Fully offline-first: no CDN, no remote fonts, zero mandatory external dependencies.

## Folder Ownership (Strict Parallel Boundaries)
- `firmware/`: Person A (Sai / Firmware)
- `hub/`, `ml/`, `scripts/`, `.github/`: Person B (Medha / Hub & Data)
- `dashboard/`, `docs/`, `data/`: Person C (Yashwanth / Frontend, Dashboard, Design)

## Packet Contract
`POST /api/ingest`
- **Headers**: `X-Node`, `X-Seq` (epoch ms), `X-Ts` (epoch s), `X-Sig` (lowercase hex HMAC-SHA256 over `node|seq|ts|raw_body`)
- **Node A1 Body**: `{"lux":72,"t":29.4,"rh":55,"aq":412,"aq_ready":true,"i":0.43,"p":93.2,"relay":1,"state":"NORMAL","conf":0.94}`
- **Node B1 Body**: `{"fill":63,"soil":41,"rain":0,"pump":0}`
- **Response 200**: `{"ok":true,"server_ms":1793200000123,"cmd":{"relay":null,"policy":true,"hour":14}}`

## Read API (Dashboard Contracts)
- `GET /api/summary`: Returns `{ today_kg, kwh_today, power_w, by_category: { electricity, transport, fuel, waste }, quality: { measured, estimated, manual }, ledger_ok, updated }`
- `GET /api/breakdown`: Category breakdown with kg, percentage share, source mix, factor id, and citation source.
- `GET /api/timeseries?metric=kg|watts&range=6h&bucket=60`: Time-series points `[[ts, value], ...]`.
- `GET /api/runs/compare`: Side-by-side run comparison `{ baseline: { avg_w, kwh_per_h, kg_per_h }, optimized: { avg_w, kwh_per_h, kg_per_h }, saved_kwh_per_h, projection: false }`
- `POST /api/runs/start`: Body `{"label": "baseline" | "optimized"}`
- `GET /api/recommendations`: List of `{ action, saving_kwh_day, saving_kg_day, basis, text, validated }`
- `POST /api/copilot`: Body `{"question": "..."}` -> Returns `{ answer, sources, validated: true }`
- `GET /api/ledger/verify`: Returns `{ ok: true, records: 1204, first_bad_id: null }`
- `GET /api/devices`: Node health `{ node, last_seen, fw_version, bad_sig_count }`
- `WS /ws/live`: Live telemetry stream `{"type":"reading","node":"A1","ts":1793200000,"d":{...}}`

## Data Rules
- Every emission calculation must have an explicit source tag: `measured`, `estimated`, or `manual`.
- Emission factors are strictly loaded from `data/factors.yaml`. Never hard-code an emission factor.
- Demo/simulated data must be explicitly labeled with a visible `DEMO DATA` badge.

