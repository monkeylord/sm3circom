#!/usr/bin/env node
// witness.js — 生成电路见证
// 用法: node scripts/witness.js <circuit.wasm> <input.json> <out.wtns>

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
if (args.length < 3 || args[0] === "--help") {
    console.log("Usage: node scripts/witness.js <circuit_js/circuit.wasm> <input.json> <out.wtns>");
    console.log();
    console.log("Generates witness from circuit WASM and input JSON.");
    console.log("The WASM directory must contain generate_witness.js (produced by circom).");
    console.log();
    console.log("Example:");
    console.log("  node scripts/witness.js build/my_circuit_js/my_circuit.wasm \\");
    console.log("      build/input.json build/witness.wtns");
    process.exit(0);
}

const wasmFile = path.resolve(args[0]);
const inputFile = path.resolve(args[1]);
const witnessFile = path.resolve(args[2]);

if (!fs.existsSync(wasmFile)) { console.error(`ERROR: wasm not found: ${wasmFile}`); process.exit(1); }
if (!fs.existsSync(inputFile)) { console.error(`ERROR: input not found: ${inputFile}`); process.exit(1); }

// Find generate_witness.js in the same directory as the wasm
const wasmDir = path.dirname(wasmFile);
const genWitness = path.join(wasmDir, "generate_witness.js");
if (!fs.existsSync(genWitness)) {
    console.error(`ERROR: generate_witness.js not found in ${wasmDir}`);
    console.error("Make sure the circuit was compiled with circom --wasm");
    process.exit(1);
}

console.log(`Circuit:  ${path.basename(wasmDir).replace("_js", "")}`);
console.log(`Input:    ${path.basename(inputFile)}`);
console.log(`Witness:  ${path.basename(witnessFile)}`);
console.log();

const cmd = `node "${genWitness}" "${wasmFile}" "${inputFile}" "${witnessFile}"`;
console.log(`$ ${cmd}`);
execSync(cmd, { stdio: "inherit" });

console.log(`\nOutput: ${witnessFile}`);
