#ifndef CARBONMESH_RING_BUFFER_H
#define CARBONMESH_RING_BUFFER_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include "packet.h"
#include "config.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    WirePacket packets[RING_BUFFER_CAPACITY];
    size_t head;       // Write index
    size_t tail;       // Read index
    size_t count;      // Current number of queued items
    uint32_t dropped;  // Total packets dropped due to buffer overflow
} ring_buffer_t;

void ring_buffer_init(ring_buffer_t *rb);
bool ring_buffer_push(ring_buffer_t *rb, const WirePacket *pkt);
bool ring_buffer_pop(ring_buffer_t *rb, WirePacket *out_pkt);
bool ring_buffer_peek(const ring_buffer_t *rb, WirePacket *out_pkt);
size_t ring_buffer_count(const ring_buffer_t *rb);
bool ring_buffer_is_empty(const ring_buffer_t *rb);
bool ring_buffer_is_full(const ring_buffer_t *rb);
void ring_buffer_clear(ring_buffer_t *rb);

#ifdef __cplusplus
}
#endif

#endif // CARBONMESH_RING_BUFFER_H
