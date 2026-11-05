#ifndef CARBONMESH_TINYML_DECISION_H
#define CARBONMESH_TINYML_DECISION_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define FEATURE_COUNT 16
#define WINDOW_SIZE   10

typedef enum {
    STATE_NORMAL = 0,
    STATE_DAYLIGHT_WASTE = 1,
    STATE_AFTERHOURSLOAD = 2,
    STATE_ANOMALYSPIKE = 3
} carbonmesh_state_t;

typedef struct {
    float lux[WINDOW_SIZE];
    float current_a[WINDOW_SIZE];
    float temp_c[WINDOW_SIZE];
    float rh_pct[WINDOW_SIZE];
    int32_t aq_raw[WINDOW_SIZE];
    uint32_t timestamps[WINDOW_SIZE];
    size_t count;
    size_t index;

    // Relay state tracking
    uint8_t current_relay;
    uint32_t last_relay_change_ts;

    // Waste / restore persistence counters
    uint32_t daylight_waste_duration_s;
    uint32_t low_light_restore_duration_s;
} feature_window_t;

void feature_window_init(feature_window_t *fw);

void feature_window_push(
    feature_window_t *fw,
    float lux,
    float current_a,
    float temp_c,
    float rh_pct,
    int32_t aq_raw,
    uint32_t timestamp,
    uint8_t relay
);

void extract_16_features(
    const feature_window_t *fw,
    uint32_t current_time,
    float out_features[FEATURE_COUNT]
);

/*
 * Fallback deterministic rule classifier when TinyML tensor runtime is offline
 */
carbonmesh_state_t classify_rule_fallback(
    const float features[FEATURE_COUNT],
    float *out_confidence
);

/*
 * State machine for local closed-loop relay intervention:
 * - Turns relay OFF if DAYLIGHT_WASTE persists for >= 20 seconds.
 * - Turns relay ON if low-light condition persists for >= 30 seconds.
 */
typedef enum {
    RELAY_ACTION_NONE = 0,
    RELAY_ACTION_TRIP_OFF_WASTE = 1,
    RELAY_ACTION_RESTORE_ON_LOW_LIGHT = 2
} relay_decision_action_t;

relay_decision_action_t update_relay_state_machine(
    feature_window_t *fw,
    carbonmesh_state_t state,
    float lux,
    uint32_t elapsed_s
);

const char* state_to_string(carbonmesh_state_t state);

#ifdef __cplusplus
}
#endif

#endif // CARBONMESH_TINYML_DECISION_H
