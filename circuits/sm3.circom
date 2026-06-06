pragma circom 2.2.3;

include "./sm3_compression.circom";
include "./pack.circom";

template CompressionStep() {
    signal input V_val[8];
    signal input B_val[16];
    signal output V_out[8];
    signal unused_bits[8][32];
    (V_out, unused_bits) <== SM3Compression()(V_val, B_val);
}

template SM3(k) {
    signal input msg_blocks_val[k][16];
    signal output hash_val[8];

    signal IV_val[8];
    IV_val[0] <== 0x7380166f;
    IV_val[1] <== 0x4914b2b9;
    IV_val[2] <== 0x172442d7;
    IV_val[3] <== 0xda8a0600;
    IV_val[4] <== 0xa96f30bc;
    IV_val[5] <== 0x163138aa;
    IV_val[6] <== 0xe38dee4d;
    IV_val[7] <== 0xb0fb0e4e;

    signal V_vals[k+1][8];
    for (var r = 0; r < 8; r++) { V_vals[0][r] <== IV_val[r]; }
    for (var i = 0; i < k; i++) {
        V_vals[i+1] <== CompressionStep()(V_vals[i], msg_blocks_val[i]);
    }
    for (var r = 0; r < 8; r++) { hash_val[r] <== V_vals[k][r]; }
}
