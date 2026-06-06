pragma circom 2.2.3;

include "../../circuits/sm3_compression.circom";
include "../../circuits/pack.circom";

template SM3Single() {
    signal input msg_val[16];
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

    signal V_next_val[8];
    signal V_next_bits[8][32];
    (V_next_val, V_next_bits) <== SM3Compression()(IV_val, msg_val);

    for (var r = 0; r < 8; r++) { hash_val[r] <== V_next_val[r]; }
}

component main = SM3Single();
