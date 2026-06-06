#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { sm3Pad } = require("./padding.js");
const { sm3HashHex } = require("./ref.js");

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help") {
    console.log("Usage: node scripts/sm3/pad.js <message> [--out <input.json>]");
    console.log('Example: node scripts/sm3/pad.js "hello world" --out build/input.json');
    process.exit(0);
}
let message = "", outFile = null;
for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out" && i + 1 < args.length) outFile = args[++i];
    else if (!args[i].startsWith("--")) message += (message ? " " : "") + args[i];
}
if (!message) { console.error("ERROR: no message"); process.exit(1); }

const msgBuf = Buffer.from(message);
const blocks = sm3Pad(msgBuf);
const k = blocks.length;
const hash = sm3HashHex(msgBuf);
const circuitMap = { 1: "sm3_1block_test", 2: "sm3_2block_test", 3: "sm3_3block_test" };

let input;
if (k === 1) {
    input = { msg_val: blocks[0] };
} else {
    input = { msg_blocks_val: blocks };
}
console.log(`Message: "${message}"  Bytes: ${msgBuf.length}  Blocks: ${k} (${circuitMap[k] || `SM3(${k})`})`);
console.log(`SM3:     ${hash}`);
if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(input, null, 2));
    console.log(`Input:   ${outFile}`);
} else { console.log(JSON.stringify(input)); }
