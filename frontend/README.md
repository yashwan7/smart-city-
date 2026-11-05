# CarbonMesh v2 — Frontend Architecture & Contract Specifications

> **Role:** Person C (Yashwanth) — Frontend Engineer  
> **Repository:** `Hackfest-X-Saividya/izanagi-t3-11`  
> **Track:** Green Tech & Sustainability | **Team:** Izanagi (T3-11)  
> **Tagline:** *CarbonMesh v2: Measured. Signed. Acting. Offline.*

---

## 1. Overview & File Ownership

The frontend is built with **React 19 + TypeScript + Vite + Tailwind CSS v4 + Recharts**, operating 100% offline without remote CDN dependencies.

### Owned Files
- `frontend/src/App.tsx`: Main layout, sidebar navigation, WebSocket reconnection & offline status banner.
- `frontend/src/main.tsx`: React DOM mount.
- `frontend/src/index.css`: Tailwind CSS imports and system typography.
- `frontend/src/components/LiveKPIs.tsx`: BAD, GOOD, and NET carbon display, power (W), kWh, quality split, commute & fuel kiosks.
- `frontend/src/components/YagnaChart.tsx`: Dual-axis Recharts time-series (BAD emissions on left axis, GOOD benefits on right axis, NET line crossing zero, tagged edge events).
- `frontend/src/components/IntegrityBadge.tsx`: Cryptographic ledger audit badge (`LEDGER OK` vs `TAMPERED`), verify action, and safe non-destructive tamper demo action.
- `frontend/src/components/Breakdown.tsx`: Scope & category donut chart with clickable statutory factor inspector and peer-reviewed citations.
- `frontend/src/components/SamputaCard.tsx`: Samputa Carbon Bank batch tracker (ultrasonic fill level, rain sensor, lid state, projected vs verified benefit, manual weigh-in verification form).
- `frontend/src/components/VernacularCard.tsx`: Traditional carbon-avoidance practices (Matka evaporative cooler, Handloom apparel) with conservative 20% uncertainty haircut.
- `frontend/src/components/BeforeAfter.tsx`: Baseline vs Optimized closed-loop comparison proving energy and emissions savings upon edge relay trip.
- `frontend/src/components/Advisor.tsx`: Deterministic closed-loop advisor displaying rule-verified recommendations with strict mathematical validation.
- `frontend/src/components/Devices.tsx`: Edge device fleet topology (Node A1 NXP+ESP32, Node B1 ESP32, Hub).
- `frontend/src/hooks/useLive.ts`: Unified telemetry hook connecting to `/ws/live` with exponential backoff reconnect and REST fallback.
- `frontend/src/lib/api.ts`: Typed API client for all backend REST endpoints and mutations.
- `frontend/src/lib/types.ts`: TypeScript interfaces for the shared data model.
- `frontend/src/lib/format.ts`: Number formatting, unit conversion, and quality tag helpers.

---

## 2. Shared API Contracts (Shared with Medha)

### REST Endpoints
| Method | Endpoint | Description | Expected Payload / Response |
|:---|:---|:---|:---|
| `GET` | `/api/net` | Primary net-carbon balance | `{ bad_kg, good_kg, net_kg, good_verified_kg, good_projected_kg, power_w, kwh_today, quality, ledger_ok, updated, accounting_boundary }` |
| `GET` | `/api/summary` | Backward-compatible summary | `{ today_kg, kwh_today, power_w, quality, ledger_ok, updated }` |
| `GET` | `/api/breakdown` | Scope & category breakdown | `BreakdownItem[]` (electricity, transport, fuel, waste with factors and citations) |
| `GET` | `/api/timeseries` | Historical dual-axis points | `TimeseriesPoint[]` (`bad_kg`, `good_verified_kg`, `good_projected_kg`, `net_kg`, `relay_event`, `lid_event`) |
| `GET` | `/api/runs/compare` | Closed loop comparison | `{ baseline: { avg_w, kwh_per_h, kg_per_h }, optimized: { avg_w, kwh_per_h, kg_per_h }, saved_kwh_per_h, saved_kg_per_h, pct_saved, has_data }` |
| `GET` | `/api/recommendations`| Rule-verified advisor advice | `Recommendation[]` (`id`, `title`, `action`, `trigger_reason`, `saving_kwh_day`, `saving_kg_day`, `validated`) |
| `GET` | `/api/ledger/verify` | Sequential SHA-256 walk | `{ ok: boolean, records: number, first_bad_id: number \| null, root_hash: string }` |
| `GET` | `/api/devices` | Device health & HMAC status | `DeviceNode[]` (`node`, `status`, `last_seen`, `fw_version`, `bad_sig_count`, `sensors`) |
| `GET` | `/api/time` | Hub clock synchronization | `{ server_time: string, unix_ts: number }` |
| `GET` | `/api/ledger/tamper-demo` | Safe in-memory tamper flag | `{ ok: boolean, records: number, first_bad_id: 412 }` |
| `POST` | `/api/commute` | ESP32 #1 commute kiosk | Body: `{ mode: 'walk'\|'bus'\|'bike'\|'car', km: number }` |
| `POST` | `/api/fuel` | Scope 1 generator entry | Body: `{ fuel_type: 'diesel'\|'petrol', litres: number }` |
| `POST` | `/api/traditional` | Vernacular avoidance entry | Body: `{ activity: 'matka'\|'handloom', quantity: number }` |
| `POST` | `/api/samputa/verify`| Physical mass weigh-in | Body: `{ batch_id: string, weighed_mass_kg: number }` |
| `POST` | `/api/control/relay` | Signed edge load curtailment | Body: `{ action: 'trip' \| 'restore' }` |

### WebSocket `/ws/live` Message Contract
```json
{
  "type": "telemetry" | "relay" | "lid" | "ledger" | "batch",
  "node": "Node A1",
  "ts": 1793200000,
  "data": {
    "power_w": 42.1,
    "bad_kg": 2.14,
    "good_kg": 0.85,
    "net_kg": 1.29,
    "kwh_today": 1.84
  }
}
```

---

## 3. Data-Quality Governance

Every metric displayed on the dashboard must be tagged with its audit provenance:
- **`measured`**: Direct hardware physical measurement (INA219 current/power, LDR lux).
- **`estimated`**: Proxy or indirect physical measurement (HC-SR04 ultrasonic bin level, vernacular thermal models).
- **`manual`**: User-logged activity (commute kiosk button presses, fuel delivery receipts, manual mass weigh-ins).
- **`assumed`**: Default standard parameters (e.g., standard 12 km round-trip commute distance).

---

## 4. Development & Build Commands

```bash
cd frontend

# Run linting (0 warnings, 0 errors)
npm run lint

# Compile TypeScript and bundle production build
npm run build

# Start local development preview
npm run dev
```

