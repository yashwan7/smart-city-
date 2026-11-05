#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>

#include "../common/config.h"
#include "../common/packet.h"
#include "sensors.h"
#include "tinyml_decision.h"
#include "model_data.h"

// Simulated hardware tick and state
static energy_meter_t g_energy_meter;
static feature_window_t g_feature_window;
static NodeAPayload g_latest_payload;

void nxp_hardware_init(void) {
    // 1. Initialize Energy Meter & Feature Window
    energy_meter_init(&g_energy_meter);
    feature_window_init(&g_feature_window);

    // 2. Initial 2-second Zero Current Calibration with Relay OPEN
    float zero_calibration_samples[200];
    for (int i = 0; i < 200; ++i) {
        // Typical quiescent voltage for ACS712 at 3.3V ADC with resistor divider = 1.65V
        zero_calibration_samples[i] = 1.650f + ((float)(i % 5 - 2) * 0.001f);
    }
    energy_meter_calibrate_zero(&g_energy_meter, zero_calibration_samples, 200);

    // 3. Set default payload state
    memset(&g_latest_payload, 0, sizeof(NodeAPayload));
    g_latest_payload.relay = 1; // Default power ON
    strcpy(g_latest_payload.st, "NORMAL");
    g_latest_payload.conf = 0.95f;
}

void nxp_process_step(
    float raw_lux,
    float raw_temp,
    float raw_rh,
    int32_t raw_aq,
    const float *current_waveform_samples,
    size_t waveform_sample_count,
    uint32_t current_time_s,
    float dt_s,
    char *out_uart_frame,
    size_t out_uart_max_len
) {
    // 1. Compute RMS current from fast AC cycle sampling
    float current_rms = energy_meter_calculate_rms_current(
        &g_energy_meter,
        current_waveform_samples,
        waveform_sample_count
    );

    // 2. Active power & energy integration
    float active_power_w = energy_meter_update_energy(&g_energy_meter, current_rms, dt_s);

    // 3. Push telemetry to 16-feature rolling window
    feature_window_push(
        &g_feature_window,
        raw_lux,
        current_rms,
        raw_temp,
        raw_rh,
        raw_aq,
        current_time_s,
        g_latest_payload.relay
    );

    // 4. Extract 16 features
    float features[FEATURE_COUNT];
    extract_16_features(&g_feature_window, current_time_s, features);

    // 5. TinyML State Classification
    float confidence = 0.95f;
    carbonmesh_state_t predicted_state = classify_rule_fallback(features, &confidence);
    const char *state_str = state_to_string(predicted_state);

    // 6. Local Closed-Loop Relay State Machine
    relay_decision_action_t action = update_relay_state_machine(
        &g_feature_window,
        predicted_state,
        raw_lux,
        (uint32_t)dt_s
    );

    if (action == RELAY_ACTION_TRIP_OFF_WASTE) {
        g_latest_payload.relay = 0;
    } else if (action == RELAY_ACTION_RESTORE_ON_LOW_LIGHT) {
        g_latest_payload.relay = 1;
    }

    // 7. Update latest payload
    g_latest_payload.lux = raw_lux;
    g_latest_payload.temp = raw_temp;
    g_latest_payload.rh = raw_rh;
    g_latest_payload.aq = raw_aq;
    g_latest_payload.i = current_rms;
    g_latest_payload.p = active_power_w;
    g_latest_payload.kwh = g_energy_meter.cumulative_kwh;
    strcpy(g_latest_payload.st, state_str);
    g_latest_payload.conf = confidence;

    // 8. Format newline-delimited JSON UART frame to ESP32 #1
    format_node_a_uart_frame(&g_latest_payload, out_uart_frame, out_uart_max_len);
}
