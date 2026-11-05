# CarbonMesh v2: Embedded Firmware & Edge AI

This directory contains the embedded firmware, cryptographic signing modules, TinyML edge models, and host simulator for the CarbonMesh v2 offline-first carbon tracking platform.

---

## 1. System Architecture

```text
+-----------------------------------------------------------------------------------+
|                                      NODE A                                       |
|  [NXP FRDM-MCXN236 (Cortex-M33)]                [ESP32 #1: Bridge & Kiosk]        |
|  - LDR / DHT11 / MQ-135 Sensing                  - UART2 Ingress (115200 baud)     |
|  - ACS712 Current (Fast RMS, Zero Calib)         - ST7735 1.8" Color SPI TFT       |
|  - 16-Feature Rolling Window Extractor           - 6-Button Kiosk (Debounced)      |
|  - INT8 TinyML Classifier & Relay Closed-Loop    - HMAC-SHA256 Wire Signing        |
|  - Active-LOW Controlled Relay Load              - 200-Packet RAM Ring Buffer      |
|                                                  - Wi-Fi HTTP Client               |
+-----------------------------------------------------------------------------------+
                                            |
                                            | (Wi-Fi POST /api/ingest)
                                            v
+-----------------------------------------------------------------------------------+
|                        OFFLINE CAMPUS EDGE HUB (FastAPI)                          |
|  - Replay Attack Rejection (seq > last_seq)                                       |
|  - HMAC Signature Verification & Tamper-Evident Ledger                            |
|  - Emission Calculations & Comparative Baseline vs Optimized Runs                 |
+-----------------------------------------------------------------------------------+
                                            ^
                                            | (Wi-Fi POST /api/ingest)
+-----------------------------------------------------------------------------------+
|                                      NODE B                                       |
|  [ESP32 #2: Samputa Carbon Bank]                                                 |
|  - HC-SR04 Ultrasonic (9-sample median filter) -> Fill % & Mass Estimate          |
|  - Rain Detector (ADC < 2200 -> Immediate Emergency Lid Relay Closure)            |
|  - Soil Moisture Sensor (Compost quality monitoring)                              |
|  - Motorized Lid Relay & Buzzer Feedback                                          |
|  - SSD1306 128x64 I2C OLED                                                        |
|  - Cryptographic HMAC-SHA256 Signing & Offline Ring Buffering                     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Hardware Pinout Reference

### Node A: ESP32 #1 (Bridge, Kiosk & TFT Display)
| Peripheral | Pin | Description / Configuration |
|---|---|---|
| **UART2 RX** | GPIO 16 | Connected to NXP TX (115200 baud, 8N1, 3.3V) |
| **UART2 TX** | GPIO 17 | Connected to NXP RX |
| **ST7735 SCK** | GPIO 18 | Hardware SPI Clock |
| **ST7735 MOSI**| GPIO 23 | Hardware SPI Master Out |
| **ST7735 CS**  | GPIO 5  | Chip Select |
| **ST7735 DC**  | GPIO 21 | Data / Command Control |
| **ST7735 RST** | GPIO 22 | Hardware Reset |
| **Button Walk**| GPIO 32 | Active LOW with internal pull-up (30 ms debounce) |
| **Button Bus** | GPIO 33 | Active LOW with internal pull-up |
| **Button Bike**| GPIO 25 | Active LOW with internal pull-up |
| **Button Car** | GPIO 26 | Active LOW with internal pull-up |
| **Button Matka** | GPIO 13 | Earthen cooling check-in (zero power) |
| **Button Handloom** | GPIO 14 | Sustainable craft / low carbon check-in |
| **Buzzer** | GPIO 27 | Audible feedback beep on valid click |

### Node A: NXP FRDM-MCXN236 (Sensing & TinyML)
| Sensor / Peripheral | Pin / Channel | Notes |
|---|---|---|
| **LDR (Light)** | ADC0_CH0 | Measures ambient daylight (lux) |
| **MQ-135 (Air Quality)** | ADC0_CH1 | Resistive divider to ensure $\le 3.3\text{ V}$ |
| **ACS712 (Current)** | ADC0_CH2 | Quiescent midpoint centered at $1.65\text{ V}$ |
| **DHT11 (Temp/RH)** | GPIO Port 1 Pin 12 | 4.7k pull-up resistor |
| **Relay Control** | GPIO Port 1 Pin 16 | Active LOW (Low = Relay Energized) |
| **SSD1306 OLED** | I2C1 (SDA: P1_8, SCL: P1_9) | I2C address 0x3C |
| **LPUART to ESP32** | LPUART2 (115200 baud) | Newline-delimited JSON framing |

### Node B: ESP32 #2 (Samputa Carbon Bank)
| Sensor / Peripheral | Pin | Notes |
|---|---|---|
| **Ultrasonic TRIG** | GPIO 5 | 10 $\mu$s trigger pulse |
| **Ultrasonic ECHO** | GPIO 18 | Resistive voltage divider ($5\text{ V} \to 3.3\text{ V}$) |
| **Soil Moisture** | GPIO 34 (ADC1_CH6) | Analog compost moisture |
| **Rain Detector** | GPIO 35 (ADC1_CH7) | Active LOW rain film ($\text{ADC} < 2200 \implies \text{Rain}$) |
| **Lid Motor Relay** | GPIO 26 | Active LOW relay controlling 12V motorized lid |
| **Buzzer** | GPIO 27 | Alert sound on rain closure & valid deposit |
| **SSD1306 OLED** | I2C (SDA: GPIO 21, SCL: GPIO 22) | Address 0x3C |

---

## 3. Cryptographic Packet Contract & Test Vector

Every telemetry packet sent from Node A or Node B is signed with **HMAC-SHA256**:

$$\text{Payload Wire Format}: \quad \{\text{"node"}: \dots,\; \text{"seq"}: \dots,\; \text{"ts"}: \dots,\; \text{"d"}: \{\dots\},\; \text{"sig"}: \dots\}$$

The canonical signing string is formed as:
$$\text{Canonical String} = \text{node} \,|\, \text{seq} \,|\, \text{ts} \,|\, \text{canonical\_json}(\text{d})$$
*(where `canonical_json(d)` has sorted keys and zero insignificant whitespace)*.

### Shared Canonical Test Vector (Verified with Backend)
* **Node**: `"node_a"`
* **Sequence**: `1`
* **Timestamp**: `1730100000`
* **Pre-shared Secret Key**: `"node_a_nxp_secret_key_8841"`
* **Raw Payload `d`**:
  ```json
  {"aq": 420, "conf": 0.95, "i": 2.45, "kwh": 0.12, "lux": 750, "p": 518.4, "relay": 1, "rh": 55.0, "st": "DAYLIGHT_WASTE", "temp": 26.5}
  ```
* **Canonical Message String**:
  ```text
  node_a|1|1730100000|{"aq":420,"conf":0.95,"i":2.45,"kwh":0.12,"lux":750,"p":518.4,"relay":1,"rh":55.0,"st":"DAYLIGHT_WASTE","temp":26.5}
  ```
* **Expected HMAC-SHA256 Hex Digest**:
  ```text
  884bf5632764b17467e745e6c5c8c71c6f3dffddce086798be688564499cc320
  ```

---

## 4. Edge TinyML Model Summary

* **Architecture**: Dense Fully-Connected Network: $16 \to 32 \to 16 \to 4$ with ReLU and Softmax.
* **Quantization**: Full INT8 post-training quantization (`TFLITE_BUILTINS_INT8`).
* **Model Size**: $5,048\text{ bytes}$ (exported directly into `firmware/node_a_nxp/model_data.h`).
* **Validation Accuracy**: $99.92\%$ across held-out independent sessions.
* **Local Closed-Loop Control Rule**:
  * If `DAYLIGHT_WASTE` persists for $\ge 20\text{ seconds}$, the NXP trips the relay **OFF**.
  * If ambient light drops below $250\text{ lux}$ for $\ge 30\text{ seconds}$, the relay is safely restored **ON**.

---

## 5. Build, Test & Simulation Guide

### Running Firmware Logic Tests
```powershell
pytest firmware/tests/test_firmware_logic.py -v
```

### Running the Entire CarbonMesh Test Suite (Backend + Firmware)
```powershell
pytest
```

### Running the Hardware-Independent Simulator
To verify end-to-end communication against a running Hub backend (`uvicorn hub.main:app --port 8000`):
```powershell
python firmware/simulator/run_simulator.py --hub http://127.0.0.1:8000
```
The simulator runs five sequential scenarios:
1. Normal telemetry generation.
2. Daylight waste detection & automatic closed-loop relay cutoff.
3. Kiosk button logging.
4. Samputa rain emergency closure.
5. Network outage simulation with 200-packet ring buffering and batch flush upon reconnection.

---

## 6. Testing & Implementation Status

| Component | Status | Test / Validation Details |
|---|---|---|
| **Canonical JSON & HMAC-SHA256** | **Compiled & Verified** | Verified via C (`crypto.c`), Python, and unit tests using canonical test vectors. |
| **TinyML Model ($16 \to 32 \to 16 \to 4$)** | **Trained & Quantized** | Session-split training completed, $5,048\text{ B}$ INT8 header generated in `model_data.h`. |
| **NXP Closed-Loop Relay Control** | **Compiled & Verified** | $20\text{ s}$ waste cutoff and $30\text{ s}$ restore state machines verified in unit tests. |
| **Samputa 9-Reading Median Filter** | **Compiled & Verified** | Verified in C and Python; filters acoustic anomalies cleanly. |
| **Rain Emergency Safety** | **Compiled & Verified** | Immediate motorized lid closure upon rain threshold interrupt verified. |
| **Offline RAM Ring Buffer (200 pkts)** | **Compiled & Verified** | Verified FIFO ordering, overflow preservation, and batch flush. |
| **Physical Hardware Flash** | **Ready for Flashing** | Ready to flash using Arduino IDE / ESP-IDF for ESP32 and MCUXpresso SDK for NXP. |
