#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const electronPath = require("electron");
const viewerPath = path.join(__dirname, "viewer-workbench.js");
const inputFile = process.argv[2];

const args = inputFile ? [viewerPath, inputFile] : [viewerPath];

spawn(electronPath, args, {
  stdio: "inherit",
});
