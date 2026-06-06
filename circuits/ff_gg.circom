pragma circom 2.2.3;

include "./bit_ops.circom";

// FF for j >= 16: majority (X&Y)|(X&Z)|(Y&Z)
template FF_HIGH32() {
    signal input x[32];
    signal input y[32];
    signal input z[32];
    signal output out[32];

    for (var i = 0; i < 32; i++) {
        out[i] <== FF_BIT()(x[i], y[i], z[i]);
    }
}

// GG for j >= 16: choice (X&Y)|(~X&Z)
template GG_HIGH32() {
    signal input x[32];
    signal input y[32];
    signal input z[32];
    signal output out[32];

    for (var i = 0; i < 32; i++) {
        out[i] <== GG_BIT()(x[i], y[i], z[i]);
    }
}
