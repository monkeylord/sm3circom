// SM3 Circom Test Suite
// Validates the circuit against the reference SM3 implementation

const fs = require("fs");
const path = require("path");
const { sm3HashHex } = require("../scripts/sm3/ref.js");
const { sm3Pad, uint32ToBits, bitsToUint32 } = require("../scripts/sm3/padding.js");

const BUILD_DIR = path.join(__dirname, "..", "build");

const TEST_CASES = [
    { name: "abc", message: Buffer.from("abc") },
    { name: "helloworld", message: Buffer.from("helloworld") },
    { name: "empty", message: Buffer.from("") },
    { name: "abcd_x16", message: Buffer.from("abcd".repeat(16)) }
];

console.log("SM3 Circom Library - Test Suite");
console.log("================================\n");

fs.mkdirSync(BUILD_DIR, { recursive: true });

for (const tc of TEST_CASES) {
    const expectedHash = sm3HashHex(tc.message);
    const blocks = sm3Pad(tc.message);

    console.log(`--- ${tc.name} ---`);
    console.log(`  Message:   "${tc.message.toString().slice(0, 40)}${tc.message.length > 40 ? '...' : ''}"`);
    console.log(`  Length:    ${tc.message.length} bytes (${tc.message.length * 8} bits)`);
    console.log(`  Blocks:    ${blocks.length}`);
    console.log(`  SM3 Hash:  ${expectedHash}`);

    // Generate circuit input for the first block
    if (blocks.length === 1) {
        const msg = [];
        for (let w = 0; w < 16; w++) {
            msg.push(uint32ToBits(blocks[0][w]));
        }
        const input = { msg };
        const inputFile = path.join(BUILD_DIR, `input_${tc.name}.json`);
        fs.writeFileSync(inputFile, JSON.stringify(input, null, 2));
        console.log(`  Input:     ${inputFile}`);

        // Show W[0] and W[15] for verification
        console.log(`  W[ 0]:     0x${blocks[0][0].toString(16).padStart(8, '0')}`);
        console.log(`  W[15]:     0x${blocks[0][15].toString(16).padStart(8, '0')}`);
    } else {
        console.log(`  (multi-block, circuit requires SM3(${blocks.length}))`);
    }
    console.log();
}

console.log("================================\n");
console.log("Test vectors computed. To verify the circuit:");
console.log("  1. Compile:  circom circuits/sm3_single_test.circom --wasm --r1cs --sym -o build");
console.log("  2. Witness:  node build/sm3_single_test_js/generate_witness.js \\");
console.log("               build/sm3_single_test_js/sm3_single_test.wasm \\");
console.log("               build/input_abc.json build/witness.wtns");
console.log("  3. Export:   snarkjs wtns export json build/witness.wtns build/witness.json");
console.log("  4. Compare hash output with expected value above");
