pragma circom 2.2.3;

include "./pack.circom";

// AddMod2 — (a + b) mod 2^32, paper Section 5.1.1
//   sum = a + b (field, 1 constraint)
//   sum_bits = Num2Bits(33)(sum) (34 constraints)
//   result_bits = sum_bits[0..31] (0 constraints)
//   result_val = Bits2Num(32)(result_bits) (32 constraints)
// Total: 1+34+32 = 67

template AddMod2() {
    signal input a, b;
    signal output result_val;
    signal output result_bits[32];

    signal sum;
    sum <== a + b;

    signal sum_bits[33];
    sum_bits <== Num2Bits(33)(sum);

    for (var i = 0; i < 32; i++) {
        result_bits[i] <== sum_bits[i];
    }

    result_val <== Bits2Num(32)(result_bits);
}

// AddMod3 — (a + b + c) mod 2^32
//   k = 32 + ceil(log2(3)) = 34
// Total: 1+35+32 = 68

template AddMod3() {
    signal input a, b, c;
    signal output result_val;
    signal output result_bits[32];

    signal sum;
    sum <== a + b + c;

    signal sum_bits[34];
    sum_bits <== Num2Bits(34)(sum);

    for (var i = 0; i < 32; i++) {
        result_bits[i] <== sum_bits[i];
    }

    result_val <== Bits2Num(32)(result_bits);
}

// AddMod4 — (a + b + c + d) mod 2^32
//   k = 32 + ceil(log2(4)) = 34
// Total: 1+35+32 = 68

template AddMod4() {
    signal input a, b, c, d;
    signal output result_val;
    signal output result_bits[32];

    signal sum;
    sum <== a + b + c + d;

    signal sum_bits[34];
    sum_bits <== Num2Bits(34)(sum);

    for (var i = 0; i < 32; i++) {
        result_bits[i] <== sum_bits[i];
    }

    result_val <== Bits2Num(32)(result_bits);
}
