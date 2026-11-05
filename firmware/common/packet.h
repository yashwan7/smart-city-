#ifndef CARBONMESH_PACKET_H
#define CARBONMESH_PACKET_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/*
 * Node A Sensor & Telemetry Payload Structure
 * Fields: lux, temp, rh, aq, i, p, kwh, relay, st, conf
 */
typedef struct {
    float lux;          // Ambient light level (lux)
    float temp;         // Temperature (deg C)
    float rh;           // Relative humidity (%)
    int32_t aq;         // Air quality index / raw MQ135 (ppm/raw)
    float i;            // RMS current (Amperes)
    float p;            // Active power estimate (Watts)
    float kwh;          // Cumulative energy (kWh)
    uint8_t relay;      // Relay state (1 = ON, 0 = OFF)
    char st[24];        // Operating state ("NORMAL", "DAYLIGHT_WASTE", etc.)
    float conf;         // Model / rule classification confidence (0.0 to 1.0)
} NodeAPayload;

/*
 * Node B (Samputa Carbon Bank) Payload Structure
 */
typedef struct {
    float raw_dist_cm;      // Filtered ultrasonic distance (cm)
    float fill_pct;         // Bin fill level (0.0 to 100.0%)
    float fill_delta_pct;   // Deposit delta increment since last packet (%)
    int32_t soil_adc;       // Soil moisture ADC reading
    int32_t rain_adc;       // Rain sensor ADC reading
    bool rain_detected;     // Rain safety trigger
    char lid_state[16];     // "CLOSED", "OPEN", "CLOSING_RAIN"
    bool fault;             // Hardware / sensor fault flag
} NodeBPayload;

/*
 * Kiosk Button Activity Event
 */
typedef struct {
    char mode[16];          // "walk", "bus", "bike", "car", "matka", "handloom"
    float km;               // Distance credit (km)
    char source[16];        // "kiosk"
} KioskActivity;

/*
 * Generic Wire Packet Representation for Signing & Transmission
 */
typedef struct {
    char node[16];          // "node_a" or "node_b"
    uint32_t seq;           // Strictly increasing sequence
    uint64_t ts;            // Unix timestamp
    char payload_json[512]; // Canonical JSON payload string (keys sorted, compact)
    char sig[65];           // 64-character hex HMAC-SHA256 + null terminator
} WirePacket;

#ifdef __cplusplus
}
#endif

#endif // CARBONMESH_PACKET_H
