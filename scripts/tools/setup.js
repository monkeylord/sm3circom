#!/usr/bin/env node
// setup.js — Groth16 电路专用设置 (Phase 2)
// 用法: node scripts/setup.js <circuit.r1cs> <pot.ptau> <out.zkey> <out.vkey.json>

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
if (args.length < 4 || args[0] === "--help") {
    console.log("Usage: node scripts/setup.js <circuit.r1cs> <pot_final.ptau> <out.zkey> <out.vkey.json>");
    console.log();
    console.log("Groth16 circuit-specific setup (Phase 2).");
    console.log("Requires Phase 1 output (pot_final.ptau) from powersoftau.js prepare.");
    console.log();
    console.log("Example:");
    console.log("  node scripts/setup.js build/my_circuit.r1cs build/pot_final.ptau \\");
    console.log("      build/my_circuit.zkey build/my_circuit.vkey.json");
    process.exit(0);
}

const r1cs = path.resolve(args[0]);
const ptau = path.resolve(args[1]);
const zkey = path.resolve(args[2]);
const vkey = path.resolve(args[3]);

for (const f of [r1cs, ptau]) {
    if (!fs.existsSync(f)) { console.error(`ERROR: not found: ${f}`); process.exit(1); }
}

const zkey0 = zkey.replace(/\.zkey$/, "_0000.zkey");
const name = path.basename(zkey, ".zkey");

console.log(`Circuit setup: ${path.basename(r1cs)}`);
console.log();

// Step 1: groth16 setup
console.log(`[1/3] groth16 setup`);
execSync(`snarkjs groth16 setup "${r1cs}" "${ptau}" "${zkey0}"`, { stdio: "inherit" });

// Step 2: zkey contribute
console.log(`\n[2/3] zkey contribute`);
execSync(`snarkjs zkey contribute "${zkey0}" "${zkey}" --name="${name}" -v -e="entropy-${Date.now()}"`, { stdio: "inherit" });

// Step 3: export verification key
console.log(`\n[3/3] export verification key`);
execSync(`snarkjs zkey export verificationkey "${zkey}" "${vkey}"`, { stdio: "inherit" });

console.log();
console.log("Output:");
console.log(`  Proving key:      ${zkey}`);
console.log(`  Verification key: ${vkey}`);
