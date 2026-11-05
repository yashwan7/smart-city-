#include "ring_buffer.h"
#include <string.h>

void ring_buffer_init(ring_buffer_t *rb) {
    if (!rb) return;
    rb->head = 0;
    rb->tail = 0;
    rb->count = 0;
    rb->dropped = 0;
}

bool ring_buffer_push(ring_buffer_t *rb, const WirePacket *pkt) {
    if (!rb || !pkt) return false;

    if (rb->count >= RING_BUFFER_CAPACITY) {
        // Buffer full: drop oldest element to maintain latest contiguous telemetry
        rb->tail = (rb->tail + 1) % RING_BUFFER_CAPACITY;
        rb->count--;
        rb->dropped++;
    }

    memcpy(&rb->packets[rb->head], pkt, sizeof(WirePacket));
    rb->head = (rb->head + 1) % RING_BUFFER_CAPACITY;
    rb->count++;
    return true;
}

bool ring_buffer_pop(ring_buffer_t *rb, WirePacket *out_pkt) {
    if (!rb || !out_pkt || rb->count == 0) return false;

    memcpy(out_pkt, &rb->packets[rb->tail], sizeof(WirePacket));
    rb->tail = (rb->tail + 1) % RING_BUFFER_CAPACITY;
    rb->count--;
    return true;
}

bool ring_buffer_peek(const ring_buffer_t *rb, WirePacket *out_pkt) {
    if (!rb || !out_pkt || rb->count == 0) return false;
    memcpy(out_pkt, &rb->packets[rb->tail], sizeof(WirePacket));
    return true;
}

size_t ring_buffer_count(const ring_buffer_t *rb) {
    return rb ? rb->count : 0;
}

bool ring_buffer_is_empty(const ring_buffer_t *rb) {
    return rb ? (rb->count == 0) : true;
}

bool ring_buffer_is_full(const ring_buffer_t *rb) {
    return rb ? (rb->count >= RING_BUFFER_CAPACITY) : false;
}

void ring_buffer_clear(ring_buffer_t *rb) {
    if (!rb) return;
    rb->head = 0;
    rb->tail = 0;
    rb->count = 0;
}
