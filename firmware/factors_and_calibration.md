# CarbonMesh v2: Calibration & Electrical Safety Guide

This document defines the calibration methodology, noise floor parameters, and safety protocols for the CarbonMesh v2 embedded hardware.

---

## 1. Electrical & Mains Safety Protocols

> **CRITICAL SAFETY DIRECTIVE:**
> Mains voltage (230 V AC RMS / 325 V Peak) is lethal. Never expose bare copper or open terminals during live testing.

1. **Demonstration & Bench Testing Alternative (Recommended)**:
   - For hackathon demonstrations, use an isolated **12 V DC power supply** with a 12 V automotive/halogen bulb (e.g., 21 W or 55 W) and an INA219 or ACS712 DC current sensor.
   - This eliminates all shock hazards while proving current sensing, RMS math, and relay tripping.
2. **If Mains AC Load is Used**:
   - All wiring must be housed inside an IP54 or higher flame-retardant enclosure.
   - Use certified terminal blocks with strain-relief glands.
   - Ensure a dedicated 6 A Residual Current Circuit Breaker (RCCB) / GFCI is connected upstream.
   - Keep AC mains high-voltage wiring physically isolated by at least 15 mm creepage/clearance from low-voltage logic (3.3 V / 5 V) on the NXP and ESP32 boards.

---

## 2. ACS712 Current Sensor Zero & RMS Calibration

The Allegro ACS712 is a Hall-effect linear current sensor with an output voltage centered around $V_{CC} / 2$ (nominally 2.5 V for 5 V supply; stepped down via a 2:3 resistive voltage divider to $\approx 1.65\text{ V}$ for 3.3 V ADCs).

### A. Zero-Current Calibration Procedure (Automatic at Boot)
1. Ensure the relay is **OPEN** (no load current passing through sensor).
2. On boot, the NXP microcontroller acquires 200 consecutive ADC samples over approximately 2.0 seconds.
3. Compute the arithmetic mean:
   $$V_{\text{zero}} = \frac{1}{N} \sum_{i=1}^{N} V_{\text{adc}}[i]$$
4. Store $V_{\text{zero}}$ as the dynamic quiescent reference for all subsequent measurements.

### B. Sensitivity Constants by Module Variant
| ACS712 Module Variant | Bidirectional Range | Raw Sensitivity ($S$) | Divided Sensitivity ($S_{3.3\text{V}}$) |
|---|---|---|---|
| **ACS712-05B** (Target) | $\pm 5\text{ A}$ | $185\text{ mV/A}$ | $122.1\text{ mV/A}$ |
| **ACS712-20A** | $\pm 20\text{ A}$ | $100\text{ mV/A}$ | $66.0\text{ mV/A}$ |
| **ACS712-30A** | $\pm 30\text{ A}$ | $66\text{ mV/A}$ | $43.5\text{ mV/A}$ |

### C. Fast RMS Sampling Math
To measure AC 50 Hz waveforms accurately, sample at $\ge 1.0\text{ kHz}$ (at least 20 samples per 20 ms AC cycle, captured across at least 5 complete cycles = 100 samples):
$$I_{\text{rms}} = \sqrt{\frac{1}{M} \sum_{k=1}^{M} \left(\frac{V_k - V_{\text{zero}}}{S}\right)^2}$$

### D. Documented Noise Floor Gating
Due to ambient electromagnetic noise and ADC quantization jitter, readings under zero current fluctuate within $\pm 35\text{ mA}$.
- **Configured Noise Floor Threshold**: $0.050\text{ A}$ ($50\text{ mA}$).
- Any calculated $I_{\text{rms}} < 0.05\text{ A}$ is explicitly set to $0.000\text{ A}$ to prevent ghost energy accumulation.

### E. Known-Load Verification Test
1. Connect a calibrated resistive load (e.g., standard 100 W incandescent bulb or 2000 W immersion heater).
2. Known nominal current for 100 W bulb at 230 V:
   $$I_{\text{expected}} = \frac{100\text{ W}}{230\text{ V}} \approx 0.435\text{ A}$$
3. Check Node A OLED and UART telemetry: verified reading should be within $0.435 \pm 0.04\text{ A}$.

---

## 3. Power & Energy Estimation Assumptions (Measurement Honesty)

* **Nominal Voltage Assumption**: $V_{\text{nominal}} = 230.0\text{ V}$ (Indian standard single-phase mains).
* **Assumed Power Factor**: $\text{PF} = 0.92$ (typical for mixed commercial/campus loads).
* **Active Power Formula**:
  $$P_{\text{active}} = V_{\text{nominal}} \times I_{\text{rms}} \times \text{PF} \quad [\text{Watts}]$$
* **Energy Integration**:
  $$\text{kWh} = \text{kWh}_{\text{prev}} + \frac{P_{\text{active}} \times \Delta t_{\text{seconds}}}{3\,600\,000}$$

> **Honest Scientific Statement**:
> CarbonMesh measures true AC RMS current directly. Because voltage waveforms and phase angles are assumed rather than measured with a dedicated dual-channel ADE7753/ADE7953 IC, power and energy are **engineering estimates** with an expected uncertainty of $\pm 8\%$. This is explicitly noted in our telemetry and UI quality badges.

---

## 4. Samputa Carbon Bank Calibration

### A. Ultrasonic Distance to Fill Percentage
The HC-SR04 ultrasonic sensor measures the air gap from the top lid down to the surface of deposited compost/waste.
* **$D_{\text{empty}}$ (Empty bin)**: $100.0\text{ cm}$
* **$D_{\text{full}}$ (Full bin limit)**: $15.0\text{ cm}$ (maintains 15 cm transducer dead-band)
* **Conversion Formula**:
  $$\text{Fill \%} = \text{clamp}\left(\frac{D_{\text{empty}} - D_{\text{measured}}}{D_{\text{empty}} - D_{\text{full}}} \times 100\%,\; 0\%,\; 100\%\right)$$

### B. Mass Estimation (Volume & Density)
* **Bin Usable Volume**: $0.075\text{ m}^3$ ($75\text{ Litres}$)
* **Assumed Organic Waste Bulk Density**: $650\text{ kg/m}^3$ ($0.65\text{ kg/L}$)
* **Mass Estimate**:
  $$\text{Estimated Mass (kg)} = \left(\frac{\text{Fill \%}}{100}\right) \times 75\text{ L} \times 0.65\text{ kg/L} = \text{Fill \%} \times 0.4875\text{ kg}$$

> **Honest Accounting Note**:
> Mass derived from ultrasonic distance is an estimate subject to void ratio and compaction. Official verified carbon credits require periodic certified weighing.

### C. Rain Sensor Calibration (Analog ADC)
The resistive rain sensor board exhibits high resistance when dry and low resistance when water bridges the traces:
* **Dry Baseline**: ADC reading $3500 - 4095$ (on 12-bit ESP32 ADC)
* **Moisture / Light Mist**: ADC reading $2400 - 3200$
* **Rain Trigger Threshold**: $\text{ADC} < 2200$
  * Crossing below $2200$ activates the immediate safety interrupt, energizing the lid relay to force immediate closure.

### D. Soil Moisture Calibration
* **Air (Bone Dry)**: $\text{ADC} \approx 3600 - 4095$
* **Ideal Aerobic Compost Moisture**: $\text{ADC} \approx 1800 - 2400$
* **Waterlogged / Saturated**: $\text{ADC} < 1400$
