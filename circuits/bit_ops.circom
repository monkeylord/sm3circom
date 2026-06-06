pragma circom 2.2.3;

// Bit-level operations for SM3 circuit
// All 32-bit words are represented as arrays of 32 signal bits

// Two-bit XOR: out = a ^ b
// R1CS: (2*a) * b = a + b - out
template XOR2() {
    signal input a;
    signal input b;
    signal output out;

    out <== a + b - 2*a*b;
}

// Three-bit XOR: out = a ^ b ^ c
// Step 1: aux = a ^ b  (quadratic)
// Step 2: out = aux ^ c (quadratic)
template XOR3() {
    signal input a;
    signal input b;
    signal input c;
    signal output out;

    signal aux;
    aux <== a + b - 2*a*b;
    out <== aux + c - 2*aux*c;
}

// 32-bit word XOR3: out = in0 ^ in1 ^ in2
template XOR3w() {
    signal input in0[32];
    signal input in1[32];
    signal input in2[32];
    signal output out[32];

    for (var i = 0; i < 32; i++) {
        out[i] <== XOR3()(in0[i], in1[i], in2[i]);
    }
}

// Two-bit AND: out = a & b
template AND2() {
    signal input a;
    signal input b;
    signal output out;

    out <== a * b;
}

// Two-bit OR: out = a | b
template OR2() {
    signal input a;
    signal input b;
    signal output out;

    out <== a + b - a*b;
}

// Bit NOT: out = ~a = 1 - a
template NOT() {
    signal input a;
    signal output out;

    out <== 1 - a;
}

// Boolean function FF for j >= 16: (X&Y)|(X&Z)|(Y&Z)
// Majority function: result = x*y + x*z + y*z - 2*x*y*z
// x*y*z is cubic; break into quadratic steps: aux = x*y, then aux*z
template FF_BIT() {
    signal input x;
    signal input y;
    signal input z;
    signal output out;

    signal xy <== x * y;
    signal xz <== x * z;
    signal yz <== y * z;
    signal xyz <== xy * z;   // (x*y)*z is quadratic

    out <== xy + xz + yz - 2*xyz;
}

// Boolean function GG for j >= 16: (X&Y)|(~X&Z)
// Choice function: x*y + (1-x)*z = x*y + z - x*z
template GG_BIT() {
    signal input x;
    signal input y;
    signal input z;
    signal output out;

    signal xy <== x * y;
    signal xz <== x * z;
    out <== xy + z - xz;
}
