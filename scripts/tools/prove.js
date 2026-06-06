#!/usr/bin/env node
// prove.js — 生成 Groth16 零知识证明
// 用法: node scripts/prove.js <circuit.zkey> <witness.wtns> <proof.json> <public.json>

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
if (args.length < 4 || args[0] === "--help") {
    console.log("Usage: node scripts/prove.js <circuit.zkey> <witness.wtns> <proof.json> <public.json>");
    console.log();
    console.log("Generates a Groth16 zero-knowledge proof from a witness.");
    console.log();
    console.log("Example:");
    console.log("  node scripts/prove.js build/my_circuit.zkey build/witness.wtns \\");
    console.log("      build/proof.json build/public.json");
    process.exit(0);
}

const zkeyFile = path.resolve(args[0]);
const witnessFile = path.resolve(args[1]);
const proofFile = path.resolve(args[2]);
const publicFile = path.resolve(args[3]);

if (!fs.existsSync(zkeyFile))    { console.error(`ERROR: zkey not found: ${zkeyFile}`); process.exit(1); }
if (!fs.existsSync(witnessFile)) { console.error(`ERROR: witness not found: ${witnessFile}`); process.exit(1); }

console.log(`ZKey:     ${path.basename(zkeyFile)}`);
console.log(`Witness:  ${path.basename(witnessFile)}`);
console.log(`Proof:    ${path.basename(proofFile)}`);
console.log(`Public:   ${path.basename(publicFile)}`);
console.log();

const startTime = Date.now();
const cmd = `snarkjs groth16 prove "${zkeyFile}" "${witnessFile}" "${proofFile}" "${publicFile}"`;
console.log(`$ ${cmd}`);
execSync(cmd, { stdio: "inherit" });

const elapsed = Date.now() - startTime;
const size = fs.statSync(proofFile).size;

console.log();
console.log(`Proof generated: ${size} bytes, ${elapsed}ms`);
console.log(`  Proof:  ${proofFile}`);
console.log(`  Public: ${publicFile}`);
