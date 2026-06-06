#!/usr/bin/env node
// verify.js — 验证 Groth16 证明
// 用法: node scripts/verify.js <vkey.json> <proof.json> <public.json>

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
if (args.length < 3 || args[0] === "--help") {
    console.log("Usage: node scripts/verify.js <vkey.json> <proof.json> <public.json>");
    console.log();
    console.log("Verifies a Groth16 zero-knowledge proof.");
    console.log();
    console.log("Example:");
    console.log("  node scripts/verify.js build/my_circuit.vkey.json \\");
    console.log("      build/proof.json build/public.json");
    process.exit(0);
}

const vkeyFile = path.resolve(args[0]);
const proofFile = path.resolve(args[1]);
const publicFile = path.resolve(args[2]);

if (!fs.existsSync(vkeyFile))  { console.error(`ERROR: vkey not found: ${vkeyFile}`); process.exit(1); }
if (!fs.existsSync(proofFile)) { console.error(`ERROR: proof not found: ${proofFile}`); process.exit(1); }
if (!fs.existsSync(publicFile)){ console.error(`ERROR: public not found: ${publicFile}`); process.exit(1); }

console.log(`VKey:     ${path.basename(vkeyFile)}`);
console.log(`Proof:    ${path.basename(proofFile)}`);
console.log(`Public:   ${path.basename(publicFile)}`);

// Show public inputs
try {
    const pubData = JSON.parse(fs.readFileSync(publicFile, "utf8"));
    const preview = JSON.stringify(pubData);
    console.log(`Inputs:   ${preview.substring(0, 100)}${preview.length > 100 ? "..." : ""}`);
} catch (e) { /* ignore */ }

console.log();

const cmd = `snarkjs groth16 verify "${vkeyFile}" "${publicFile}" "${proofFile}"`;
console.log(`$ ${cmd}`);
try {
    const result = execSync(cmd, { stdio: "pipe", timeout: 10000 });
    if (result.toString().includes("OK!")) {
        console.log();
        console.log("════════════════════════════════════════");
        console.log("  ✓ VERIFIED");
        console.log("════════════════════════════════════════");
    } else {
        console.log();
        console.log("════════════════════════════════════════");
        console.log("  ✗ VERIFICATION FAILED");
        console.log("════════════════════════════════════════");
        process.exit(1);
    }
} catch (e) {
    console.log();
    console.log("════════════════════════════════════════");
    console.log("  ✗ VERIFICATION FAILED");
    console.log("════════════════════════════════════════");
    process.exit(1);
}
