#!/usr/bin/env python3
import json
import os
import random

import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import LabelEncoder

SEED = 42
CSV_PATH = "carbonmesh_full_architecture_synthetic_v2.csv"
OUT_DIR = "artifacts"

FEATURES = [
    "lux_mean", "lux_min", "lux_max", "lux_slope_per_s",
    "current_mean_a", "current_std_a", "current_max_a",
    "current_slope_a_per_s", "temperature_mean_c",
    "humidity_mean_pct", "mq135_mean_adc",
    "mq135_slope_adc_per_s", "hour_sin", "hour_cos",
    "relay_state", "time_since_relay_change_s",
]

TARGET = "label"
GROUP = "session_id"

os.makedirs(OUT_DIR, exist_ok=True)
random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)

df = pd.read_csv(CSV_PATH)

required = FEATURES + [TARGET, GROUP]
missing = [c for c in required if c not in df.columns]

if missing:
    raise ValueError(f"Missing required columns: {missing}")

df = df.dropna(subset=required).reset_index(drop=True)

X = df[FEATURES].astype("float32").to_numpy()
labels = df[TARGET].astype(str).to_numpy()
groups = df[GROUP].astype(str).to_numpy()

encoder = LabelEncoder()
y = encoder.fit_transform(labels).astype("int32")
class_names = encoder.classes_.tolist()
num_classes = len(class_names)

splitter = GroupShuffleSplit(
    n_splits=100,
    test_size=0.20,
    random_state=SEED,
)

chosen = None

for train_idx, test_idx in splitter.split(X, y, groups):
    if (
        len(np.unique(y[train_idx])) == num_classes
        and len(np.unique(y[test_idx])) == num_classes
    ):
        chosen = (train_idx, test_idx)
        break

if chosen is None:
    raise RuntimeError(
        "Could not find a session-wise split containing every class "
        "in both sets. Check session_id and label counts."
    )

train_idx, test_idx = chosen

X_train, X_test = X[train_idx], X[test_idx]
y_train, y_test = y[train_idx], y[test_idx]

# Normalize features outside the model, using training data only.
# This improves the numeric range presented to the INT8 converter.
feature_mean = X_train.mean(axis=0)
feature_std = X_train.std(axis=0)
feature_std[feature_std < 1e-6] = 1.0

X_train = ((X_train - feature_mean) / feature_std).astype(np.float32)
X_test = ((X_test - feature_mean) / feature_std).astype(np.float32)

train_groups = set(groups[train_idx])
test_groups = set(groups[test_idx])

assert train_groups.isdisjoint(test_groups), "Session leakage detected!"

print("TensorFlow:", tf.__version__)
print("Dataset shape:", df.shape)
print("Class order:", class_names)
print(f"Train rows: {len(train_idx)} | Test rows: {len(test_idx)}")
print(
    f"Train sessions: {len(train_groups)} | "
    f"Test sessions: {len(test_groups)}"
)
print("Session overlap:", len(train_groups & test_groups))

print("\nTrain label counts:")
print(
    pd.Series(encoder.inverse_transform(y_train))
    .value_counts()
    .to_string()
)

print("\nTest label counts:")
print(
    pd.Series(encoder.inverse_transform(y_test))
    .value_counts()
    .to_string()
)

# Features are already normalized outside the model.
inputs = tf.keras.Input(
    shape=(len(FEATURES),),
    name="normalized_sensor_features",
)

x = inputs
x = tf.keras.layers.Dense(64, activation="relu")(x)
x = tf.keras.layers.Dense(32, activation="relu")(x)
x = tf.keras.layers.Dense(16, activation="relu")(x)

outputs = tf.keras.layers.Dense(
    num_classes,
    activation="softmax",
    name="class_probabilities",
)(x)

model = tf.keras.Model(inputs, outputs)

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)

callbacks = [
    tf.keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=12,
        restore_best_weights=True,
    )
]

model.fit(
    X_train,
    y_train,
    validation_split=0.15,
    epochs=100,
    batch_size=64,
    callbacks=callbacks,
    verbose=2,
)

# Evaluate the floating-point model.
probs = model.predict(X_test, verbose=0)
pred = np.argmax(probs, axis=1)

float_acc = accuracy_score(y_test, pred)

print(f"\nFLOAT test accuracy: {float_acc:.4f}")
print("\nFLOAT classification report:")

print(
    classification_report(
        y_test,
        pred,
        labels=np.arange(num_classes),
        target_names=class_names,
        zero_division=0,
    )
)

print("FLOAT confusion matrix:")
print(confusion_matrix(y_test, pred))

model_path = os.path.join(OUT_DIR, "carbonmesh_float.keras")
model.save(model_path)

# Representative data for full INT8 quantization.
def representative_dataset():
    count = min(500, len(X_train))
    rng = np.random.default_rng(SEED)
    indices = rng.choice(len(X_train), size=count, replace=False)

    for i in indices:
        yield [X_train[i:i + 1].astype(np.float32)]


converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.representative_dataset = representative_dataset

converter.target_spec.supported_ops = [
    tf.lite.OpsSet.TFLITE_BUILTINS_INT8
]

converter.inference_input_type = tf.int8
converter.inference_output_type = tf.int8

tflite_bytes = converter.convert()

tflite_path = os.path.join(
    OUT_DIR,
    "carbonmesh_energy_int8.tflite",
)

with open(tflite_path, "wb") as f:
    f.write(tflite_bytes)

# Evaluate the actual exported INT8 model.
interpreter = tf.lite.Interpreter(model_path=tflite_path)
interpreter.allocate_tensors()

input_detail = interpreter.get_input_details()[0]
output_detail = interpreter.get_output_details()[0]

input_scale, input_zero = input_detail["quantization"]
output_scale, output_zero = output_detail["quantization"]

if input_scale == 0:
    raise ValueError("Invalid input quantization scale.")

int8_pred = []

for row in X_test:
    raw = row.reshape(1, -1).astype(np.float32)

    q_input = np.round(raw / input_scale + input_zero)
    q_input = np.clip(q_input, -128, 127).astype(np.int8)

    interpreter.set_tensor(input_detail["index"], q_input)
    interpreter.invoke()

    q_output = interpreter.get_tensor(output_detail["index"])
    int8_pred.append(int(np.argmax(q_output[0])))

int8_acc = accuracy_score(y_test, int8_pred)

print(f"\nINT8 TFLite test accuracy: {int8_acc:.4f}")
print("\nINT8 classification report:")

print(
    classification_report(
        y_test,
        int8_pred,
        labels=np.arange(num_classes),
        target_names=class_names,
        zero_division=0,
    )
)

print("INT8 confusion matrix:")
print(
    confusion_matrix(
        y_test,
        int8_pred,
        labels=np.arange(num_classes),
    )
)

metadata = {
    "model": os.path.basename(tflite_path),
    "feature_order": FEATURES,
    "feature_mean": feature_mean.tolist(),
    "feature_std": feature_std.tolist(),
    "class_order": class_names,
    "input_dtype": str(input_detail["dtype"]),
    "input_scale": float(input_scale),
    "input_zero_point": int(input_zero),
    "output_dtype": str(output_detail["dtype"]),
    "output_scale": float(output_scale),
    "output_zero_point": int(output_zero),
    "float_test_accuracy": float(float_acc),
    "int8_test_accuracy": float(int8_acc),
    "train_rows": int(len(train_idx)),
    "test_rows": int(len(test_idx)),
    "train_sessions": int(len(train_groups)),
    "test_sessions": int(len(test_groups)),
    "session_overlap": int(len(train_groups & test_groups)),
    "warning": "Synthetic dataset results are not real-world validation.",
}

metadata_path = os.path.join(
    OUT_DIR,
    "carbonmesh_model_metadata.json",
)

with open(metadata_path, "w") as f:
    json.dump(metadata, f, indent=2)

print("\nSaved files:")
print(f" - {model_path} ({os.path.getsize(model_path):,} bytes)")
print(f" - {tflite_path} ({os.path.getsize(tflite_path):,} bytes)")
print(f" - {metadata_path}")

print(
    "\nIMPORTANT: Validate using real sensor readings before "
    "claiming real-world accuracy."
)
