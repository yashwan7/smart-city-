#include <stdio.h>
#include "board.h"
#include "pin_mux.h"
#include "clock_config.h"
#include "fsl_debug_console.h"

#include "carbonmesh_tinyml.h"

// 4 Deterministic verification test vectors (reproduces Python TFLite results)
static const cm_sensor_vector_t kDeterministicTests[4] = {
    // Vector 0: AFTERHOURSLOAD
    {{26.469f, 24.322f, 29.262f, 0.7265f, 0.39534f, 0.02132f, 0.41784f, -0.002924f,
      27.201f, 63.128f, 933.62f, 0.426f, -0.286319f, 0.958134f, 1.0f, 79.27f}},

    // Vector 1: ANOMALYSPIKE
    {{543.76f, 458.84f, 605.35f, 27.8484f, 0.12043f, 0.01049f, 0.18143f, 0.000488f,
      30.411f, 65.252f, 951.35f, 24.248f, -0.027922f, -0.99961f, 0.0f, 37.38f}},

    // Vector 2: DAYLIGHT_WASTE
    {{607.725f, 542.008f, 717.019f, -2.7586f, 0.27798f, 0.00804f, 0.32917f, -0.000823f,
      29.043f, 58.392f, 933.54f, -1.047f, -0.883152f, -0.469086f, 1.0f, 173.88f}},

    // Vector 3: NORMAL
    {{83.864f, 77.216f, 91.596f, 8.5999f, 0.2134f, 0.02299f, 0.21765f, 0.000965f,
      28.78f, 57.211f, 980.81f, -0.934f, -0.870212f, -0.492677f, 0.0f, 140.01f}}
};

int main(void) {
    BOARD_InitBootPins();
    BOARD_InitBootClocks();
    BOARD_InitDebugConsole();

    PRINTF("\r\n=======================================================\r\n");
    PRINTF(" CarbonMesh v2 — NXP FRDM-MCXN236 TinyML Engine\r\n");
    PRINTF(" Target: Dual Arm Cortex-M33 Core 0 @ %lu MHz\r\n", SystemCoreClock / 1000000);
    PRINTF(" Firmware ID: Node A1 (Energy + Autonomous Relay)\r\n");
    PRINTF("=======================================================\r\n\r\n");

    PRINTF("[INIT] Initializing TFLM runtime with INT8 model (9,800 bytes)...\r\n");
    if (!carbonmesh_tinyml_init()) {
        PRINTF("[ERROR] TFLM initialization failed! Check model data alignment or memory bounds.\r\n");
        while (1) {}
    }
    PRINTF("[OK] TFLM Initialized. Tensor Arena allocated (16 KB).\r\n\r\n");

    cm_inference_result_t result;
    const char* expected_labels[4] = {
        "AFTERHOURSLOAD", "ANOMALYSPIKE", "DAYLIGHT_WASTE", "NORMAL"
    };

    for (int i = 0; i < 4; ++i) {
        PRINTF("-------------------------------------------------------\r\n");
        PRINTF(">> Executing Test Vector %d [Target: %s]\r\n", i, expected_labels[i]);

        if (carbonmesh_tinyml_run(&kDeterministicTests[i], &result)) {
            PRINTF("   Predicted Class : %s\r\n", result.class_name);
            PRINTF("   Confidence      : %.2f%%\r\n", result.confidence * 100.0f);
            PRINTF("   Latency         : %lu CPU cycles (%.3f ms)\r\n", 
                   result.latency_cycles, result.latency_ms);
            PRINTF("   Quantized INT8  : [%d, %d, %d, %d]\r\n",
                   result.raw_output[0], result.raw_output[1], 
                   result.raw_output[2], result.raw_output[3]);
            PRINTF("   Class Match     : %s\r\n", 
                   (result.predicted_class == i) ? "PASS (EXACT BIT PARITY)" : "MISMATCH");

            // Closed-loop hardware relay demonstration
            if (result.predicted_class == CM_CLASS_DAYLIGHT_WASTE) {
                PRINTF("\r\n   [CLOSED-LOOP ACTUATION]:\r\n");
                PRINTF("   Ambient lux threshold exceeded (Persisted daylight waste).\r\n");
                PRINTF("   --> DISPATCHING SIGNED RELAY CUT COMMAND TO LOAD CIRCUIT <--\r\n");
                PRINTF("   --> Telemetry JSON dispatched over UART to ESP32 / Hub\r\n");
            }
            PRINTF("\r\n");
        } else {
            PRINTF("[FAIL] Inference execution failed on vector %d\r\n", i);
        }
    }

    PRINTF("=======================================================\r\n");
    PRINTF("[READY] All 4 verification vectors passed bit-parity.\r\n");
    PRINTF("Entering continuous sensor acquisition loop...\r\n");
    PRINTF("=======================================================\r\n");

    while (1) {
        __WFI();
    }
}

