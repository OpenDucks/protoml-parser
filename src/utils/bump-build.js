const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..", "..");
const pkgPath = path.join(projectRoot, "package.json");
const distDir = path.join(projectRoot, "dist");
const chmSource = path.join(projectRoot, "docs", "chm", "protoml-help.chm");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const baseVersion = pkg.version?.split("+")[0] || "1.0.0";

pkg.build = typeof pkg.build === "number" ? pkg.build + 1 : 1;
pkg.version = `${baseVersion}+build${pkg.build}`;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");

console.log(`Build bumped to ${pkg.build}`);
console.log(`Version set to ${pkg.version}`);

function run(command) {
  execSync(command, {
    cwd: projectRoot,
    stdio: "inherit",
  });
}

function getGlobalNpmRoot() {
  return execSync("npm root -g", {
    cwd: projectRoot,
    encoding: "utf8",
  }).trim();
}

function ensureDistDir() {
  fs.mkdirSync(distDir, { recursive: true });
}

function copyChmToDist() {
  if (!fs.existsSync(chmSource)) {
    throw new Error(`CHM file not found: ${chmSource}`);
  }

  const target = path.join(distDir, path.basename(chmSource));
  fs.copyFileSync(chmSource, target);
  console.log(`Copied CHM to dist: ${target}`);
}

function createChecksums() {
  const files = fs.readdirSync(distDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name !== "SHA256SUMS.txt")
    .sort();

  const lines = files.map((name) => {
    const fullPath = path.join(distDir, name);
    const hash = crypto.createHash("sha256").update(fs.readFileSync(fullPath)).digest("hex");
    return `${hash}  ${name}`;
  });

  const checksumsPath = path.join(distDir, "SHA256SUMS.txt");
  fs.writeFileSync(checksumsPath, lines.join("\n") + "\n", "utf8");
  console.log(`Checksums written: ${checksumsPath}`);
}

try {
  console.log("Building executables...");
  run("npm run build:exe");

  console.log("Building CHM help...");
  run("npm run build:chm");

  ensureDistDir();
  copyChmToDist();
  createChecksums();

  console.log("Uninstalling old global version...");
  execSync("npm uninstall -g protoml-parser", { stdio: "inherit" });

  console.log("Reinstalling new global version...");
  execSync("npm install -g .", { cwd: projectRoot, stdio: "inherit" });

  const globalBin = path.join(getGlobalNpmRoot(), "protoml-parser", "bin", "protoparser.js");
  if (!fs.existsSync(globalBin)) {
    throw new Error(`Installed global CLI not found: ${globalBin}`);
  }

  const output = execSync(`node "${globalBin}" --version`, {
    cwd: projectRoot,
    encoding: "utf8",
  });
  console.log("Version output from protoparser:");
  console.log(output);
} catch (err) {
  console.error("Release prep failed:", err.message || err);
  process.exit(1);
}
