# CarbonMesh v2 — NXP FRDM-MCXN236 Firmware Guide

This directory houses the bare-metal C/C++ firmware integrating the **TensorFlow Lite for Microcontrollers (TFLM)** edge classifier on the **NXP FRDM-MCXN236** (Dual Arm Cortex-M33).

---

## 1. Hardware Connections

1. Connect the board via a USB Type-C cable to the **MCU-Link Debug Port (`J17`)**.
2. Verify on macOS that the device enumerates:
   ```bash
   ls -l /dev/cu.usbmodem*
   # Outputs: /dev/cu.usbmodemFIK54L1PUAFFP3
   ```
3. Peripheral Wiring (Node A1):
   - **INA219 Current / Power Sensor**: I2C `SDA` / `SCL` to `PIO4_0` / `PIO4_1`.
   - **LDR Photodiode**: ADC input to `ADC0_CH1` (`PIO0_14`).
   - **MQ-135 Air Quality Sensor**: Analog input to `ADC0_CH2` (`PIO0_15`).
   - **Load Cut Relay**: Active-high GPIO output to relay driver (`PIO1_2`).
   - **UART Bridge to ESP32 #1**: TX (`PIO1_8`), RX (`PIO1_9`) @ 115200 baud.

---

## 2. Source Files

| File | Role |
|---|---|
| `model_data.h` / `model_data.c` | INT8 FlatBuffer model embedded as 16-byte aligned C byte array (9,800 bytes). |
| `carbonmesh_tinyml.h` | Public C API for model initialization, normalization, and inference. |
| `carbonmesh_tinyml.cpp` | C++ implementation configuring TFLM `MicroMutableOpResolver<2>` and DWT hardware cycle timing. |
| `main.cpp` | Board initialization, 4 deterministic verification tests, and UART output. |

---

## 3. Building & Flashing via MCUXpresso IDE

1. Launch `/Applications/MCUXpressoIDE_25.6.136`.
2. Open workspace: `/Users/yashwanth/Documents/MCUXpressoIDE_25.6.136/workspace`.
3. Import or copy `MCXN236_Project` and add the files from this directory to `source/`.
4. Ensure eIQ / TFLM middleware is included in the build paths.
5. Click **Build** (Hammer icon).
6. Click **Debug** (Bug icon) or use **GUI Flash Tool** $\rightarrow$ select **MCU-Link CMSIS-DAP**.
7. Open a serial monitor:
   ```bash
   picocom -b 115200 /dev/cu.usbmodemFIK54L1PUAFFP3
   ```

