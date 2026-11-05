#!/usr/bin/env python3
"""
CarbonMesh v2: Knowledge Distillation Pipeline
Transfers dark knowledge from the 111,556-parameter Teacher MLP (95.28% accuracy)
into an ultra-compact 9,800-byte Student TinyML model optimized for Cortex-M33.
"""

import json
import os
import random
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder

SEED = 42
DATA_PATH = "carbonmesh_full_architecture_synthetic_v2.csv"
OUT_DIR = "artifacts"
TEACHER_MODEL_PATH = os.path.join(OUT_DIR, "carbonmesh_teacher.keras")

TEMPERATURE = 3.0   # Softens probabilities to transfer inter-class dark knowledge
ALPHA = 0.6         # 60% weight to Teacher soft targets, 40% to true hard labels

random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)

print("Loading dataset & teacher model...")
if not os.path.exists(DATA_PATH):
    # Check parent directory or carbonmesh-ml
    for fallback in ["../carbonmesh_full_architecture_synthetic_v2.csv", os.path.expanduser("~/carbonmesh-ml/carbonmesh_full_architecture_synthetic_v2.csv")]:
        if os.path.exists(fallback):
            DATA_PATH = fallback
            break

df = pd.read_csv(DATA_PATH)
if not os.path.exists(TEACHER_MODEL_PATH):
    fallback_teacher = os.path.expanduser("~/carbonmesh-ml/artifacts/carbonmesh_teacher.keras")
    if os.path.exists(fallback_teacher):
        TEACHER_MODEL_PATH = fallback_teacher

teacher = tf.keras.models.load_model(TEACHER_MODEL_PATH)

FEATURES = [
    "lux_mean", "lux_min", "lux_max", "lux_slope_per_s",
    "current_mean_a", "current_std_a", "current_max_a",
    "current_slope_a_per_s", "temperature_mean_c",
    "humidity_mean_pct", "mq135_mean_adc",
    "mq135_slope_adc_per_s", "hour_sin", "hour_cos",
    "relay_state", "time_since_relay_change_s"
]

X = df[FEATURES].to_numpy(dtype=np.float32)
encoder = LabelEncoder()
y = encoder.fit_transform(df["label"].astype(str))
class_names = list(encoder.classes_)
num_classes = len(class_names)
groups = df["session_id"].to_numpy()

# Session-wise leak-free split
splitter = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=SEED)
train_idx, test_idx = next(splitter.split(X, y, groups))

X_train, X_test = X[train_idx], X[test_idx]
y_train, y_test = y[train_idx], y[test_idx]

# Normalization using train stats only
mean = X_train.mean(axis=0)
std = X_train.std(axis=0)
std[std < 1e-6] = 1.0

X_train = ((X_train - mean) / std).astype(np.float32)
X_test = ((X_test - mean) / std).astype(np.float32)

# Generate Teacher soft logits/probabilities
teacher_logits = teacher.predict(X_train, verbose=0)
# Temperature-scaled teacher predictions
teacher_soft = np.exp(np.log(np.clip(teacher_logits, 1e-7, 1.0)) / TEMPERATURE)
teacher_soft = teacher_soft / np.sum(teacher_soft, axis=1, keepdims=True)

# One-hot hard targets
y_train_onehot = tf.keras.utils.to_categorical(y_train, num_classes)

# Combined Distillation Targets: Alpha * Soft + (1 - Alpha) * Hard
distill_targets = (ALPHA * teacher_soft) + ((1.0 - ALPHA) * y_train_onehot)

print("\n--- Training Distilled Tiny Cortex-M33 Student (Under 10 KB) ---")
# Student Architecture: 16 -> 64 -> 32 -> 16 -> 4 (TFLM Optimized)
inputs = tf.keras.Input(shape=(len(FEATURES),), name="normalized_sensor_features")
x = tf.keras.layers.Dense(64, activation="relu")(inputs)
x = tf.keras.layers.Dense(32, activation="relu")(x)
x = tf.keras.layers.Dense(16, activation="relu")(x)
outputs = tf.keras.layers.Dense(num_classes, activation="softmax", name="class_probabilities")(x)

student = tf.keras.Model(inputs, outputs)
student.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

student.fit(
    X_train, distill_targets,
    validation_split=0.1,
    epochs=60,
    batch_size=64,
    callbacks=[tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=8, restore_best_weights=True)],
    verbose=1
)

# Test Student Float Accuracy
float_preds = np.argmax(student.predict(X_test, verbose=0), axis=1)
float_acc = accuracy_score(y_test, float_preds)
print(f"\nDistilled Student Float Accuracy: {float_acc:.4%}")

# Full INT8 Quantization for NXP FRDM-MCXN236
def representative_dataset():
    count = min(500, len(X_train))
    rng = np.random.default_rng(SEED)
    for idx in rng.choice(len(X_train), size=count, replace=False):
        yield [X_train[idx:idx + 1].astype(np.float32)]

converter = tf.lite.TFLiteConverter.from_keras_model(student)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.representative_dataset = representative_dataset
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type = tf.int8
converter.inference_output_type = tf.int8

tflite_bytes = converter.convert()
tflite_path = os.path.join(OUT_DIR, "carbonmesh_energy_distilled_int8.tflite")
with open(tflite_path, "wb") as f:
    f.write(tflite_bytes)

# Evaluate INT8 Student
interpreter = tf.lite.Interpreter(model_path=tflite_path)
interpreter.allocate_tensors()
in_detail = interpreter.get_input_details()[0]
out_detail = interpreter.get_output_details()[0]

in_scale, in_zero = in_detail["quantization"]
out_scale, out_zero = out_detail["quantization"]

int8_preds = []
for row in X_test:
    q_in = np.clip(np.round(row / in_scale + in_zero), -128, 127).astype(np.int8)
    interpreter.set_tensor(in_detail["index"], q_in.reshape(1, -1))
    interpreter.invoke()
    q_out = interpreter.get_tensor(out_detail["index"])[0]
    int8_preds.append(int(np.argmax(q_out)))

int8_acc = accuracy_score(y_test, int8_preds)

print(f"\n==========================================")
print(f"DISTILLED TINYML STUDENT COMPLETED!")
print(f"INT8 Test Accuracy : {int8_acc:.4%}")
print(f"Model File Size    : {len(tflite_bytes):,} bytes (~{len(tflite_bytes)/1024:.1f} KB)")
print(f"Saved To           : {tflite_path}")
print(f"==========================================")
print(classification_report(y_test, int8_preds, target_names=class_names, zero_division=0))

# Save deployment metadata
metadata = {
    "model": os.path.basename(tflite_path),
    "feature_order": FEATURES,
    "feature_mean": mean.tolist(),
    "feature_std": std.tolist(),
    "class_order": class_names,
    "input_scale": float(in_scale),
    "input_zero_point": int(in_zero),
    "output_scale": float(out_scale),
    "output_zero_point": int(out_zero),
    "int8_test_accuracy": float(int8_acc),
    "teacher_accuracy": 0.9528,
    "distillation_temperature": TEMPERATURE,
    "distillation_alpha": ALPHA
}
with open(os.path.join(OUT_DIR, "carbonmesh_distilled_metadata.json"), "w") as f:
    json.dump(metadata, f, indent=2)
print("Distillation metadata saved.")

