# CarbonMesh Architecture & Engineering Specification

**Hack Fest 2026 Season 1**  
**Institution:** Sai Vidya Institute of Technology, Bengaluru  
**Track:** Green Tech & Sustainability  
**Problem Statement:** Carbon Footprint Tracking and Reduction Platform  
**Team:** Izanagi (T3-11)  
**Lead / Person C (Frontend & Product):** Yashwanth  
**Person A (Hardware & Firmware):** Sai  
**Person B (Hub & Backend Data):** Medha  

---

## 1. Executive Summary

CarbonMesh is an **offline-first, tamper-evident carbon accounting and automated reduction platform**. Unlike conventional enterprise carbon software that relies on delayed manual utility bill uploads or cloud-tethered dashboards, CarbonMesh captures physical activity data at the physical edge, signs it using per-device hardware secrets (HMAC-SHA256), anchors readings into a cryptographic hash-chained ledger, and executes closed-loop automated curtailment via an edge load relay when daylight waste is detected.

All emissions calculations are deterministic and strictly tied to cited, peer-reviewed statutory emission factors (`data/factors.yaml`), adhering strictly to the **GHG Protocol Corporate Accounting and Reporting Standard**.

---

## 2. Hardware Topology & Sensor Mapping

```
+---------------------------------------------------------------------------------+
|                                    CARBONMESH                                   |
+---------------------------------------------------------------------------------+
                                      |
         +----------------------------+---------------------------+
         |                                                        |
         v                                                        v
+-------------------------------+                       +-------------------------------+
|       NODE A1 (Energy)        |                       |       NODE B1 (Waste)         |
|-------------------------------|                       |-------------------------------|
| Microcontrollers:             |                       | Microcontroller:              |
|  - NXP FRDM-MCXN236           |                       |  - ESP32 #2                   |
|    (Dual Cortex-M33 @150MHz)  |                       |                               |
|  - ESP32 #1 (WiFi Bridge)     |                       | Peripherals:                  |
|                               |                       |  - HC-SR04 Ultrasonic (Fill)  |
| Peripherals:                  |                       |  - Capacitive Soil Moisture   |
|  - LDR Photodiode (ADC0_CH1)  |                       |  - Raindrop Sensor            |
|  - MQ-135 Gas / Air Quality   |                       |  - 5V Submersible Pump Relay  |
|  - INA219 Current / Power     |                       |  - 0.96" I2C SSD1306 OLED     |
|  - 10A Solid-State Relay Load |                       |  - Hardware Buzzer            |
|  - 4x Commute Kiosk Buttons   |                       |                               |
|  - 1.8" SPI ST7735 TFT Meter  |                       | Network:                      |
|                               |                       |  - WiFi HMAC Telemetry        |
| Communication:                |                       +-------------------------------+
|  - NXP to ESP32: UART 115200  |                                       |
|  - ESP32 to Hub: WiFi / HTTP  |                                       |
+-------------------------------+                                       |
         |                                                              |
         +----------------------------+---------------------------------+
                                      | POST /api/ingest (Signed HMAC-SHA256)
                                      v
                        +-------------------------------+
                        |       CENTRAL HUB & GATEWAY   |
                        |-------------------------------|
                        | Hardware:                     |
                        |  - Arduino UNO Q (Linux OS)   |
                        | Stack:                        |
                        |  - Python 3.11, FastAPI       |
                        |  - SQLite in WAL Mode         |
                        |  - Cryptographic Hash Ledger  |
                        |  - Local Ollama SLM (RAG)     |
                        |  - Static File Server         |
                        +-------------------------------+
                                      |
                        +-------------+-------------+
                        |                           |
                        v                           v
         +------------------------------+   +------------------------------+
         |     OFFLINE DASHBOARD UI     |   |      ESP32 #1 TFT METER      |
         |------------------------------|   |------------------------------|
         |  - React 19 + Tailwind CSS   |   |  - Real-time Carbon Gauge    |
         |  - Zero remote CDN calls     |   |  - Hourly kWh and kg CO2e    |
         |  - Data-Quality Indicators   |   |  - Threshold Buzzer Alarm    |
         |  - Before/After Closed Loop  |   +------------------------------+
         |  - Cryptographic Audit View  |
         +------------------------------+
```

---

## 3. GHG Protocol Scope Mapping & Emission Factors

Carbon emissions are calculated strictly from authoritative benchmarks documented in `data/factors.yaml`:

| Activity | Scope | Hardware / Source | Factor Value | Statutory Citation | Tier |
|:---|:---:|:---|:---|:---|:---:|
| **Grid Electricity** | Scope 2 | Node A1 INA219 | `0.716 kg CO2e / kWh` | CEA Baseline Database v19.0 (Southern Grid) | `measured` |
| **Diesel Generator** | Scope 1 | Fuel Kiosk Entry | `2.687 kg CO2e / Litre` | IPCC 2006 & UK DEFRA 2024 Conversion Factors | `manual` |
| **Petrol / Gasoline** | Scope 1 | Fuel Kiosk Entry | `2.314 kg CO2e / Litre` | UK DEFRA 2024 Government GHG Factors | `manual` |
| **Car Commute** | Scope 3 | Node A1 Kiosk Button | `0.174 kg CO2e / pass-km` | TERI India & DEFRA 2024 Passenger Transport | `manual` |
| **Two-Wheeler** | Scope 3 | Node A1 Kiosk Button | `0.052 kg CO2e / pass-km` | ARAI / CPCB India Vehicular Database 2024 | `manual` |
| **BMTC City Bus** | Scope 3 | Node A1 Kiosk Button | `0.048 kg CO2e / pass-km` | BMTC Bengaluru Fleet Emissions & TERI Model | `manual` |
| **Active Commute** | Scope 3 | Node A1 Kiosk Button | `0.000 kg CO2e / pass-km` | GHG Protocol Scope 3 Cat 7 Standard | `manual` |
| **Landfill Waste** | Scope 3 | Node B1 Ultrasonic | `0.520 kg CO2e / kg waste` | MoEFCC India Municipal Solid Waste Model | `estimated` |

---

## 4. Cryptographic Ledger & Tamper Evidence

Every sensor reading is signed at the hardware node using HMAC-SHA256 with a unique hardware key:
$$\text{Signature} = \text{HMAC-SHA256}(K_{\text{node}}, \text{NodeID} \parallel \text{Seq} \parallel \text{Timestamp} \parallel \text{Body})$$

On the Hub, readings are committed sequentially into an SQLite database operating in Write-Ahead Logging (WAL) mode:
$$\text{Hash}_n = \text{SHA-256}(\text{Hash}_{n-1} \parallel \text{ID}_n \parallel \text{Timestamp}_n \parallel \text{Signature}_n \parallel \text{Payload}_n)$$

### Live Tamper Demonstration
If an unauthorized actor alters a stored database record (e.g., modifying historical energy consumption from 120 kWh to 20 kWh):
1. `GET /api/ledger/verify` traverses all records in $O(N)$ sequential order, recomputing hashes.
2. The discrepancy between the stored hash and recomputed hash triggers an immediate red flag.
3. The dashboard and hardware buzzer alert the operator with the exact tampered Record ID.

---

## 5. Closed-Loop Optimization & Load Curtailment

The NXP FRDM-MCXN236 edge controller samples ambient lux via an onboard LDR photodiode:
1. **Trigger Condition:** Ambient lux $> 400$ lumens continuously for 20 seconds (`DAYLIGHT_WASTE` state).
2. **Action:** Node A1 trips the load relay, de-energizing non-essential lighting or auxiliary circuits.
3. **Restoration:** When ambient lux drops below threshold for 30 seconds, power is restored.
4. **Empirical Measurement:**
   - Baseline Load: **96.8 W**
   - Optimized Load: **42.1 W**
   - Instantaneous Curtailment: **-54.7 W (56.5% reduction)**
   - Daily Avoidance (8h operation): **0.438 kWh / 0.314 kg CO2e**

---

## 6. Offline Resilience Guarantees

1. **No External CDN:** The React dashboard bundles all fonts, icons (Lucide React), and scripts locally.
2. **Zero Cloud Telemetry:** Operates within a standalone local area network on the Arduino UNO Q hub hotspot.
3. **Local Intelligence:** Ollama SLM runs on-premises on the hub to provide verified natural-language advice with deterministic number verification.
4. **Vercel Mirror:** Provides standalone serverless handlers in `dashboard/api/` for remote demonstrations when the physical hub is powered down.

---

## 7. Known Engineering Limitations

- **Commute Distance Assumptions:** Kiosk button presses log emissions based on an assumed standard round-trip commute distance (12 km).
- **Waste Volumetric Estimation:** Bin fill percentage is measured via ultrasonic time-of-flight; waste density is estimated using the municipal standard of 0.2 kg/L.
- **Relay Cycle Durability:** High-frequency switching is prevented via a 20-second hysteresis debounce filter.

