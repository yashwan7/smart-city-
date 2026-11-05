#include "carbonmesh_tinyml.h"
#include "model_data.h"

#include <math.h>
#include <string.h>

// TensorFlow Lite for Microcontrollers Headers
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"
#include "tensorflow/lite/schema/schema_generated.h"

// NXP MCX Board / Core Headers for DWT timing
#include "fsl_common.h"

namespace {
    // 16 KB Tensor Arena fits comfortably in the FRDM-MCXN236's 256 KB SRAM
    constexpr int kTensorArenaSize = 16 * 1024;
    alignas(16) uint8_t s_tensor_arena[kTensorArenaSize];

    const tflite::Model* s_model = nullptr;
    tflite::MicroInterpreter* s_interpreter = nullptr;
    TfLiteTensor* s_input_tensor = nullptr;
    TfLiteTensor* s_output_tensor = nullptr;

    // Model Quantization Parameters from carbonmesh_model_metadata.json
    constexpr float kInputScale = 0.050998155027627945f;
    constexpr int32_t kInputZeroPoint = 4;
    constexpr float kOutputScale = 0.00390625f; // 1.0f / 256.0f
    constexpr int32_t kOutputZeroPoint = -128;

    // Exact training normalization statistics
    const float kFeatureMean[CM_NUM_FEATURES] = {
        255.7315216f, 230.1278992f, 286.8588562f, 0.1378484f,
        0.2493815f,   0.0130073f,   0.2724611f,   0.0001310f,
        28.1871548f,  60.5859795f,  800.4779663f, 0.2103024f,
        -0.3084913f, -0.2527427f,  0.6176842f,   87.4198914f
    };

    const float kFeatureStd[CM_NUM_FEATURES] = {
        252.8299713f, 228.1364441f, 283.1466675f, 15.9055052f,
        0.0957768f,   0.0082971f,   0.1026160f,   0.0069613f,
        2.2367010f,   6.8030400f,   231.6818848f, 9.7768459f,
        0.5845091f,   0.7066135f,   0.4859572f,   51.9791794f
    };

    const char* kClassNames[CM_NUM_CLASSES] = {
        "AFTERHOURSLOAD",
        "ANOMALYSPIKE",
        "DAYLIGHT_WASTE",
        "NORMAL"
    };

    inline int8_t quantize_int8(float real_val, float scale, int32_t zero_point) {
        int32_t q = static_cast<int32_t>(roundf(real_val / scale)) + zero_point;
        if (q < -128) return -128;
        if (q > 127)  return 127;
        return static_cast<int8_t>(q);
    }

    inline float dequantize_int8(int8_t q_val, float scale, int32_t zero_point) {
        return (static_cast<float>(q_val) - static_cast<float>(zero_point)) * scale;
    }
}

extern "C" bool carbonmesh_tinyml_init(void) {
    // 1. Enable Cortex-M33 Cycle Counter (DWT) for cycle-accurate profiling
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
    DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;

    // 2. Validate Flatbuffer header
    s_model = tflite::GetModel(g_carbonmesh_model_data);
    if (s_model->version() != TFLITE_SCHEMA_VERSION) {
        return false;
    }

    // 3. Register ONLY the 2 operators used by the model (minimizes Flash/RAM)
    static tflite::MicroMutableOpResolver<2> op_resolver;
    if (op_resolver.AddFullyConnected() != kTfLiteOk) return false;
    if (op_resolver.AddSoftmax() != kTfLiteOk) return false;

    // 4. Construct interpreter
    static tflite::MicroInterpreter static_interpreter(
        s_model, op_resolver, s_tensor_arena, kTensorArenaSize);
    s_interpreter = &static_interpreter;

    if (s_interpreter->AllocateTensors() != kTfLiteOk) {
        return false;
    }

    s_input_tensor = s_interpreter->input(0);
    s_output_tensor = s_interpreter->output(0);

    return true;
}

extern "C" bool carbonmesh_tinyml_run(const cm_sensor_vector_t* raw_input, cm_inference_result_t* result) {
    if (!s_interpreter || !raw_input || !result) {
        return false;
    }

    // Step 1: Preprocessing & INT8 Quantization
    int8_t* in_data = s_input_tensor->data.int8;
    for (int i = 0; i < CM_NUM_FEATURES; ++i) {
        float normalized = (raw_input->features[i] - kFeatureMean[i]) / kFeatureStd[i];
        in_data[i] = quantize_int8(normalized, kInputScale, kInputZeroPoint);
    }

    // Step 2: Execution & DWT Hardware Timing
    uint32_t start_cycles = DWT->CYCCNT;
    TfLiteStatus invoke_status = s_interpreter->Invoke();
    uint32_t end_cycles = DWT->CYCCNT;

    if (invoke_status != kTfLiteOk) {
        return false;
    }

    result->latency_cycles = (end_cycles >= start_cycles) ? 
        (end_cycles - start_cycles) : (UINT32_MAX - start_cycles + end_cycles);
    result->latency_ms = (float)result->latency_cycles / (float)(SystemCoreClock / 1000);

    // Step 3: Output Dequantization & ArgMax Selection
    const int8_t* out_data = s_output_tensor->data.int8;
    int best_class_idx = 0;
    int8_t max_score = -128;

    for (int c = 0; c < CM_NUM_CLASSES; ++c) {
        result->raw_output[c] = out_data[c];
        result->probabilities[c] = dequantize_int8(out_data[c], kOutputScale, kOutputZeroPoint);
        if (out_data[c] > max_score) {
            max_score = out_data[c];
            best_class_idx = c;
        }
    }

    result->predicted_class = static_cast<cm_class_t>(best_class_idx);
    result->class_name = kClassNames[best_class_idx];
    result->confidence = result->probabilities[best_class_idx];

    return true;
}

extern "C" const char* carbonmesh_class_to_str(cm_class_t cls) {
    if (cls >= 0 && cls < CM_NUM_CLASSES) {
        return kClassNames[cls];
    }
    return "UNKNOWN";
}

