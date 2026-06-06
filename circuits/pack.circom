pragma circom 2.2.3;

// Num2Bits: Convert a field element to n-bit array
// Standard circomlib-style implementation
template Num2Bits(n) {
    signal input in;
    signal output out[n];

    var lc = 0;
    var e2 = 1;
    for (var i = 0; i < n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] - 1) === 0;
        lc += out[i] * e2;
        e2 = e2 + e2;
    }

    lc === in;
}

// Bits2Num: Convert n-bit array to a field element
template Bits2Num(n) {
    signal input in[n];
    signal output out;

    var lc = 0;
    var e2 = 1;
    for (var i = 0; i < n; i++) {
        lc += in[i] * e2;
        e2 = e2 + e2;
    }

    out <== lc;
}

// Num2Bits32: Specialized for 32 bits
template Num2Bits32() {
    signal input in;
    signal output out[32];
    out <== Num2Bits(32)(in);
}

// Bits2Num32: Specialized for 32 bits
template Bits2Num32() {
    signal input in[32];
    signal output out;
    out <== Bits2Num(32)(in);
}
