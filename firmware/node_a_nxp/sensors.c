#include "sensors.h"
#include <math.h>
#include <stdio.h>
#include <string.h>

void energy_meter_init(energy_meter_t *em) {
    if (!em) return;
    em->zero_current_offset_v = 1.65f; // Midpoint for 3.3V ADC with 1:1 or 2.5V with divider
    em->sensitivity_v_a = ACS712_SENSITIVITY_V_A;
    em->nominal_voltage_v = NOMINAL_VOLTAGE_V;
    em->power_factor = ASSUMED_POWER_FACTOR;
    em->noise_floor_a = CURRENT_NOISE_FLOOR_A;
    em->cumulative_kwh = 0.0f;
    em->last_sample_ts = 0;
    em->is_calibrated = false;
}

void energy_meter_calibrate_zero(energy_meter_t *em, const float *adc_samples, size_t sample_count) {
    if (!em || !adc_samples || sample_count == 0) return;
    float sum = 0.0f;
    for (size_t i = 0; i < sample_count; ++i) {
        sum += adc_samples[i];
    }
    em->zero_current_offset_v = sum / (float)sample_count;
    em->is_calibrated = true;
}

float energy_meter_calculate_rms_current(const energy_meter_t *em, const float *voltage_samples, size_t sample_count) {
    if (!em || !voltage_samples || sample_count == 0 || em->sensitivity_v_a <= 0.0f) {
        return 0.0f;
    }

    float sum_sq = 0.0f;
    float v_zero = em->zero_current_offset_v;
    float inv_sens = 1.0f / em->sensitivity_v_a;

    for (size_t i = 0; i < sample_count; ++i) {
        float inst_voltage_diff = voltage_samples[i] - v_zero;
        float inst_current = inst_voltage_diff * inv_sens;
        sum_sq += inst_current * inst_current;
    }

    float rms = sqrtf(sum_sq / (float)sample_count);

    // Gated noise floor to eliminate ADC jitter below 50mA
    if (rms < em->noise_floor_a) {
        return 0.0f;
    }
    return rms;
}

float energy_meter_update_energy(energy_meter_t *em, float current_rms, float dt_seconds) {
    if (!em || dt_seconds <= 0.0f) return 0.0f;

    // Active power P = V * I * PF
    float active_power_w = em->nominal_voltage_v * current_rms * em->power_factor;

    // Integrate to kWh: P(W) * dt(s) / (3600 * 1000)
    float kwh_increment = (active_power_w * dt_seconds) / 3600000.0f;
    em->cumulative_kwh += kwh_increment;

    return active_power_w;
}

int format_node_a_uart_frame(const NodeAPayload *p, char *out_buffer, size_t max_len) {
    if (!p || !out_buffer || max_len == 0) return -1;

    // Compact JSON followed by newline delimiter \n
    return snprintf(
        out_buffer,
        max_len,
        "{\"lux\":%.1f,\"temp\":%.1f,\"rh\":%.1f,\"aq\":%d,\"i\":%.2f,\"p\":%.1f,\"kwh\":%.4f,\"relay\":%u,\"st\":\"%s\",\"conf\":%.2f}\n",
        p->lux,
        p->temp,
        p->rh,
        (int)p->aq,
        p->i,
        p->p,
        p->kwh,
        (unsigned int)p->relay,
        p->st,
        p->conf
    );
}
