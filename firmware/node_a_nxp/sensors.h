#ifndef CARBONMESH_SENSORS_H
#define CARBONMESH_SENSORS_H

#include <stdint.h>
#include <stdbool.h>
#include "../common/config.h"
#include "../common/packet.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    float zero_current_offset_v; // Calibrated 0A voltage offset
    float sensitivity_v_a;       // 0.185 for 5A ACS712 module
    float nominal_voltage_v;     // 230.0 V
    float power_factor;          // 0.92
    float noise_floor_a;         // 0.05 A
    float cumulative_kwh;        // Integrated energy
    uint32_t last_sample_ts;     // Timestamp of last integration
    bool is_calibrated;
} energy_meter_t;

void energy_meter_init(energy_meter_t *em);

/*
 * Calibrates sensor zero offset over ~2 seconds with relay open
 */
void energy_meter_calibrate_zero(energy_meter_t *em, const float *adc_samples, size_t sample_count);

/*
 * Calculates RMS current from fast AC cycle sampling
 */
float energy_meter_calculate_rms_current(const energy_meter_t *em, const float *voltage_samples, size_t sample_count);

/*
 * Computes active power and integrates energy over elapsed seconds
 */
float energy_meter_update_energy(energy_meter_t *em, float current_rms, float dt_seconds);

/*
 * Formats Node A sensor readings into newline-delimited JSON UART frame for ESP32 bridge
 */
int format_node_a_uart_frame(const NodeAPayload *payload, char *out_buffer, size_t max_len);

#ifdef __cplusplus
}
#endif

#endif // CARBONMESH_SENSORS_H
