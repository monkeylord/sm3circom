#!/usr/bin/env node
// powersoftau.js — Powers of Tau 仪式 (Phase 1)
// 用法:
//   node scripts/powersoftau.js new    <power> <out.ptau>
//   node scripts/powersoftau.js contribute <in.ptau> <out.ptau>
//   node scripts/powersoftau.js prepare <in.ptau> <out.ptau>

const { execSync } = require("child_process");

const command = process.argv[2];
const args = process.argv.slice(3);

function usage() {
    console.log("Powers of Tau ceremony (Phase 1) — 可跨电路复用");
    console.log();
    console.log("Usage:");
    console.log("  node scripts/powersoftau.js new        <power> <out.ptau>");
    console.log("  node scripts/powersoftau.js contribute <in.ptau> <out.ptau>");
    console.log("  node scripts/powersoftau.js prepare    <in.ptau> <out.ptau>");
    console.log();
    console.log("power = 2^N constraint limit. Common values:");
    console.log("  18 = 262k constraints (单块电路)");
    console.log("  19 = 524k constraints (三块电路)");
    console.log("  20 = 1M constraints");
    console.log();
    console.log("Example:");
    console.log("  node scripts/powersoftau.js new 19 build/pot_0000.ptau");
    console.log("  node scripts/powersoftau.js contribute build/pot_0000.ptau build/pot_0001.ptau");
    console.log("  node scripts/powersoftau.js prepare build/pot_0001.ptau build/pot_final.ptau");
}

if (!command || command === "--help") { usage(); process.exit(0); }

if (command === "new") {
    if (args.length < 2) { usage(); process.exit(1); }
    const power = args[0];
    const out = args[1];
    console.log(`Powers of Tau: new ceremony (power=${power})`);
    execSync(`snarkjs powersoftau new bn128 ${power} "${out}" -v`, { stdio: "inherit" });
    console.log(`\nOutput: ${out}`);

} else if (command === "contribute") {
    if (args.length < 2) { usage(); process.exit(1); }
    const inp = args[0];
    const out = args[1];
    const name = args[2] || `contributor-${Date.now()}`;
    console.log(`Powers of Tau: contribute (${name})`);
    execSync(`snarkjs powersoftau contribute "${inp}" "${out}" --name="${name}" -v -e="entropy-${Date.now()}"`, { stdio: "inherit" });
    console.log(`\nOutput: ${out}`);

} else if (command === "prepare") {
    if (args.length < 2) { usage(); process.exit(1); }
    const inp = args[0];
    const out = args[1];
    console.log(`Powers of Tau: prepare phase2`);
    execSync(`snarkjs powersoftau prepare phase2 "${inp}" "${out}" -v`, { stdio: "inherit" });
    console.log(`\nOutput: ${out}`);

} else {
    console.error(`Unknown command: ${command}`);
    usage();
    process.exit(1);
}
