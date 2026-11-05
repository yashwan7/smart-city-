"""
CarbonMesh v2 Edge TinyML Pipeline
Trains 16 -> 32 -> 16 -> 4 Dense neural network for NXP FRDM-MCXN236.
Quantizes to INT8 and exports C header 'model_data.h'.
"""

import os
import numpy as np
import tensorflow as tf
from pathlib import Path

CLASSES = ["NORMAL", "DAYLIGHT_WASTE", "AFTERHOURSLOAD", "ANOMALYSPIKE"]
NUM_CLASSES = len(CLASSES)
FEATURE_DIM = 16

def generate_session_data(num_sessions=50, windows_per_session=100):
    """
    Generates realistic sensor feature windows partitioned strictly by session
    to prevent cross-window data leakage during train/eval split.
    """
    X_list = []
    y_list = []
    session_ids = []

    np.random.seed(42)

    for s_id in range(num_sessions):
        # Assign session regime
        regime = s_id % 4
        for w in range(windows_per_session):
            noise = np.random.normal(0, 0.05, FEATURE_DIM)
            f = np.zeros(FEATURE_DIM, dtype=np.float32)

            if regime == 0:  # NORMAL
                f[0] = np.random.uniform(150, 400)      # lux mean
                f[1] = f[0] - np.random.uniform(5, 20)  # lux min
                f[2] = f[0] + np.random.uniform(5, 20)  # lux max
                f[3] = np.random.normal(0, 0.5)         # lux slope
                f[4] = np.random.uniform(1.2, 2.5)      # current mean
                f[5] = np.random.uniform(0.05, 0.2)     # current std
                f[6] = f[4] + np.random.uniform(0.1, 0.4) # current max
                f[7] = np.random.normal(0, 0.05)        # current slope
                f[8] = np.random.uniform(22, 26)        # temp
                f[9] = np.random.uniform(45, 60)        # rh
                f[10] = np.random.uniform(350, 450)     # aq
                f[11] = np.random.normal(0, 1.0)        # aq slope
                hour = np.random.uniform(9, 17)
                f[12] = np.sin((hour / 24.0) * 2 * np.pi)
                f[13] = np.cos((hour / 24.0) * 2 * np.pi)
                f[14] = 1.0                             # relay
                f[15] = np.random.uniform(60, 3600)     # time since relay change
                y = 0

            elif regime == 1:  # DAYLIGHT_WASTE
                f[0] = np.random.uniform(750, 1200)     # high lux
                f[1] = f[0] - 50
                f[2] = f[0] + 50
                f[3] = np.random.uniform(-0.2, 0.2)
                f[4] = np.random.uniform(2.0, 3.5)      # load ON
                f[5] = np.random.uniform(0.05, 0.25)
                f[6] = f[4] + 0.3
                f[7] = np.random.normal(0, 0.05)
                f[8] = np.random.uniform(25, 30)
                f[9] = np.random.uniform(40, 55)
                f[10] = np.random.uniform(380, 460)
                f[11] = np.random.normal(0, 1.0)
                hour = np.random.uniform(11, 15)        # midday
                f[12] = np.sin((hour / 24.0) * 2 * np.pi)
                f[13] = np.cos((hour / 24.0) * 2 * np.pi)
                f[14] = 1.0                             # relay ON while bright
                f[15] = np.random.uniform(30, 1800)
                y = 1

            elif regime == 2:  # AFTERHOURSLOAD
                f[0] = np.random.uniform(0, 50)         # dark room
                f[1] = 0
                f[2] = f[0] + 5
                f[3] = 0.0
                f[4] = np.random.uniform(1.5, 3.0)      # load active
                f[5] = np.random.uniform(0.05, 0.2)
                f[6] = f[4] + 0.2
                f[7] = 0.0
                f[8] = np.random.uniform(20, 23)
                f[9] = np.random.uniform(50, 65)
                f[10] = np.random.uniform(300, 400)
                f[11] = 0.0
                hour = np.random.choice([1, 2, 3, 4, 23]) # night
                f[12] = np.sin((hour / 24.0) * 2 * np.pi)
                f[13] = np.cos((hour / 24.0) * 2 * np.pi)
                f[14] = 1.0
                f[15] = np.random.uniform(300, 7200)
                y = 2

            else:  # ANOMALYSPIKE
                f[0] = np.random.uniform(200, 500)
                f[1] = f[0] - 20
                f[2] = f[0] + 20
                f[3] = 0.0
                f[4] = np.random.uniform(7.0, 14.0)     # huge current surge
                f[5] = np.random.uniform(2.5, 5.0)      # high std dev
                f[6] = f[4] + np.random.uniform(3.0, 6.0)
                f[7] = np.random.uniform(1.0, 5.0)      # steep positive slope
                f[8] = np.random.uniform(26, 35)
                f[9] = np.random.uniform(40, 60)
                f[10] = np.random.uniform(500, 800)
                f[11] = np.random.uniform(5.0, 20.0)
                hour = np.random.uniform(10, 16)
                f[12] = np.sin((hour / 24.0) * 2 * np.pi)
                f[13] = np.cos((hour / 24.0) * 2 * np.pi)
                f[14] = 1.0
                f[15] = np.random.uniform(5, 60)
                y = 3

            X_list.append(f + noise)
            y_list.append(y)
            session_ids.append(s_id)

    return np.array(X_list, dtype=np.float32), np.array(y_list, dtype=np.int32), np.array(session_ids)

def train_and_export():
    print("[TinyML] Generating synthetic session windows for NXP edge AI...")
    X, y, sessions = generate_session_data(num_sessions=60, windows_per_session=100)

    # Split strictly by session ID: first 48 sessions train, last 12 sessions test
    train_mask = sessions < 48
    test_mask = sessions >= 48

    X_train, y_train = X[train_mask], y[train_mask]
    X_test, y_test = X[test_mask], y[test_mask]

    print(f"[TinyML] Train windows: {len(X_train)}, Test windows: {len(X_test)}")

    # Model architecture: 16 -> 32 -> 16 -> 4
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(FEATURE_DIM,)),
        tf.keras.layers.Dense(32, activation='relu', name='dense_1'),
        tf.keras.layers.Dense(16, activation='relu', name='dense_2'),
        tf.keras.layers.Dense(NUM_CLASSES, activation='softmax', name='output')
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.005),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )

    model.fit(X_train, y_train, epochs=25, batch_size=32, verbose=0)
    loss, acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"[TinyML] Held-out Session Evaluation Accuracy: {acc * 100.0:.2f}%")

    # Confusion Matrix
    preds = np.argmax(model.predict(X_test, verbose=0), axis=1)
    cm = tf.math.confusion_matrix(y_test, preds).numpy()
    print("[TinyML] Confusion Matrix (Rows=True, Cols=Pred):")
    print(cm)

    # Convert to INT8 TFLite Micro model
    def representative_dataset():
        for i in range(100):
            yield [X_train[i:i+1]]

    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = representative_dataset
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type = tf.int8
    converter.inference_output_type = tf.int8

    tflite_quant = converter.convert()
    print(f"[TinyML] INT8 TFLite Model Size: {len(tflite_quant)} bytes")

    # Export to model_data.h
    output_header = Path(__file__).parent / "model_data.h"
    with open(output_header, "w") as f:
        f.write("#ifndef CARBONMESH_MODEL_DATA_H\n")
        f.write("#define CARBONMESH_MODEL_DATA_H\n\n")
        f.write("#include <stdint.h>\n\n")
        f.write(f"// INT8 Quantized 16-32-16-4 TinyML Model for NXP MCXN236\n")
        f.write(f"// Model size: {len(tflite_quant)} bytes\n")
        f.write(f"const unsigned int g_model_data_len = {len(tflite_quant)};\n")
        f.write("const unsigned char g_model_data[] __attribute__((aligned(4))) = {\n  ")
        for i, byte in enumerate(tflite_quant):
            f.write(f"0x{byte:02x}, ")
            if (i + 1) % 12 == 0:
                f.write("\n  ")
        f.write("\n};\n\n")
        f.write("#endif // CARBONMESH_MODEL_DATA_H\n")

    print(f"[TinyML] Successfully exported {output_header}")

if __name__ == "__main__":
    train_and_export()
