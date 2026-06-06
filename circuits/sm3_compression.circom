pragma circom 2.2.3;

include "./sm3_expand.circom";
include "./sm3_round.circom";
include "./perm.circom";
include "./pack.circom";

// Final XOR helper
template FinalXorWord() {
    signal input state_bits[32];
    signal input V_bits[32];
    signal output xor_val;
    signal output xor_bits[32];
    for (var i = 0; i < 32; i++) {
        xor_bits[i] <== state_bits[i] + V_bits[i] - 2 * state_bits[i] * V_bits[i];
    }
    xor_val <== Bits2Num(32)(xor_bits);
}

// SM3 Compression — dual representation per paper
// Input:  V_val[8], B_val[16] as field values
// Output: V_next_val[8], V_next_bits[8][32]

template SM3Compression() {
    signal input V_val[8];
    signal input B_val[16];

    signal output V_next_val[8];
    signal output V_next_bits[8][32];

    // Decompose V into dual representation
    signal V_bits[8][32];
    for (var r = 0; r < 8; r++) {
        V_bits[r] <== Num2Bits(32)(V_val[r]);
    }

    // Message expansion
    signal W_val[68];
    signal W_bits[68][32];
    signal Wp_val[64];
    signal Wp_bits[64][32];
    (W_val, W_bits, Wp_val, Wp_bits) <== SM3MessageExpand()(B_val);

    // Constants in dual representation
    signal T0_val, T1_val;
    signal T0_bits[32], T1_bits[32];
    T0_val <== 0x79CC4519;
    T1_val <== 0x7A879D8A;
    T0_bits <== Num2Bits(32)(T0_val);
    T1_bits <== Num2Bits(32)(T1_val);

    // Unrolled state arrays (dual)
    signal A_vals[65], B_vals[65], C_vals[65], D_vals[65];
    signal E_vals[65], F_vals[65], G_vals[65], H_vals[65];
    signal A_bits_arr[65][32], B_bits_arr[65][32], C_bits_arr[65][32], D_bits_arr[65][32];
    signal E_bits_arr[65][32], F_bits_arr[65][32], G_bits_arr[65][32], H_bits_arr[65][32];

    // Initialize
    for (var i = 0; i < 32; i++) {
        A_bits_arr[0][i] <== V_bits[0][i]; B_bits_arr[0][i] <== V_bits[1][i];
        C_bits_arr[0][i] <== V_bits[2][i]; D_bits_arr[0][i] <== V_bits[3][i];
        E_bits_arr[0][i] <== V_bits[4][i]; F_bits_arr[0][i] <== V_bits[5][i];
        G_bits_arr[0][i] <== V_bits[6][i]; H_bits_arr[0][i] <== V_bits[7][i];
    }
    A_vals[0] <== V_val[0]; B_vals[0] <== V_val[1]; C_vals[0] <== V_val[2]; D_vals[0] <== V_val[3];
    E_vals[0] <== V_val[4]; F_vals[0] <== V_val[5]; G_vals[0] <== V_val[6]; H_vals[0] <== V_val[7];

    // 64 rounds — select Tj at compile time
    for (var j = 0; j < 64; j++) {
        if (j < 16) {
            (A_vals[j+1], B_vals[j+1], C_vals[j+1], D_vals[j+1],
             E_vals[j+1], F_vals[j+1], G_vals[j+1], H_vals[j+1],
             A_bits_arr[j+1], B_bits_arr[j+1], C_bits_arr[j+1], D_bits_arr[j+1],
             E_bits_arr[j+1], F_bits_arr[j+1], G_bits_arr[j+1], H_bits_arr[j+1]) <==
                SM3Round(j)(
                    A_vals[j], B_vals[j], C_vals[j], D_vals[j],
                    E_vals[j], F_vals[j], G_vals[j], H_vals[j],
                    A_bits_arr[j], B_bits_arr[j], C_bits_arr[j], D_bits_arr[j],
                    E_bits_arr[j], F_bits_arr[j], G_bits_arr[j], H_bits_arr[j],
                    W_val[j], Wp_val[j],
                    W_bits[j], Wp_bits[j],
                    T0_val, T0_bits);
        } else {
            (A_vals[j+1], B_vals[j+1], C_vals[j+1], D_vals[j+1],
             E_vals[j+1], F_vals[j+1], G_vals[j+1], H_vals[j+1],
             A_bits_arr[j+1], B_bits_arr[j+1], C_bits_arr[j+1], D_bits_arr[j+1],
             E_bits_arr[j+1], F_bits_arr[j+1], G_bits_arr[j+1], H_bits_arr[j+1]) <==
                SM3Round(j)(
                    A_vals[j], B_vals[j], C_vals[j], D_vals[j],
                    E_vals[j], F_vals[j], G_vals[j], H_vals[j],
                    A_bits_arr[j], B_bits_arr[j], C_bits_arr[j], D_bits_arr[j],
                    E_bits_arr[j], F_bits_arr[j], G_bits_arr[j], H_bits_arr[j],
                    W_val[j], Wp_val[j],
                    W_bits[j], Wp_bits[j],
                    T1_val, T1_bits);
        }
    }

    // Final XOR
    (V_next_val[0], V_next_bits[0]) <== FinalXorWord()(A_bits_arr[64], V_bits[0]);
    (V_next_val[1], V_next_bits[1]) <== FinalXorWord()(B_bits_arr[64], V_bits[1]);
    (V_next_val[2], V_next_bits[2]) <== FinalXorWord()(C_bits_arr[64], V_bits[2]);
    (V_next_val[3], V_next_bits[3]) <== FinalXorWord()(D_bits_arr[64], V_bits[3]);
    (V_next_val[4], V_next_bits[4]) <== FinalXorWord()(E_bits_arr[64], V_bits[4]);
    (V_next_val[5], V_next_bits[5]) <== FinalXorWord()(F_bits_arr[64], V_bits[5]);
    (V_next_val[6], V_next_bits[6]) <== FinalXorWord()(G_bits_arr[64], V_bits[6]);
    (V_next_val[7], V_next_bits[7]) <== FinalXorWord()(H_bits_arr[64], V_bits[7]);
}
