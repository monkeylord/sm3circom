pragma circom 2.2.3;

include "./bit_ops.circom";

// P0 permutation: P0(X) = X ^ (X <<< 9) ^ (X <<< 17)
// <<< = left rotation: new[i] = old[(i + 32 - K) % 32]
template P0() {
    signal input x[32];
    signal output out[32];

    // x <<< 9: left rotate by 9
    signal rot9[32];
    // x <<< 17: left rotate by 17
    signal rot17[32];

    for (var i = 0; i < 32; i++) {
        rot9[i] <== x[(i + 23) % 32];   // 32 - 9 = 23
        rot17[i] <== x[(i + 15) % 32];  // 32 - 17 = 15
    }

    out <== XOR3w()(x, rot9, rot17);
}

// P1 permutation: P1(X) = X ^ (X <<< 15) ^ (X <<< 23)
template P1() {
    signal input x[32];
    signal output out[32];

    // x <<< 15: left rotate by 15
    signal rot15[32];
    // x <<< 23: left rotate by 23
    signal rot23[32];

    for (var i = 0; i < 32; i++) {
        rot15[i] <== x[(i + 17) % 32];  // 32 - 15 = 17
        rot23[i] <== x[(i + 9) % 32];   // 32 - 23 = 9
    }

    out <== XOR3w()(x, rot15, rot23);
}
