#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const inputFile = process.argv[2];
if (!inputFile) {
  console.error("❌ Usage: protoviewer <file.pml>");
  process.exit(1);
}

const electronPath = require("electron");
const viewerPath = path.join(__dirname, "viewer.js");

spawn(electronPath, [viewerPath, inputFile], {
  stdio: "inherit",
});
