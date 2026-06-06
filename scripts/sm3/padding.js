// SM3 Padding Implementation (off-circuit, per paper Section 5.1.4)
// GM/T 0004-2012 padding rules:
// 1. Append bit '1' to the message
// 2. Append k bits '0' where k is minimal such that (len + 1 + k) ≡ 448 mod 512
// 3. Append 64-bit big-endian representation of original message length in bits

// Expected SM3 test vectors
// Test 1: "abc" -> 66c7f0f4 62eeedd9 d1f2d46b dc10e4e2 4167c487 5cf2f7a2 297da02b 8f4ba8e0
// Test 2: "abcdabcd..." (64 bytes) -> debe9ff9 2275b8a1 38604889 c18e5a4d 6fdb70e5 387e5765 293dcba3 9c0c5732

const TEST_VECTORS = [
    {
        name: "SM3('abc')",
        message: Buffer.from("abc"),
        expected: "66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0"
    },
    {
        name: "SM3(64 bytes of abcd repeated)",
        message: Buffer.from("abcd".repeat(16)),
        expected: "debe9ff92275b8a138604889c18e5a4d6fdb70e5387e5765293dcba39c0c5732"
    },
    {
        name: "SM3(empty)",
        message: Buffer.from(""),
        expected: "" // TODO: add expected value
    }
];

// Pad a message according to SM3 padding rules
// Returns an array of 512-bit blocks, each as 16 uint32 values
function sm3Pad(message) {
    const msgBytes = Buffer.from(message);
    const bitLen = msgBytes.length * 8;

    // Calculate padding: need (bitLen + 1 + k) ≡ 448 mod 512
    // k = (448 - (bitLen + 1)) mod 512
    let k = (448 - (bitLen + 1)) % 512;
    if (k < 0) k += 512;

    const totalBits = bitLen + 1 + k + 64;
    const totalBytes = totalBits / 8;

    const padded = Buffer.alloc(totalBytes);
    msgBytes.copy(padded);

    // Append bit '1' = byte 0x80
    padded[msgBytes.length] = 0x80;

    // Append k bits of 0 (already zero from alloc)
    // Append 64-bit big-endian length
    const lengthOffset = totalBytes - 8;
    padded.writeBigUInt64BE(BigInt(bitLen), lengthOffset);

    // Convert to 512-bit blocks, each as array of 16 uint32 big-endian
    const blocks = [];
    for (let i = 0; i < padded.length; i += 64) {
        const block = [];
        for (let j = 0; j < 16; j++) {
            const offset = i + j * 4;
            block.push(padded.readUInt32BE(offset));
        }
        blocks.push(block);
    }

    return blocks;
}

// Convert a 32-bit integer to a bit array (LSB first = index 0 is LSB)
// Matches circuit Num2Bits convention: out[i] <-- (in >> i) & 1
function uint32ToBits(value) {
    const bits = [];
    for (let i = 0; i < 32; i++) {
        bits.push((value >>> i) & 1);
    }
    return bits;
}

// Convert bit array (LSB first) to 32-bit integer
function bitsToUint32(bits) {
    let value = 0;
    for (let i = 31; i >= 0; i--) {
        value = (value << 1) | (bits[i] & 1);
    }
    return value >>> 0;
}

// Convert padded blocks to circuit input format
// Returns flat array of bits: [block][word][bit]
function blocksToInput(blocks, numBlocks) {
    // Pad with zero blocks if needed
    const input = [];
    for (let b = 0; b < numBlocks; b++) {
        const blockBits = [];
        for (let w = 0; w < 16; w++) {
            const word = (b < blocks.length) ? blocks[b][w] : 0;
            blockBits.push(uint32ToBits(word));
        }
        input.push(blockBits);
    }
    return input;
}

// Convert hash output bits to hex string
function bitsToHex(hashBits) {
    // hashBits: [8][32] array
    let hex = "";
    for (let r = 0; r < 8; r++) {
        const word = bitsToUint32(hashBits[r]);
        hex += word.toString(16).padStart(8, "0");
    }
    return hex;
}

module.exports = {
    TEST_VECTORS,
    sm3Pad,
    uint32ToBits,
    bitsToUint32,
    blocksToInput,
    bitsToHex
};
