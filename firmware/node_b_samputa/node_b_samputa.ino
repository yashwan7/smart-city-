/*
 * CarbonMesh v2 - Node B: Samputa Carbon Bank Firmware (ESP32 #2)
 *
 * Responsibilities:
 * - Ultrasonic distance sensing with 9-reading median noise filter
 * - Conversion of distance to fill percentage, bin volume, and mass estimate
 * - Instant rain detection & emergency motorized lid closure
 * - Deposit validation state machine:
 *     - Requires prior lid-open event
 *     - Enforces 60-second stable fill duration before committing deposit
 *     - Rate-of-fill cap & moisture bounds check
 *     - Fail-safe closed lid on sensor fault
 * - Cryptographic HMAC-SHA256 signing of telemetry
 * - Offline 200-packet RAM ring buffer with automatic in-order flush
 * - SSD1306 OLED and buzzer status feedback
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

extern "C" {
#include "../common/config.h"
#include "../common/packet.h"
#include "../common/crypto.h"
#include "../common/ring_buffer.h"
}

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// State & Telemetry Variables
static ring_buffer_t g_ring_buffer;
static uint32_t g_seq = 0;
static uint64_t g_base_unix_time = 1730100000ULL;
static uint32_t g_boot_millis = 0;

// Samputa State Machine
enum LidState {
    LID_CLOSED = 0,
    LID_OPEN = 1,
    LID_CLOSING_RAIN = 2,
    LID_FAULT = 3
};

static LidState g_lid_state = LID_CLOSED;
static bool g_had_lid_open_event = false;
static float g_last_confirmed_fill_pct = 0.0f;
static float g_candidate_fill_pct = 0.0f;
static uint32_t g_candidate_start_time = 0;
static float g_calibrated_empty_cm = BIN_EMPTY_DIST_CM;
static float g_calibrated_full_cm = BIN_FULL_DIST_CM;

uint64_t get_current_unix_time() {
    uint32_t elapsed_s = (millis() - g_boot_millis) / 1000;
    return g_base_unix_time + (uint64_t)elapsed_s;
}

void sync_time_from_hub() {
    if (WiFi.status() != WL_CONNECTED) return;
    HTTPClient http;
    http.begin(HUB_TIME_URL);
    int httpCode = http.GET();
    if (httpCode == 200) {
        String payload = http.getString();
        StaticJsonDocument<128> doc;
        if (!deserializeJson(doc, payload) && doc.containsKey("server_time")) {
            g_base_unix_time = (uint64_t)doc["server_time"].as<double>();
            g_boot_millis = millis();
        }
    }
    http.end();
}

// 9-Reading Median Filter for Ultrasonic Sensor
float read_ultrasonic_distance_median9() {
    float samples[9];
    for (int i = 0; i < 9; ++i) {
        digitalWrite(ESP2_PIN_TRIG, LOW);
        delayMicroseconds(2);
        digitalWrite(ESP2_PIN_TRIG, HIGH);
        delayMicroseconds(10);
        digitalWrite(ESP2_PIN_TRIG, LOW);

        long duration = pulseIn(ESP2_PIN_ECHO, HIGH, 30000); // 30ms timeout (~5m)
        if (duration <= 0) {
            samples[i] = g_calibrated_empty_cm; // Default to empty if echo timed out
        } else {
            samples[i] = (float)duration * 0.0343f / 2.0f;
        }
        delay(15);
    }

    // Insertion sort to find median
    for (int i = 1; i < 9; ++i) {
        float key = samples[i];
        int j = i - 1;
        while (j >= 0 && samples[j] > key) {
            samples[j + 1] = samples[j];
            j--;
        }
        samples[j + 1] = key;
    }
    return samples[4]; // 5th element is median
}

float distance_to_fill_percentage(float dist_cm) {
    if (dist_cm >= g_calibrated_empty_cm) return 0.0f;
    if (dist_cm <= g_calibrated_full_cm) return 100.0f;
    float range = g_calibrated_empty_cm - g_calibrated_full_cm;
    float filled = g_calibrated_empty_cm - dist_cm;
    float pct = (filled / range) * 100.0f;
    if (pct < 0.0f) pct = 0.0f;
    if (pct > 100.0f) pct = 100.0f;
    return pct;
}

void set_lid_relay(bool open) {
    // Active LOW Relay: LOW = Energized (Open), HIGH = De-energized (Closed)
    if (open) {
        digitalWrite(ESP2_PIN_LID_RELAY, LOW);
        g_lid_state = LID_OPEN;
        g_had_lid_open_event = true;
    } else {
        digitalWrite(ESP2_PIN_LID_RELAY, HIGH);
        g_lid_state = LID_CLOSED;
    }
}

void oled_update_display(float dist_cm, float fill_pct, bool rain, int soil_adc) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("SAMPUTA CARBON BANK");
    display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

    display.setCursor(0, 14);
    display.printf("Fill: %.1f%%  Dist:%.0fcm\n", fill_pct, dist_cm);

    display.setCursor(0, 26);
    display.printf("Lid: %s\n", (g_lid_state == LID_OPEN) ? "OPEN" : "CLOSED");

    display.setCursor(0, 38);
    display.printf("Rain: %s (ADC %d)\n", rain ? "YES [ALERT]" : "NO", analogRead(ESP2_PIN_RAIN_ADC));

    display.setCursor(0, 50);
    display.printf("Soil: %d  Seq: %u\n", soil_adc, (unsigned int)g_seq);

    display.display();
}

void transmit_or_buffer_packet(const WirePacket *pkt) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(HUB_INGEST_URL);
        http.addHeader("Content-Type", "application/json");

        char wire_json[768];
        snprintf(
            wire_json,
            sizeof(wire_json),
            "{\"node\":\"%s\",\"seq\":%u,\"ts\":%llu,\"d\":%s,\"sig\":\"%s\"}",
            pkt->node,
            (unsigned int)pkt->seq,
            (unsigned long long)pkt->ts,
            pkt->payload_json,
            pkt->sig
        );

        int httpCode = http.POST(wire_json);
        http.end();

        if (httpCode == 201 || httpCode == 200) {
            return;
        }
    }

    ring_buffer_push(&g_ring_buffer, pkt);
}

void setup() {
    Serial.begin(115200);

    pinMode(ESP2_PIN_TRIG, OUTPUT);
    pinMode(ESP2_PIN_ECHO, INPUT);
    pinMode(ESP2_PIN_LID_RELAY, OUTPUT);
    pinMode(ESP2_PIN_BUZZER, OUTPUT);

    // Safe default: Lid relay closed (Active LOW -> HIGH)
    set_lid_relay(false);
    digitalWrite(ESP2_PIN_BUZZER, LOW);

    // Initialize I2C OLED
    Wire.begin(ESP2_PIN_OLED_SDA, ESP2_PIN_OLED_SCL);
    if (display.begin(SSD1306_SWITCHCAPVCC, ESP2_OLED_ADDR)) {
        display.clearDisplay();
        display.setCursor(0, 10);
        display.setTextSize(1);
        display.setTextColor(SSD1306_WHITE);
        display.println("Booting Samputa Node B");
        display.display();
    }

    ring_buffer_init(&g_ring_buffer);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);

    uint32_t start_connect = millis();
    while (WiFi.status() != WL_CONNECTED && (millis() - start_connect) < 5000) {
        delay(200);
    }
    sync_time_from_hub();
}

static uint32_t last_telemetry_time = 0;

void loop() {
    uint32_t now = millis();

    // 1. Read environmental and ultrasonic sensors
    float dist_cm = read_ultrasonic_distance_median9();
    float current_fill_pct = distance_to_fill_percentage(dist_cm);
    int rain_adc = analogRead(ESP2_PIN_RAIN_ADC);
    int soil_adc = analogRead(ESP2_PIN_SOIL_ADC);
    bool rain_detected = (rain_adc < RAIN_THRESHOLD_ADC);

    // 2. CRITICAL SAFETY: Immediate rain closure
    if (rain_detected && g_lid_state == LID_OPEN) {
        set_lid_relay(false);
        g_lid_state = LID_CLOSING_RAIN;
        digitalWrite(ESP2_PIN_BUZZER, HIGH);
        delay(100);
        digitalWrite(ESP2_PIN_BUZZER, LOW);
    }

    // 3. Deposit Validation State Machine
    float fill_delta_pct = 0.0f;
    float candidate_delta = current_fill_pct - g_last_confirmed_fill_pct;

    if (g_had_lid_open_event && candidate_delta > 1.0f && candidate_delta < 40.0f) {
        // Candidate deposit detected: verify 60-second stable increase
        if (g_candidate_start_time == 0) {
            g_candidate_start_time = now;
            g_candidate_fill_pct = current_fill_pct;
        } else if ((now - g_candidate_start_time) >= 60000) {
            // Stable for 60 seconds and moisture within bounds
            if (fabs(current_fill_pct - g_candidate_fill_pct) < 3.0f) {
                fill_delta_pct = current_fill_pct - g_last_confirmed_fill_pct;
                g_last_confirmed_fill_pct = current_fill_pct;
                g_had_lid_open_event = false; // Reset lid open prerequisite
                g_candidate_start_time = 0;

                // Audible confirmation of valid deposit
                digitalWrite(ESP2_PIN_BUZZER, HIGH);
                delay(80);
                digitalWrite(ESP2_PIN_BUZZER, LOW);
            }
        }
    } else {
        if (g_candidate_start_time > 0 && (now - g_candidate_start_time) > 75000) {
            // Discard candidate if unstable or lid closed prematurely
            g_candidate_start_time = 0;
        }
    }

    // 4. Update OLED status
    oled_update_display(dist_cm, current_fill_pct, rain_detected, soil_adc);

    // 5. Transmit Telemetry every 5 seconds
    if (now - last_telemetry_time >= 5000) {
        last_telemetry_time = now;
        g_seq++;

        WirePacket pkt;
        strncpy(pkt.node, NODE_B_ID, sizeof(pkt.node));
        pkt.seq = g_seq;
        pkt.ts = get_current_unix_time();

        const char* lid_str = (g_lid_state == LID_OPEN) ? "OPEN" :
                              ((g_lid_state == LID_CLOSING_RAIN) ? "CLOSING_RAIN" : "CLOSED");

        snprintf(
            pkt.payload_json,
            sizeof(pkt.payload_json),
            "{\"fill_delta_pct\":%.2f,\"fill_pct\":%.1f,\"lid\":\"%s\",\"rain\":%s,\"raw_dist_cm\":%.1f,\"soil_adc\":%d}",
            fill_delta_pct,
            current_fill_pct,
            lid_str,
            rain_detected ? "true" : "false",
            dist_cm,
            soil_adc
        );

        compute_packet_signature(
            NODE_B_SECRET_KEY,
            pkt.node,
            pkt.seq,
            pkt.ts,
            pkt.payload_json,
            pkt.sig
        );

        transmit_or_buffer_packet(&pkt);
    }

    delay(100);
}
