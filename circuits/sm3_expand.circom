pragma circom 2.2.3;

include "./bit_ops.circom";
include "./perm.circom";
include "./pack.circom";

// Single message expansion step: W[j] = P1(W[j-16]^W[j-9]^(W[j-3]<<<15)) ^ (W[j-13]<<<7) ^ W[j-6]
// Outputs in dual representation
template ExpandStep() {
    signal input w16_bits[32];
    signal input w9_bits[32];
    signal input w3_bits[32];
    signal input w13_bits[32];
    signal input w6_bits[32];

    signal output wj_val;
    signal output wj_bits[32];

    signal w3_rot_bits[32];
    for (var i = 0; i < 32; i++) { w3_rot_bits[i] <== w3_bits[(i + 17) % 32]; }

    signal inner_bits[32];
    inner_bits <== XOR3w()(w16_bits, w9_bits, w3_rot_bits);

    signal p1_bits[32];
    p1_bits <== P1()(inner_bits);

    signal w13_rot_bits[32];
    for (var i = 0; i < 32; i++) { w13_rot_bits[i] <== w13_bits[(i + 25) % 32]; }

    wj_bits <== XOR3w()(p1_bits, w13_rot_bits, w6_bits);
    wj_val <== Bits2Num(32)(wj_bits);
}

// Full SM3 message expansion with dual representation
template SM3MessageExpand() {
    signal input msg_val[16];
    signal output W_val[68];
    signal output W_bits[68][32];
    signal output Wp_val[64];
    signal output Wp_bits[64][32];

    // Decompose message words into dual representation
    for (var i = 0; i < 16; i++) {
        W_val[i] <== msg_val[i];
        W_bits[i] <== Num2Bits(32)(msg_val[i]);
    }

    // Expand W[16..67]
    for (var j = 16; j < 68; j++) {
        (W_val[j], W_bits[j]) <== ExpandStep()(
            W_bits[j-16], W_bits[j-9], W_bits[j-3],
            W_bits[j-13], W_bits[j-6]
        );
    }

    // W'[j] = W[j] ^ W[j+4]
    for (var j = 0; j < 64; j++) {
        for (var i = 0; i < 32; i++) {
            Wp_bits[j][i] <== W_bits[j][i] + W_bits[j+4][i] - 2 * W_bits[j][i] * W_bits[j+4][i];
        }
        Wp_val[j] <== Bits2Num(32)(Wp_bits[j]);
    }
}
