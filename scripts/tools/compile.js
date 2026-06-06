#!/usr/bin/env node
// compile.js — 编译 circom 电路 → .r1cs .wasm .sym
// 用法: node scripts/compile.js <circuit.circom> [--out <dir>]

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help") {
    console.log("Usage: node scripts/compile.js <circuit.circom> [--out <build_dir>]");
    console.log();
    console.log("Example:");
    console.log("  node scripts/compile.js circuits/my_circuit.circom --out build/");
    process.exit(0);
}

const circFile = path.resolve(args[0]);
if (!fs.existsSync(circFile)) {
    console.error(`ERROR: circuit file not found: ${circFile}`);
    process.exit(1);
}

let outDir = path.join(path.dirname(circFile), "..", "build");
const outIdx = args.indexOf("--out");
if (outIdx >= 0 && outIdx + 1 < args.length) {
    outDir = path.resolve(args[outIdx + 1]);
}

fs.mkdirSync(outDir, { recursive: true });

console.log(`Compiling: ${circFile}`);
console.log(`Output:    ${outDir}`);
console.log();

const cmd = `circom "${circFile}" --wasm --r1cs --sym -o "${outDir}"`;
console.log(`$ ${cmd}`);
execSync(cmd, { stdio: "inherit" });

// Print summary
const baseName = path.basename(circFile, ".circom");
console.log();
console.log("Generated:");
console.log(`  ${outDir}/${baseName}.r1cs`);
console.log(`  ${outDir}/${baseName}_js/${baseName}.wasm`);
console.log(`  ${outDir}/${baseName}.sym`);
