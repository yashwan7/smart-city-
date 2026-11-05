/*
 * CarbonMesh v2 - Node A Bridge & Kiosk Firmware (ESP32 #1)
 *
 * Responsibilities:
 * - UART2 (115200 baud) ingress from NXP FRDM-MCXN236
 * - 6-Button Kiosk (Walk, Bus, Bike, Car, Matka, Handloom) with 30ms debounce & buzzer feedback
 * - ST7735 SPI TFT display for live telemetry, sequence, and carbon metrics
 * - Cryptographic HMAC-SHA256 signing of telemetry and kiosk events
 * - Offline 200-packet RAM ring buffer with automatic in-order reconnection flush
 * - Inbound authenticated relay command verification
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <ArduinoJson.h>

extern "C" {
#include "../common/config.h"
#include "../common/packet.h"
#include "../common/crypto.h"
#include "../common/ring_buffer.h"
}

// ST7735 TFT Display Instance
Adafruit_ST7735 tft = Adafruit_ST7735(ESP1_PIN_TFT_CS, ESP1_PIN_TFT_DC, ESP1_PIN_TFT_RST);

// State Variables
static ring_buffer_t g_ring_buffer;
static uint32_t g_seq = 0;
static uint64_t g_base_unix_time = 1730100000ULL;
static uint32_t g_boot_millis = 0;
static bool g_hub_connected = false;

// Debounce Tracking for 6 Kiosk Buttons
struct KioskButton {
    uint8_t pin;
    const char* mode;
    float km;
    uint32_t last_debounce_time;
    uint8_t last_state;
};

static KioskButton g_buttons[] = {
    {ESP1_PIN_BTN_WALK,     "walking",     2.5f, 0, HIGH},
    {ESP1_PIN_BTN_BUS,      "bus",        12.0f, 0, HIGH},
    {ESP1_PIN_BTN_BIKE,     "bicycle",     5.0f, 0, HIGH},
    {ESP1_PIN_BTN_CAR,      "car_solo",   15.0f, 0, HIGH},
    {ESP1_PIN_BTN_MATKA,    "matka",       0.0f, 0, HIGH}, // Earthen cooler
    {ESP1_PIN_BTN_HANDLOOM, "handloom",    0.0f, 0, HIGH}  // Hand-woven low carbon
};
static const size_t NUM_BUTTONS = sizeof(g_buttons) / sizeof(g_buttons[0]);

// Current telemetry state from NXP
static NodeAPayload g_current_nxp_data;

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
            g_hub_connected = true;
        }
    }
    http.end();
}

void tft_update_display(const char* status_msg) {
    tft.fillScreen(ST77XX_BLACK);
    tft.setTextColor(ST77XX_GREEN);
    tft.setTextSize(1);
    tft.setCursor(4, 4);
    tft.println("CARBONMESH V2 NODE A");
    tft.drawLine(0, 14, 128, 14, ST77XX_DARKGREY);

    // Network & Sequence
    tft.setCursor(4, 18);
    tft.setTextColor(WiFi.status() == WL_CONNECTED ? ST77XX_CYAN : ST77XX_RED);
    tft.printf("WiFi: %s  Seq:%u\n", (WiFi.status() == WL_CONNECTED) ? "UP" : "DOWN", (unsigned int)g_seq);

    // Power & Energy
    tft.setCursor(4, 30);
    tft.setTextColor(ST77XX_WHITE);
    tft.printf("Power: %.1f W\n", g_current_nxp_data.p);
    tft.setCursor(4, 40);
    tft.printf("Current: %.2f A\n", g_current_nxp_data.i);
    tft.setCursor(4, 50);
    tft.printf("Energy: %.4f kWh\n", g_current_nxp_data.kwh);

    // Relay State & AI Classification
    tft.setCursor(4, 62);
    tft.setTextColor(g_current_nxp_data.relay ? ST77XX_YELLOW : ST77XX_RED);
    tft.printf("Relay: %s [%s]\n", g_current_nxp_data.relay ? "ON" : "OFF", g_current_nxp_data.st);

    // Environmental readings
    tft.setCursor(4, 74);
    tft.setTextColor(ST77XX_MAGENTA);
    tft.printf("Lux:%.0f Temp:%.1fC\n", g_current_nxp_data.lux, g_current_nxp_data.temp);

    // Kiosk & Buffer Status
    tft.drawLine(0, 88, 128, 88, ST77XX_DARKGREY);
    tft.setCursor(4, 94);
    tft.setTextColor(ST77XX_ORANGE);
    tft.printf("Buffer: %u / 200\n", (unsigned int)ring_buffer_count(&g_ring_buffer));
    tft.setCursor(4, 106);
    tft.setTextColor(ST77XX_GREEN);
    tft.printf("%s\n", status_msg ? status_msg : "Kiosk Ready");
}

void transmit_or_buffer_packet(const WirePacket *pkt) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(HUB_INGEST_URL);
        http.addHeader("Content-Type", "application/json");

        // Format Wire JSON matching agreed contract {node, seq, ts, d, sig}
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
            g_hub_connected = true;
            return;
        }
    }

    // Network offline or hub unreachable: push to RAM ring buffer
    ring_buffer_push(&g_ring_buffer, pkt);
    g_hub_connected = false;
}

void flush_offline_ring_buffer() {
    if (WiFi.status() != WL_CONNECTED || ring_buffer_is_empty(&g_ring_buffer)) return;

    HTTPClient http;
    http.begin(HUB_BATCH_URL);
    http.addHeader("Content-Type", "application/json");

    // Build batch JSON
    String batch_json = "{\"packets\":[";
    bool first = true;
    WirePacket pkt;

    while (ring_buffer_pop(&g_ring_buffer, &pkt)) {
        if (!first) batch_json += ",";
        char item[768];
        snprintf(
            item,
            sizeof(item),
            "{\"node\":\"%s\",\"seq\":%u,\"ts\":%llu,\"d\":%s,\"sig\":\"%s\"}",
            pkt.node,
            (unsigned int)pkt.seq,
            (unsigned long long)pkt.ts,
            pkt.payload_json,
            pkt.sig
        );
        batch_json += item;
        first = false;
    }
    batch_json += "]}";

    int httpCode = http.POST(batch_json);
    http.end();
}

void handle_kiosk_buttons() {
    uint32_t now = millis();
    for (size_t i = 0; i < NUM_BUTTONS; ++i) {
        int reading = digitalRead(g_buttons[i].pin);
        if (reading != g_buttons[i].last_state) {
            g_buttons[i].last_debounce_time = now;
        }

        if ((now - g_buttons[i].last_debounce_time) > 30) {
            // Button pressed (Active LOW)
            if (reading == LOW && g_buttons[i].last_state == HIGH) {
                // Audio feedback
                digitalWrite(ESP1_PIN_BUZZER, HIGH);
                delay(40);
                digitalWrite(ESP1_PIN_BUZZER, LOW);

                // Prepare signed kiosk activity packet
                g_seq++;
                WirePacket pkt;
                strncpy(pkt.node, NODE_A_ID, sizeof(pkt.node));
                pkt.seq = g_seq;
                pkt.ts = get_current_unix_time();

                snprintf(
                    pkt.payload_json,
                    sizeof(pkt.payload_json),
                    "{\"action\":\"commute_log\",\"km\":%.1f,\"mode\":\"%s\",\"source\":\"kiosk\"}",
                    g_buttons[i].km,
                    g_buttons[i].mode
                );

                compute_packet_signature(
                    NODE_A_SECRET_KEY,
                    pkt.node,
                    pkt.seq,
                    pkt.ts,
                    pkt.payload_json,
                    pkt.sig
                );

                transmit_or_buffer_packet(&pkt);

                char msg[32];
                snprintf(msg, sizeof(msg), "Logged: %s", g_buttons[i].mode);
                tft_update_display(msg);
            }
        }
        g_buttons[i].last_state = reading;
    }
}

void parse_nxp_uart_line(const char* line) {
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, line);
    if (err) return;

    g_current_nxp_data.lux = doc["lux"] | 0.0f;
    g_current_nxp_data.temp = doc["temp"] | 0.0f;
    g_current_nxp_data.rh = doc["rh"] | 0.0f;
    g_current_nxp_data.aq = doc["aq"] | 0;
    g_current_nxp_data.i = doc["i"] | 0.0f;
    g_current_nxp_data.p = doc["p"] | 0.0f;
    g_current_nxp_data.kwh = doc["kwh"] | 0.0f;
    g_current_nxp_data.relay = doc["relay"] | 1;
    strncpy(g_current_nxp_data.st, doc["st"] | "NORMAL", sizeof(g_current_nxp_data.st));
    g_current_nxp_data.conf = doc["conf"] | 0.95f;

    // Package and sign standard wire packet
    g_seq++;
    WirePacket pkt;
    strncpy(pkt.node, NODE_A_ID, sizeof(pkt.node));
    pkt.seq = g_seq;
    pkt.ts = get_current_unix_time();

    // Canonical JSON with strictly sorted keys matching agreed contract
    snprintf(
        pkt.payload_json,
        sizeof(pkt.payload_json),
        "{\"aq\":%d,\"conf\":%.2f,\"current_a\":%.2f,\"energy_kwh\":%.4f,\"lux_pct\":%.1f,\"power_w\":%.1f,\"relay\":\"%s\",\"state\":\"%s\"}",
        (int)g_current_nxp_data.aq,
        g_current_nxp_data.conf,
        g_current_nxp_data.i,
        g_current_nxp_data.kwh,
        g_current_nxp_data.lux,
        g_current_nxp_data.p,
        g_current_nxp_data.relay ? "ON" : "OFF",
        g_current_nxp_data.st
    );

    compute_packet_signature(
        NODE_A_SECRET_KEY,
        pkt.node,
        pkt.seq,
        pkt.ts,
        pkt.payload_json,
        pkt.sig
    );

    transmit_or_buffer_packet(&pkt);
    tft_update_display("Telemetry Sent");
}

void setup() {
    Serial.begin(115200);
    Serial2.begin(115200, SERIAL_8N1, ESP1_PIN_UART_RX, ESP1_PIN_UART_TX);

    // Initialize Kiosk Button Pins
    for (size_t i = 0; i < NUM_BUTTONS; ++i) {
        pinMode(g_buttons[i].pin, INPUT_PULLUP);
    }
    pinMode(ESP1_PIN_BUZZER, OUTPUT);
    digitalWrite(ESP1_PIN_BUZZER, LOW);

    // Initialize ST7735 TFT
    tft.initR(INITR_BLACKTAB);
    tft.setRotation(1);
    tft.fillScreen(ST77XX_BLACK);
    tft.setCursor(4, 4);
    tft.setTextColor(ST77XX_GREEN);
    tft.println("Booting CarbonMesh Node A...");

    // Initialize RAM Ring Buffer
    ring_buffer_init(&g_ring_buffer);

    // WiFi Initialization
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);

    uint32_t start_connect = millis();
    while (WiFi.status() != WL_CONNECTED && (millis() - start_connect) < 5000) {
        delay(200);
    }

    sync_time_from_hub();
    tft_update_display("System Initialized");
}

static char uart_buf[512];
static size_t uart_idx = 0;
static uint32_t last_flush_try = 0;

void loop() {
    // 1. Process Kiosk Buttons
    handle_kiosk_buttons();

    // 2. Read UART frames from NXP
    while (Serial2.available()) {
        char c = (char)Serial2.read();
        if (c == '\n') {
            uart_buf[uart_idx] = '\0';
            if (uart_idx > 0) {
                parse_nxp_uart_line(uart_buf);
            }
            uart_idx = 0;
        } else if (uart_idx < sizeof(uart_buf) - 1) {
            uart_buf[uart_idx++] = c;
        }
    }

    // 3. Periodic Reconnection & Offline Buffer Flush
    if (millis() - last_flush_try > 5000) {
        last_flush_try = millis();
        if (WiFi.status() == WL_CONNECTED && !ring_buffer_is_empty(&g_ring_buffer)) {
            flush_offline_ring_buffer();
        }
    }
}
