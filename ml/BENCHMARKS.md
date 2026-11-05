# CarbonMesh v2 — Machine Learning & TinyML Benchmarks

This document records the empirical results, evaluation metrics, and resource footprints of the CarbonMesh edge neural network models.

---

## 1. Model Progression & Evolution

| Metric / Attribute | Baseline Float Model | Heavy Teacher Model | Edge Distilled INT8 Model |
|---|---|---|---|
| **Purpose** | Initial prototype | High-capacity knowledge source | **Microcontroller Production Deployment** |
| **Target Hardware** | Desktop / Server | Desktop / Cloud | **NXP FRDM-MCXN236 (Cortex-M33)** |
| **Parameters** | 12,852 | 111,556 | **~4,200** |
| **Flash / Disk Footprint** | 78,091 bytes (Float32) | 188,342 bytes (Float32) | **9,800 bytes (INT8 Quantized)** |
| **Quantization** | None (Float32) | None (Float32) | **Full INT8 (Input, Weights, Activations, Output)** |
| **Test Accuracy** | 94.48% | 95.28% | **94.80% (Zero Quantization Degradation!)** |
| **RAM / Arena Requirement**| >64 KB | >250 KB (Exceeds MCX SRAM) | **16 KB (Fits easily in 256 KB SRAM)** |
| **On-Chip Inference Latency**| ~18.5 ms | N/A (Does not fit in RAM) | **< 3.2 ms @ 150 MHz Core Clock** |

---

## 2. INT8 Quantization Specification

- **Input Tensor**: `[1, 16]` (`int8_t`)
  - Scale: `0.050998155027627945`
  - Zero Point: `4`
- **Output Tensor**: `[1, 4]` (`int8_t`)
  - Scale: `0.00390625` ($1/256$)
  - Zero Point: `-128`
- **Operators Used**:
  - `FULLY_CONNECTED` (Dense layer with bias addition and fused ReLU)
  - `SOFTMAX` (4-class probability distribution)
- **TFLM Op Resolver**: `tflite::MicroMutableOpResolver<2>`

---

## 3. Held-Out Test Confusion Matrix (INT8 Quantized Model)

Evaluated on $N = 1,250$ session-isolated test rows (zero session overlap):

```
                Predicted
                AFTERHOURSLOAD  ANOMALYSPIKE  DAYLIGHT_WASTE  NORMAL
Actual
AFTERHOURSLOAD       175              0              0           0      (100.0% Recall)
ANOMALYSPIKE           1            104              2           3      (94.5% Recall)
DAYLIGHT_WASTE         0              0            193          26      (88.1% Recall)
NORMAL                 5              0             28         713      (95.6% Recall)
```

### Detailed Per-Class Classification Report:
```
                precision    recall  f1-score   support

AFTERHOURSLOAD       0.97      1.00      0.98       175
  ANOMALYSPIKE       1.00      0.95      0.97       110
DAYLIGHT_WASTE       0.87      0.88      0.87       219
        NORMAL       0.96      0.96      0.96       746

      accuracy                           0.95      1250
     macro avg       0.95      0.95      0.95      1250
  weighted avg       0.95      0.95      0.95      1250
```

---

## 4. Hardware Verification Test Vectors

To verify bit-for-bit parity between desktop Python and the physical NXP Cortex-M33 firmware, run:
```bash
python ml/verify_tinyml_parity.py
```

All 4 test vectors reproduce matching quantized activations and identical class classifications.

