#ifndef CARBONMESH_CRYPTO_H
#define CARBONMESH_CRYPTO_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/*
 * Portable SHA-256 Context
 */
typedef struct {
    uint32_t state[8];
    uint64_t count;
    uint8_t buffer[64];
} sha256_ctx_t;

void sha256_init(sha256_ctx_t *ctx);
void sha256_update(sha256_ctx_t *ctx, const uint8_t *data, size_t len);
void sha256_final(sha256_ctx_t *ctx, uint8_t digest[32]);

/*
 * Portable HMAC-SHA256
 */
void hmac_sha256(
    const uint8_t *key, size_t key_len,
    const uint8_t *msg, size_t msg_len,
    uint8_t out_digest[32]
);

/*
 * Format binary digest into 64-character lowercase hex string + null terminator
 */
void digest_to_hex(const uint8_t digest[32], char out_hex[65]);

/*
 * Standard CarbonMesh canonical signing string format:
 * node|seq|ts|canonical_json(d)
 */
int build_canonical_message(
    const char *node,
    uint32_t seq,
    uint64_t ts,
    const char *canonical_json_d,
    char *out_msg,
    size_t out_max_len
);

/*
 * Signs message with HMAC-SHA256 and outputs 64-character lowercase hex
 */
int compute_packet_signature(
    const char *secret_key,
    const char *node,
    uint32_t seq,
    uint64_t ts,
    const char *canonical_json_d,
    char out_sig_hex[65]
);

/*
 * Inbound command authentication for relay override
 */
bool verify_command_signature(
    const char *hub_key,
    const char *cmd_payload,
    const char *received_sig_hex
);

#ifdef __cplusplus
}
#endif

#endif // CARBONMESH_CRYPTO_H
