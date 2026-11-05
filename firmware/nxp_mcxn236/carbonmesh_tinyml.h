#ifndef CARBONMESH_TINYML_H_
#define CARBONMESH_TINYML_H_

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define CM_NUM_FEATURES 16
#define CM_NUM_CLASSES  4

typedef enum {
    CM_CLASS_AFTERHOURSLOAD = 0,
    CM_CLASS_ANOMALYSPIKE   = 1,
    CM_CLASS_DAYLIGHT_WASTE = 2,
    CM_CLASS_NORMAL         = 3,
    CM_CLASS_UNKNOWN        = -1
} cm_class_t;

typedef struct {
    float features[CM_NUM_FEATURES];
} cm_sensor_vector_t;

typedef struct {
    cm_class_t predicted_class;
    const char* class_name;
    float confidence;
    float probabilities[CM_NUM_CLASSES];
    int8_t raw_output[CM_NUM_CLASSES];
    uint32_t latency_cycles;
    float latency_ms;
} cm_inference_result_t;

/* Lifecycle and Execution API */
bool carbonmesh_tinyml_init(void);
bool carbonmesh_tinyml_run(const cm_sensor_vector_t* raw_input, cm_inference_result_t* result);
const char* carbonmesh_class_to_str(cm_class_t cls);

#ifdef __cplusplus
}
#endif

#endif /* CARBONMESH_TINYML_H_ */

