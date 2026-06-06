// Reference SM3 Hash Implementation (JavaScript)
// Used for computing expected hash values for testing the circom circuit
// Implements GM/T 0004-2012 SM3 cryptographic hash algorithm

const SM3_CONSTANTS = {
    IV: [
        0x7380166f, 0x4914b2b9, 0x172442d7, 0xda8a0600,
        0xa96f30bc, 0x163138aa, 0xe38dee4d, 0xb0fb0e4e
    ],
    T: new Array(64)
};

// Initialize T constants
for (let j = 0; j < 64; j++) {
    SM3_CONSTANTS.T[j] = (j < 16) ? 0x79cc4519 : 0x7a879d8a;
}

function rotl(x, n) {
    return ((x << n) | (x >>> (32 - n))) >>> 0;
}

function P0(x) {
    return (x ^ rotl(x, 9) ^ rotl(x, 17)) >>> 0;
}

function P1(x) {
    return (x ^ rotl(x, 15) ^ rotl(x, 23)) >>> 0;
}

function FF(j, x, y, z) {
    if (j < 16) {
        return (x ^ y ^ z) >>> 0;
    } else {
        return ((x & y) | (x & z) | (y & z)) >>> 0;
    }
}

function GG(j, x, y, z) {
    if (j < 16) {
        return (x ^ y ^ z) >>> 0;
    } else {
        return ((x & y) | ((~x) & z)) >>> 0;
    }
}

// Message expansion: given 16-word block, expand to W[0..67] and W'[0..63]
function messageExpand(block) {
    const W = new Array(68);
    for (let i = 0; i < 16; i++) {
        W[i] = block[i];
    }

    for (let j = 16; j < 68; j++) {
        W[j] = (P1(W[j - 16] ^ W[j - 9] ^ rotl(W[j - 3], 15)) ^ rotl(W[j - 13], 7) ^ W[j - 6]) >>> 0;
    }

    const Wp = new Array(64);
    for (let j = 0; j < 64; j++) {
        Wp[j] = (W[j] ^ W[j + 4]) >>> 0;
    }

    return { W, Wp };
}

// Compression function CF(V, B)
function compress(V, B) {
    const { W, Wp } = messageExpand(B);

    let A = V[0], BB = V[1], C = V[2], D = V[3];
    let E = V[4], F = V[5], G = V[6], H = V[7];

    for (let j = 0; j < 64; j++) {
        const SS1 = rotl((rotl(A, 12) + E + rotl(SM3_CONSTANTS.T[j], j)) >>> 0, 7);
        const SS2 = (SS1 ^ rotl(A, 12)) >>> 0;
        const TT1 = (FF(j, A, BB, C) + D + SS2 + Wp[j]) >>> 0;
        const TT2 = (GG(j, E, F, G) + H + SS1 + W[j]) >>> 0;

        D = C;
        C = rotl(BB, 9);
        BB = A;
        A = TT1;
        H = G;
        G = rotl(F, 19);
        F = E;
        E = P0(TT2);
    }

    return [
        (A ^ V[0]) >>> 0,
        (BB ^ V[1]) >>> 0,
        (C ^ V[2]) >>> 0,
        (D ^ V[3]) >>> 0,
        (E ^ V[4]) >>> 0,
        (F ^ V[5]) >>> 0,
        (G ^ V[6]) >>> 0,
        (H ^ V[7]) >>> 0
    ];
}

// SM3 hash of a message (Buffer or Uint8Array)
function sm3Hash(message) {
    const msgBytes = Buffer.from(message);
    const bitLen = msgBytes.length * 8;

    // Padding: append 1 bit (0x80), k zero bits, 64-bit length
    let k = (448 - (bitLen + 1)) % 512;
    if (k < 0) k += 512;
    const totalBytes = (bitLen + 1 + k + 64) / 8;

    const padded = Buffer.alloc(totalBytes);
    msgBytes.copy(padded);
    padded[msgBytes.length] = 0x80;
    padded.writeBigUInt64BE(BigInt(bitLen), totalBytes - 8);

    // Process each 512-bit block
    let V = [...SM3_CONSTANTS.IV];
    for (let i = 0; i < padded.length; i += 64) {
        const block = [];
        for (let j = 0; j < 16; j++) {
            block.push(padded.readUInt32BE(i + j * 4));
        }
        V = compress(V, block);
    }

    return V;
}

// Format hash as hex string
function sm3HashHex(message) {
    const hash = sm3Hash(message);
    return hash.map(w => w.toString(16).padStart(8, '0')).join('');
}

// If run directly, compute test vectors
if (require.main === module) {
    const testCases = [
        { name: "abc", msg: Buffer.from("abc") },
        { name: "helloworld", msg: Buffer.from("helloworld") },
        { name: "empty", msg: Buffer.from("") },
    ];

    for (const tc of testCases) {
        const hash = sm3HashHex(tc.msg);
        console.log(`SM3("${tc.name}") = ${hash}`);
    }
}

module.exports = { sm3Hash, sm3HashHex, compress, messageExpand, SM3_CONSTANTS };
