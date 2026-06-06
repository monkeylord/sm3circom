pragma circom 2.2.3;

include "./bit_ops.circom";
include "./ff_gg.circom";
include "./perm.circom";
include "./modadd.circom";
include "./pack.circom";

// SM3 Round — dual representation per paper Section 5.1.3
// Each 32-bit word: (field_val, bits[32]) pair
// Addition: field values via AddMod2/3/4 (Num2Bits-based mod-reduce)
// Boolean: bit arrays (XOR, FF, GG, P0)
// Rotation: wire permutation on bits (zero cost)

template SM3Round(j) {
    // --- State inputs (dual) ---
    signal input A_val, B_val, C_val, D_val, E_val, F_val, G_val, H_val;
    signal input A_bits[32], B_bits[32], C_bits[32], D_bits[32];
    signal input E_bits[32], F_bits[32], G_bits[32], H_bits[32];

    // --- Message words (dual) ---
    signal input W_val, Wp_val;
    signal input W_bits[32], Wp_bits[32];

    // --- Constant (dual) ---
    signal input Tj_val;
    signal input Tj_bits[32];

    // --- State outputs (dual) ---
    signal output A_out_val, B_out_val, C_out_val, D_out_val;
    signal output E_out_val, F_out_val, G_out_val, H_out_val;
    signal output A_out_bits[32], B_out_bits[32], C_out_bits[32], D_out_bits[32];
    signal output E_out_bits[32], F_out_bits[32], G_out_bits[32], H_out_bits[32];

    // === SS1 = ((A <<< 12) + E + (Tj <<< j)) <<< 7 ===

    // A <<< 12 — rotate bits, get field value for addition
    signal A_rot12_bits[32];
    for (var i = 0; i < 32; i++) { A_rot12_bits[i] <== A_bits[(i + 20) % 32]; }
    signal A_rot12_val;
    A_rot12_val <== Bits2Num(32)(A_rot12_bits);

    // Tj <<< j — rotate bits, get field value
    signal Tj_rot_bits[32];
    for (var i = 0; i < 32; i++) { Tj_rot_bits[i] <== Tj_bits[(i + 64 - j) % 32]; }
    signal Tj_rot_val;
    Tj_rot_val <== Bits2Num(32)(Tj_rot_bits);

    // sum1 = A_rot12 + E + T_rot (mod 2^32)
    signal SS1_raw_val, SS1_raw_bits[32];
    (SS1_raw_val, SS1_raw_bits) <== AddMod3()(A_rot12_val, E_val, Tj_rot_val);

    // SS1 = sum1 <<< 7 — rotate bits left by 7, recompute field value
    signal SS1_bits[32];
    for (var i = 0; i < 32; i++) { SS1_bits[i] <== SS1_raw_bits[(i + 25) % 32]; }
    signal SS1_val;
    SS1_val <== Bits2Num(32)(SS1_bits);

    // === SS2 = SS1 ^ (A <<< 12) ===
    signal SS2_bits[32];
    for (var i = 0; i < 32; i++) {
        SS2_bits[i] <== SS1_bits[i] + A_rot12_bits[i] - 2 * SS1_bits[i] * A_rot12_bits[i];
    }
    signal SS2_val;
    SS2_val <== Bits2Num(32)(SS2_bits);

    // === TT1 = FF_j(A,B,C) + D + SS2 + W' ===
    // j<16: FF=GG=XOR3; j>=16: FF=majority, GG=choice
    signal FF_bits[32];
    if (j < 16) {
        FF_bits <== XOR3w()(A_bits, B_bits, C_bits);
    } else {
        FF_bits <== FF_HIGH32()(A_bits, B_bits, C_bits);
    }
    signal FF_val;
    FF_val <== Bits2Num(32)(FF_bits);

    signal TT1_val, TT1_bits[32];
    (TT1_val, TT1_bits) <== AddMod4()(FF_val, D_val, SS2_val, Wp_val);

    // === TT2 = GG_j(E,F,G) + H + SS1 + W ===
    signal GG_bits[32];
    if (j < 16) {
        GG_bits <== XOR3w()(E_bits, F_bits, G_bits);
    } else {
        GG_bits <== GG_HIGH32()(E_bits, F_bits, G_bits);
    }
    signal GG_val;
    GG_val <== Bits2Num(32)(GG_bits);

    signal TT2_val, TT2_bits[32];
    (TT2_val, TT2_bits) <== AddMod4()(GG_val, H_val, SS1_val, W_val);

    // === State update ===
    // D = C
    D_out_val <== C_val;
    for (var i = 0; i < 32; i++) { D_out_bits[i] <== C_bits[i]; }

    // C = B <<< 9
    for (var i = 0; i < 32; i++) { C_out_bits[i] <== B_bits[(i + 23) % 32]; }
    C_out_val <== Bits2Num(32)(C_out_bits);

    // B = A
    B_out_val <== A_val;
    for (var i = 0; i < 32; i++) { B_out_bits[i] <== A_bits[i]; }

    // A = TT1
    A_out_val <== TT1_val;
    for (var i = 0; i < 32; i++) { A_out_bits[i] <== TT1_bits[i]; }

    // H = G
    H_out_val <== G_val;
    for (var i = 0; i < 32; i++) { H_out_bits[i] <== G_bits[i]; }

    // G = F <<< 19
    for (var i = 0; i < 32; i++) { G_out_bits[i] <== F_bits[(i + 13) % 32]; }
    G_out_val <== Bits2Num(32)(G_out_bits);

    // F = E
    F_out_val <== E_val;
    for (var i = 0; i < 32; i++) { F_out_bits[i] <== E_bits[i]; }

    // E = P0(TT2)
    E_out_bits <== P0()(TT2_bits);
    E_out_val <== Bits2Num(32)(E_out_bits);
}
