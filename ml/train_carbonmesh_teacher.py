
import os
import numpy as np
import pandas as pd
import tensorflow as tf

from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report

SEED = 42
np.random.seed(SEED)
tf.random.set_seed(SEED)

DATA = "carbonmesh_full_architecture_synthetic_v2.csv"
OUT = "artifacts"
os.makedirs(OUT, exist_ok=True)

FEATURES = [
    "lux_mean", "lux_min", "lux_max", "lux_slope_per_s",
    "current_mean_a", "current_std_a", "current_max_a",
    "current_slope_a_per_s", "temperature_mean_c",
    "humidity_mean_pct", "mq135_mean_adc",
    "mq135_slope_adc_per_s", "hour_sin", "hour_cos",
    "relay_state", "time_since_relay_change_s"
]

df = pd.read_csv(DATA)

X = df[FEATURES].to_numpy(dtype=np.float32)
encoder = LabelEncoder()
y = encoder.fit_transform(df["label"].astype(str))
groups = df["session_id"].to_numpy()

splitter = GroupShuffleSplit(
    n_splits=1, test_size=0.20, random_state=SEED
)
train_idx, test_idx = next(splitter.split(X, y, groups))

X_train, X_test = X[train_idx], X[test_idx]
y_train, y_test = y[train_idx], y[test_idx]

# Normalize using training data only.
mean = X_train.mean(axis=0)
std = X_train.std(axis=0)
std[std < 1e-6] = 1.0

X_train = (X_train - mean) / std
X_test = (X_test - mean) / std

# Larger teacher: 16 -> 256 -> 256 -> 128 -> 64 -> 4
inputs = tf.keras.Input(shape=(len(FEATURES),))
x = tf.keras.layers.Dense(256, activation="relu")(inputs)
x = tf.keras.layers.Dense(256, activation="relu")(x)
x = tf.keras.layers.Dense(128, activation="relu")(x)
x = tf.keras.layers.Dense(64, activation="relu")(x)
outputs = tf.keras.layers.Dense(
    len(encoder.classes_), activation="softmax"
)(x)

model = tf.keras.Model(inputs, outputs)

model.compile(
    optimizer="adam",
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

model.fit(
    X_train, y_train,
    validation_split=0.1,
    epochs=50,
    batch_size=64,
    callbacks=[
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=6,
            restore_best_weights=True
        )
    ],
    verbose=1
)

pred = np.argmax(model.predict(X_test, verbose=0), axis=1)
accuracy = accuracy_score(y_test, pred)

print("\n========== CARBONMESH TEACHER ==========")
print("Classes:", list(encoder.classes_))
print("Parameters:", f"{model.count_params():,}")
print("Test accuracy:", f"{accuracy:.4%}")
print("Float model bytes:", os.path.getsize(OUT + "/carbonmesh_float.keras")
      if os.path.exists(OUT + "/carbonmesh_float.keras") else "not saved yet")
print(classification_report(
    y_test, pred, target_names=encoder.classes_, zero_division=0
))

model.save(OUT + "/carbonmesh_teacher.keras")
np.savez(
    OUT + "/carbonmesh_teacher_metadata.npz",
    feature_mean=mean,
    feature_std=std,
    class_names=encoder.classes_,
    feature_names=np.array(FEATURES)
)
print("Saved:", OUT + "/carbonmesh_teacher.keras")
print("========================================")


