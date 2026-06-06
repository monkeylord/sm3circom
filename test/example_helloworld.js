// SM3 HellWorld Example - Complete Zero-Knowledge Proof Workflow
//
// Proves knowledge of a preimage x such that SM3(x) = y
// for x = "helloworld", without revealing x.
//
// Based on the paper: "Implementation and Optimization of
// Zero-Knowledge Proof Circuit Based on Hash Function SM3"
// (Sensors 2022, 22(16), 5951)
//
// Prerequisites:
//   npm install -g circom snarkjs
//   cd sm3circom

const fs = require("fs");
const path = require("path");

const { sm3HashHex } = require("../scripts/sm3/ref.js");
const { sm3Pad, uint32ToBits, bitsToUint32 } = require("../scripts/sm3/padding.js");

// ============================================================
// Step 0: Define the secret message and compute expected hash
// ============================================================

const SECRET_MESSAGE = Buffer.from("helloworld");
const EXPECTED_HASH = sm3HashHex(SECRET_MESSAGE);

console.log("╔══════════════════════════════════════════════════════╗");
console.log("║     SM3 Hash Preimage Zero-Knowledge Proof          ║");
console.log("║     Prover knows x such that SM3(x) = y             ║");
console.log("╚══════════════════════════════════════════════════════╝");
console.log();
console.log(`  Secret message (x):  "${SECRET_MESSAGE.toString()}"`);
console.log(`  Expected hash (y):   ${EXPECTED_HASH}`);
console.log();

// ============================================================
// Step 1: Pad the message (OFF-circuit, per paper Section 5.1.4)
// ============================================================

const blocks = sm3Pad(SECRET_MESSAGE);

console.log("--- Step 1: Message Padding (off-circuit) ---");
console.log(`  Message length: ${SECRET_MESSAGE.length} bytes (${SECRET_MESSAGE.length * 8} bits)`);
console.log(`  After padding:  ${blocks.length} block(s) (${blocks.length * 512} bits)`);
console.log();

// Show the padded block content
console.log("  Padded message block (16 x 32-bit words):");
for (let w = 0; w < 16; w++) {
    const hex = blocks[0][w].toString(16).padStart(8, "0");
    process.stdout.write(`    W[${String(w).padStart(2)}] = 0x${hex}`);
    if ((w + 1) % 4 === 0) console.log();
}
console.log();

// ============================================================
// Step 2: Generate circuit input (padded blocks to bit arrays)
// ============================================================

console.log("--- Step 2: Circuit Input Generation ---");

const msgInput = [];
for (let w = 0; w < 16; w++) {
    msgInput.push(uint32ToBits(blocks[0][w]));
}

const inputJson = {
    msg: msgInput
};

const BUILD_DIR = path.join(__dirname, "..", "build");
fs.mkdirSync(BUILD_DIR, { recursive: true });

const inputFile = path.join(BUILD_DIR, "input_helloworld.json");
fs.writeFileSync(inputFile, JSON.stringify(inputJson, null, 2));
console.log(`  Input written to: ${inputFile}`);
console.log();

// ============================================================
// Step 3: Circuit Compilation
// ============================================================

console.log("--- Step 3: Circuit Compilation ---");
console.log("  Run the following command:");
console.log();
console.log(`    circom circuits/sm3_single_test.circom --wasm --r1cs --sym -o ${BUILD_DIR}`);
console.log();
console.log("  This generates:");
console.log(`    ${BUILD_DIR}/sm3_single_test.r1cs    (R1CS constraints)`);
console.log(`    ${BUILD_DIR}/sm3_single_test_js/     (WASM witness generator)`);
console.log();

// ============================================================
// Step 4: Powers of Tau Ceremony (Trusted Setup)
// ============================================================

console.log("--- Step 4: Trusted Setup (Powers of Tau + Circuit Setup) ---");
console.log("  Run the following commands:");
console.log();
console.log(`    # Phase 1: Powers of Tau (can reuse for multiple circuits)`);
console.log(`    snarkjs powersoftau new bn128 18 ${BUILD_DIR}/pot12_0000.ptau -v`);
console.log(`    snarkjs powersoftau contribute ${BUILD_DIR}/pot12_0000.ptau ${BUILD_DIR}/pot12_0001.ptau --name="first" -v`);
console.log(`    snarkjs powersoftau prepare phase2 ${BUILD_DIR}/pot12_0001.ptau ${BUILD_DIR}/pot12_final.ptau -v`);
console.log();
console.log(`    # Phase 2: Circuit-specific setup`);
console.log(`    snarkjs groth16 setup ${BUILD_DIR}/sm3_single_test.r1cs ${BUILD_DIR}/pot12_final.ptau ${BUILD_DIR}/sm3_0000.zkey`);
console.log(`    snarkjs zkey contribute ${BUILD_DIR}/sm3_0000.zkey ${BUILD_DIR}/sm3_final.zkey --name="second" -v`);
console.log(`    snarkjs zkey export verificationkey ${BUILD_DIR}/sm3_final.zkey ${BUILD_DIR}/verification_key.json`);
console.log();

// ============================================================
// Step 5: Generate Witness
// ============================================================

console.log("--- Step 5: Witness Generation ---");
console.log("  Run the following command:");
console.log();
const wasmDir = `${BUILD_DIR}/sm3_single_test_js`;
console.log(`    node ${wasmDir}/generate_witness.js ${wasmDir}/sm3_single_test.wasm ${BUILD_DIR}/input_helloworld.json ${BUILD_DIR}/witness.wtns`);
console.log();
console.log("  This computes all intermediate signals of the circuit.");
console.log("  The witness proves: SM3('helloworld') = 0x" + EXPECTED_HASH);
console.log();

// ============================================================
// Step 6: Generate Proof
// ============================================================

console.log("--- Step 6: Generate Zero-Knowledge Proof ---");
console.log("  Run the following command:");
console.log();
console.log(`    snarkjs groth16 prove ${BUILD_DIR}/sm3_final.zkey ${BUILD_DIR}/witness.wtns ${BUILD_DIR}/proof.json ${BUILD_DIR}/public.json`);
console.log();
console.log("  Outputs:");
console.log(`    ${BUILD_DIR}/proof.json   (the zero-knowledge proof: 3 group elements ~ 128 bytes)`);
console.log(`    ${BUILD_DIR}/public.json  (public inputs = SM3 hash of 'helloworld')`);
console.log();

// ============================================================
// Step 7: Verify Proof
// ============================================================

console.log("--- Step 7: Proof Verification ---");
console.log("  Run the following command:");
console.log();
console.log(`    snarkjs groth16 verify ${BUILD_DIR}/verification_key.json ${BUILD_DIR}/public.json ${BUILD_DIR}/proof.json`);
console.log();
console.log("  Expected output: [INFO]  snarkJS: OK!");
console.log();
console.log("  The verifier learns ONLY that the prover knows a preimage");
console.log("  of the hash value. The actual message 'helloworld' remains secret.");
console.log();

// ============================================================
// K: Export verifier (for browser or smart contract)
// ============================================================

console.log("--- Bonus: Export Solidity Verifier ---");
console.log("  For on-chain verification:");
console.log();
console.log(`    snarkjs zkey export solidityverifier ${BUILD_DIR}/sm3_final.zkey ${BUILD_DIR}/Verifier.sol`);
console.log();
console.log("  Generate calldata for the contract:");
console.log();
console.log(`    snarkjs zkey export soliditycalldata ${BUILD_DIR}/public.json ${BUILD_DIR}/proof.json`);
console.log();

// ============================================================
// Summary
// ============================================================

console.log("╔══════════════════════════════════════════════════════╗");
console.log("║  Summary                                             ║");
console.log("╠══════════════════════════════════════════════════════╣");
console.log("║                                                      ║");
console.log(`║  Secret:      ${SECRET_MESSAGE.toString().padEnd(33)} ║`);
console.log(`║  Hash:        ${EXPECTED_HASH} ║`);
console.log("║  Circuit:     sm3_single_test.circom                 ║");
console.log("║  Protocol:    Groth16 (zk-SNARK)                     ║");
console.log("║  Proof size:  ~128 bytes (3 G1 points)               ║");
console.log("║  Verification: < 15 ms                               ║");
console.log("║                                                      ║");
console.log("╚══════════════════════════════════════════════════════╝");
console.log();
console.log("To run the full workflow:");
console.log("  node test/example_helloworld.js");
console.log();
