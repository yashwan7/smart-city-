#include "tinyml_decision.h"
#include <math.h>
#include <string.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

void feature_window_init(feature_window_t *fw) {
    if (!fw) return;
    memset(fw, 0, sizeof(feature_window_t));
    fw->current_relay = 1; // Default startup relay state is ON
}

void feature_window_push(
    feature_window_t *fw,
    float lux,
    float current_a,
    float temp_c,
    float rh_pct,
    int32_t aq_raw,
    uint32_t timestamp,
    uint8_t relay
) {
    if (!fw) return;

    if (relay != fw->current_relay) {
        fw->current_relay = relay;
        fw->last_relay_change_ts = timestamp;
    }

    size_t idx = fw->index;
    fw->lux[idx] = lux;
    fw->current_a[idx] = current_a;
    fw->temp_c[idx] = temp_c;
    fw->rh_pct[idx] = rh_pct;
    fw->aq_raw[idx] = aq_raw;
    fw->timestamps[idx] = timestamp;

    fw->index = (idx + 1) % WINDOW_SIZE;
    if (fw->count < WINDOW_SIZE) {
        fw->count++;
    }
}

static float calc_mean(const float *arr, size_t n) {
    if (n == 0) return 0.0f;
    float sum = 0.0f;
    for (size_t i = 0; i < n; ++i) sum += arr[i];
    return sum / (float)n;
}

static float calc_min(const float *arr, size_t n) {
    if (n == 0) return 0.0f;
    float min_val = arr[0];
    for (size_t i = 1; i < n; ++i) {
        if (arr[i] < min_val) min_val = arr[i];
    }
    return min_val;
}

static float calc_max(const float *arr, size_t n) {
    if (n == 0) return 0.0f;
    float max_val = arr[0];
    for (size_t i = 1; i < n; ++i) {
        if (arr[i] > max_val) max_val = arr[i];
    }
    return max_val;
}

static float calc_std(const float *arr, size_t n, float mean) {
    if (n <= 1) return 0.0f;
    float sum_sq = 0.0f;
    for (size_t i = 0; i < n; ++i) {
        float diff = arr[i] - mean;
        sum_sq += diff * diff;
    }
    return sqrtf(sum_sq / (float)n);
}

static float calc_slope(const float *y, const uint32_t *t, size_t n) {
    if (n <= 1) return 0.0f;
    float sum_t = 0.0f, sum_y = 0.0f, sum_ty = 0.0f, sum_t2 = 0.0f;
    uint32_t t0 = t[0];

    for (size_t i = 0; i < n; ++i) {
        float dt = (float)(t[i] - t0);
        sum_t += dt;
        sum_y += y[i];
        sum_ty += dt * y[i];
        sum_t2 += dt * dt;
    }

    float denom = ((float)n * sum_t2) - (sum_t * sum_t);
    if (fabsf(denom) < 1e-5f) return 0.0f;
    return (((float)n * sum_ty) - (sum_t * sum_y)) / denom;
}

void extract_16_features(
    const feature_window_t *fw,
    uint32_t current_time,
    float out[FEATURE_COUNT]
) {
    size_t n = fw->count;
    if (n == 0) {
        memset(out, 0, FEATURE_COUNT * sizeof(float));
        return;
    }

    // Convert raw AQ to float for statistics
    float aq_f[WINDOW_SIZE];
    for (size_t i = 0; i < n; ++i) {
        aq_f[i] = (float)fw->aq_raw[i];
    }

    // 1-4: Lux statistics
    float lux_mean = calc_mean(fw->lux, n);
    out[0] = lux_mean;
    out[1] = calc_min(fw->lux, n);
    out[2] = calc_max(fw->lux, n);
    out[3] = calc_slope(fw->lux, fw->timestamps, n);

    // 5-8: Current statistics
    float cur_mean = calc_mean(fw->current_a, n);
    out[4] = cur_mean;
    out[5] = calc_std(fw->current_a, n, cur_mean);
    out[6] = calc_max(fw->current_a, n);
    out[7] = calc_slope(fw->current_a, fw->timestamps, n);

    // 9-10: Environmental means
    out[8] = calc_mean(fw->temp_c, n);
    out[9] = calc_mean(fw->rh_pct, n);

    // 11-12: Air quality
    out[10] = calc_mean(aq_f, n);
    out[11] = calc_slope(aq_f, fw->timestamps, n);

    // 13-14: Hour cyclical features (sine & cosine of 24h clock)
    uint32_t seconds_in_day = current_time % 86400;
    float hour_val = (float)seconds_in_day / 3600.0f;
    float hour_rad = (hour_val / 24.0f) * 2.0f * (float)M_PI;
    out[12] = sinf(hour_rad);
    out[13] = cosf(hour_rad);

    // 15: Relay state (1.0 = ON, 0.0 = OFF)
    out[14] = (float)fw->current_relay;

    // 16: Time since last relay change (seconds)
    uint32_t dt_relay = (current_time >= fw->last_relay_change_ts) ?
                        (current_time - fw->last_relay_change_ts) : 0;
    out[15] = (float)dt_relay;
}

carbonmesh_state_t classify_rule_fallback(
    const float f[FEATURE_COUNT],
    float *out_confidence
) {
    float lux_mean = f[0];
    float cur_mean = f[4];
    float cur_std = f[5];
    float relay = f[14];

    // Default high confidence
    *out_confidence = 0.95f;

    // 1. ANOMALY_SPIKE: Current standard deviation or surge far above normal
    if (cur_std > 2.0f || cur_mean > 12.0f) {
        *out_confidence = 0.98f;
        return STATE_ANOMALYSPIKE;
    }

    // 2. DAYLIGHT_WASTE: Relay is active while ambient natural lux is high (> 600 lux)
    if (relay > 0.5f && lux_mean > 600.0f && cur_mean > 0.2f) {
        *out_confidence = 0.94f;
        return STATE_DAYLIGHT_WASTE;
    }

    // 3. AFTERHOURSLOAD: Relay active during night hours (e.g. 23:00 to 05:00)
    // hour_cos is negative between 06:00 and 18:00, positive around midnight
    float hour_cos = f[13];
    if (relay > 0.5f && hour_cos > 0.707f && cur_mean > 0.5f) {
        *out_confidence = 0.91f;
        return STATE_AFTERHOURSLOAD;
    }

    return STATE_NORMAL;
}

relay_decision_action_t update_relay_state_machine(
    feature_window_t *fw,
    carbonmesh_state_t state,
    float lux,
    uint32_t elapsed_s
) {
    if (!fw) return RELAY_ACTION_NONE;

    if (state == STATE_DAYLIGHT_WASTE) {
        fw->daylight_waste_duration_s += elapsed_s;
        fw->low_light_restore_duration_s = 0;

        // Requirement: 20 seconds of sustained daylight waste trips relay OFF
        if (fw->daylight_waste_duration_s >= 20 && fw->current_relay == 1) {
            fw->current_relay = 0;
            fw->daylight_waste_duration_s = 0;
            return RELAY_ACTION_TRIP_OFF_WASTE;
        }
    } else if (fw->current_relay == 0 && lux < 250.0f) {
        fw->low_light_restore_duration_s += elapsed_s;
        fw->daylight_waste_duration_s = 0;

        // Requirement: 30 seconds of sustained low light restores relay ON
        if (fw->low_light_restore_duration_s >= 30) {
            fw->current_relay = 1;
            fw->low_light_restore_duration_s = 0;
            return RELAY_ACTION_RESTORE_ON_LOW_LIGHT;
        }
    } else {
        fw->daylight_waste_duration_s = 0;
        fw->low_light_restore_duration_s = 0;
    }

    return RELAY_ACTION_NONE;
}

const char* state_to_string(carbonmesh_state_t state) {
    switch (state) {
        case STATE_NORMAL: return "NORMAL";
        case STATE_DAYLIGHT_WASTE: return "DAYLIGHT_WASTE";
        case STATE_AFTERHOURSLOAD: return "AFTERHOURSLOAD";
        case STATE_ANOMALYSPIKE: return "ANOMALYSPIKE";
        default: return "UNKNOWN";
    }
}
