#ifndef CARBONMESH_CONFIG_H
#define CARBONMESH_CONFIG_H

#include <stdint.h>
#include <stdbool.h>

/* ====================================================================
 * CarbonMesh v2 Embedded Configuration & Pin Mapping
 * ==================================================================== */

// WiFi & Network Credentials
#define WIFI_SSID           "carbonmesh"
#define WIFI_PASS           "carbonmesh2026"
#define HUB_HOST            "192.168.50.10"
#define HUB_PORT            8000
#define HUB_INGEST_URL      "http://192.168.50.10:8000/api/ingest"
#define HUB_BATCH_URL       "http://192.168.50.10:8000/api/ingest/batch"
#define HUB_TIME_URL        "http://192.168.50.10:8000/api/time"

// Node Identities
#define NODE_A_ID           "node_a"
#define NODE_B_ID           "node_b"

// Pre-Shared HMAC-SHA256 Secret Keys (Shared with Hub Backend)
#define NODE_A_SECRET_KEY   "node_a_nxp_secret_key_8841"
#define NODE_B_SECRET_KEY   "node_b_esp32_secret_key_9923"
#define HUB_COMMAND_KEY     "dev_hub_master_signing_key_41cd"

/* ====================================================================
 * Node A Pin Mapping (NXP FRDM-MCXN236 + ESP32 #1 Bridge)
 * ==================================================================== */

// NXP FRDM-MCXN236
#define NXP_PIN_LDR_ADC     0   // ADC0_CH0 (Ambient Light Sensor)
#define NXP_PIN_MQ135_ADC   1   // ADC0_CH1 (Air Quality - safely divided to 3.3V)
#define NXP_PIN_ACS712_ADC  2   // ADC0_CH2 (Current Sensor - safely divided)
#define NXP_PIN_DHT11_DATA  12  // GPIO Port 1 Pin 12 (DHT11 Temperature & RH)
#define NXP_PIN_RELAY_CTRL  16  // GPIO Port 1 Pin 16 (Relay Control - Active LOW)
#define NXP_PIN_OLED_SDA    8   // I2C1 SDA
#define NXP_PIN_OLED_SCL    9   // I2C1 SCL
#define NXP_LPUART_BAUD     115200

// ESP32 #1 (Bridge / Kiosk / TFT)
#define ESP1_PIN_UART_RX    16  // UART2 RX (connected to NXP TX)
#define ESP1_PIN_UART_TX    17  // UART2 TX (connected to NXP RX)

// ST7735 1.8" TFT SPI
#define ESP1_PIN_TFT_SCK    18
#define ESP1_PIN_TFT_MOSI   23
#define ESP1_PIN_TFT_CS     5
#define ESP1_PIN_TFT_DC     21
#define ESP1_PIN_TFT_RST    22

// Kiosk Buttons (Active LOW with internal pull-up)
#define ESP1_PIN_BTN_WALK   32
#define ESP1_PIN_BTN_BUS    33
#define ESP1_PIN_BTN_BIKE   25
#define ESP1_PIN_BTN_CAR    26
#define ESP1_PIN_BTN_MATKA  13
#define ESP1_PIN_BTN_HANDLOOM 14
#define ESP1_PIN_BUZZER     27

/* ====================================================================
 * Node B Pin Mapping (ESP32 #2: Samputa Carbon Bank)
 * ==================================================================== */

#define ESP2_PIN_TRIG       5   // Ultrasonic TRIG
#define ESP2_PIN_ECHO       18  // Ultrasonic ECHO (3.3V divided)
#define ESP2_PIN_SOIL_ADC   34  // Soil Moisture Analog (ADC1_CH6)
#define ESP2_PIN_RAIN_ADC   35  // Rain Detector Analog (ADC1_CH7)
#define ESP2_PIN_LID_RELAY  26  // Motorized Lid Relay (Active LOW)
#define ESP2_PIN_BUZZER     27  // Audio Feedback Buzzer
#define ESP2_PIN_OLED_SDA   21  // SSD1306 OLED SDA
#define ESP2_PIN_OLED_SCL   22  // SSD1306 OLED SCL
#define ESP2_OLED_ADDR      0x3C

/* ====================================================================
 * Calibration Defaults & Operating Thresholds
 * ==================================================================== */

// Power & Current
#define NOMINAL_VOLTAGE_V   230.0f
#define ASSUMED_POWER_FACTOR 0.92f
#define ACS712_SENSITIVITY_V_A 0.185f  // 185 mV/A for 5A ACS712 module
#define CURRENT_NOISE_FLOOR_A 0.05f   // Gate out residual ADC noise below 50mA

// Samputa Ultrasonic & Safety
#define BIN_EMPTY_DIST_CM   100.0f
#define BIN_FULL_DIST_CM    15.0f
#define BIN_CAPACITY_KG     50.0f
#define RAIN_THRESHOLD_ADC  2200      // Below 2200 = rain detected (Active LOW water film)
#define SOIL_WET_THRESHOLD  1800

// Buffer Size
#define RING_BUFFER_CAPACITY 200

#endif // CARBONMESH_CONFIG_H
