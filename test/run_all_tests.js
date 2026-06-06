const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { sm3HashHex } = require("../scripts/sm3/ref.js");
const { sm3Pad } = require("../scripts/sm3/padding.js");
const BUILD_DIR = path.join(__dirname, "..", "build");

const TEST_CASES = [
    { name: "empty",      msg: "",                circuit: "sm3_1block_test", blocks: 1 },
    { name: "a",          msg: "a",               circuit: "sm3_1block_test", blocks: 1 },
    { name: "abc",        msg: "abc",             circuit: "sm3_1block_test", blocks: 1 },
    { name: "helloworld", msg: "helloworld",      circuit: "sm3_1block_test", blocks: 1 },
    { name: "55x_A",      msg: "A".repeat(55),     circuit: "sm3_1block_test", blocks: 1 },
    { name: "56x_B",      msg: "B".repeat(56),     circuit: "sm3_2block_test",  blocks: 2 },
    { name: "64x_abcd",   msg: "abcd".repeat(16),  circuit: "sm3_2block_test",  blocks: 2 },
    { name: "119x_C",     msg: "C".repeat(119),    circuit: "sm3_2block_test",  blocks: 2 },
    { name: "120x_D",     msg: "D".repeat(120),    circuit: "sm3_3block_test",  blocks: 3 },
];

const results = TEST_CASES.map(tc => {
    const msgBuf = Buffer.from(tc.msg);
    const expectedHash = sm3HashHex(msgBuf);
    const padded = sm3Pad(msgBuf);
    return { ...tc, msgBuf, expectedHash, padded };
});

// Disp
console.log("═".repeat(72));
console.log("  SM3 Circuit Test Suite (paper-optimized)");
console.log("═".repeat(72));
for (const r of results) {
    console.log(`  ${r.name.padEnd(14)} ${String(r.msgBuf.length).padStart(3)}B  ${r.blocks}blk  ${r.expectedHash}`);
}

// Inputs
console.log("\nGenerating inputs...");
fs.mkdirSync(BUILD_DIR, { recursive: true });
for (const r of results) {
    const inputFile = path.join(BUILD_DIR, `input_${r.name}.json`);
    const input = r.blocks === 1
        ? { msg_val: r.padded[0] }
        : { msg_blocks_val: r.padded };
    fs.writeFileSync(inputFile, JSON.stringify(input, null, 2));
    console.log(`  ✓ ${r.name.padEnd(14)} → ${inputFile}`);
}

// Hash verification
console.log("\n" + "═".repeat(72));
console.log("  Hash Verification");
console.log("═".repeat(72));

function parseHashSym(symFile) {
    if (!fs.existsSync(symFile)) return null;
    const lines = fs.readFileSync(symFile, "utf8").trim().split("\n");
    const map = {}; // r -> witnessIdx
    for (const line of lines) {
        const p = line.split(",");
        if (p.length > 3) {
            const m = p[3].match(/main\.hash_val\[(\d+)\]/);
            if (m) map[parseInt(m[1])] = parseInt(p[0]);
        }
    }
    return Object.keys(map).length === 8 ? map : null;
}

function readHash(witnessFile, hashMap) {
    if (!fs.existsSync(witnessFile)) return null;
    const w = JSON.parse(fs.readFileSync(witnessFile));
    const words = [];
    for (let r = 0; r < 8; r++) {
        const idx = hashMap[r];
        if (idx === undefined) return null;
        words.push(BigInt(w[idx]).toString(16).padStart(8, "0"));
    }
    return words.join("");
}

let p = 0, f = 0, s = 0;
for (const r of results) {
    const symFile = path.join(BUILD_DIR, `${r.circuit}.sym`);
    const wjFile = path.join(BUILD_DIR, `witness_${r.name}.json`);
    const hm = parseHashSym(symFile);
    if (!hm || !fs.existsSync(wjFile)) { console.log(`  ? ${r.name.padEnd(14)} no sym/witness`); s++; continue; }
    const ch = readHash(wjFile, hm);
    if (!ch) { s++; continue; }
    if (ch === r.expectedHash) { console.log(`  ✓ ${r.name.padEnd(14)} ${ch.substring(0, 16)}...`); p++; }
    else { console.log(`  ✗ ${r.name.padEnd(14)} got ${ch.substring(0, 16)}... expected ${r.expectedHash.substring(0, 16)}...`); f++; }
}
console.log(`\n  Hash: ${p} passed, ${f} failed, ${s} skipped`);

// ZK Proof
console.log("\n" + "═".repeat(72));
console.log("  ZK Proof Verification");
console.log("═".repeat(72));
let pp = 0, pf = 0, ps = 0;
const allCircuits = [...new Set(results.map(r => r.circuit))];
for (const r of results) {
    const zkey = path.join(BUILD_DIR, `${r.circuit}.zkey`);
    const witness = path.join(BUILD_DIR, `witness_${r.name}.wtns`);
    const proof = path.join(BUILD_DIR, `proof_${r.name}.json`);
    const pub = path.join(BUILD_DIR, `public_${r.name}.json`);
    if (!fs.existsSync(zkey) || !fs.existsSync(witness)) { console.log(`  - ${r.name.padEnd(14)} no zkey/witness`); ps++; continue; }
    try { execSync(`snarkjs groth16 prove "${zkey}" "${witness}" "${proof}" "${pub}"`, { stdio: "pipe", timeout: 120000 }); }
    catch (e) { console.log(`  ✗ ${r.name.padEnd(14)} prove failed: ${e.message.split('\n')[0].substring(0, 50)}`); pf++; continue; }
    let ok = false;
    for (const c of allCircuits) {
        const vk = path.join(BUILD_DIR, `verification_key_${c}.json`);
        if (!fs.existsSync(vk)) continue;
        try { if (execSync(`snarkjs groth16 verify "${vk}" "${pub}" "${proof}"`, { stdio: "pipe", timeout: 10000 }).toString().includes("OK!")) { ok = true; break; } }
        catch (e) { }
    }
    console.log(ok ? `  ✓ ${r.name.padEnd(14)} prove + verify OK` : `  ✗ ${r.name.padEnd(14)} verify failed`);
    ok ? pp++ : pf++;
}
console.log(`\n  Proof: ${pp} passed, ${pf} failed, ${ps} skipped`);
console.log("\n" + "═".repeat(72));
console.log(`  FINAL: hash ${p}/${p+f}  proof ${pp}/${pp+pf}`);
console.log("═".repeat(72));
process.exit((f + pf) > 0 ? 1 : 0);
