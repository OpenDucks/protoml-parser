const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function getRepoRoot() {
  return path.resolve(__dirname, "..", "..");
}

function getViewerHtmlPath() {
  return path.join(getRepoRoot(), "web", "index.html");
}

function getViewerBundlePath() {
  return path.join(getRepoRoot(), "web", "parser.bundle.js");
}

function getHelpViewerHtmlPath() {
  return path.join(getRepoRoot(), "docs", "chm", "help-viewer.html");
}

function ensureViewerAssets() {
  const htmlPath = getViewerHtmlPath();
  const bundlePath = getViewerBundlePath();

  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Viewer HTML not found: ${htmlPath}`);
  }

  if (!fs.existsSync(bundlePath)) {
    throw new Error(`Viewer bundle not found: ${bundlePath}. Run "npm run build:web" first.`);
  }

  return { htmlPath, bundlePath };
}

function ensureHelpViewerAssets() {
  const helpPath = getHelpViewerHtmlPath();
  if (!fs.existsSync(helpPath)) {
    throw new Error(`Help viewer HTML not found: ${helpPath}. Run "npm run build:chm:project" first.`);
  }

  return { helpPath };
}

function openExternalTarget(target) {
  if (process.platform === "win32") {
    const child = spawn("cmd.exe", ["/c", "start", "", target], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return;
  }

  if (process.platform === "darwin") {
    const child = spawn("open", [target], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return;
  }

  const child = spawn("xdg-open", [target], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function buildViewerUrl(inputFile) {
  const { htmlPath } = ensureViewerAssets();
  const baseUrl = new URL(`file:///${htmlPath.replace(/\\/g, "/")}`);

  if (inputFile) {
    const resolvedInput = path.resolve(process.cwd(), inputFile);
    if (!fs.existsSync(resolvedInput)) {
      throw new Error(`Input file not found: ${resolvedInput}`);
    }

    baseUrl.searchParams.set("filename", path.basename(resolvedInput));
    baseUrl.searchParams.set("source", fs.readFileSync(resolvedInput, "utf8"));
  }

  return baseUrl.toString();
}

function openViewerInBrowser(inputFile) {
  const target = buildViewerUrl(inputFile);
  openExternalTarget(target);
  return target;
}

function buildHelpViewerUrl(topicFile = null) {
  const { helpPath } = ensureHelpViewerAssets();
  const baseUrl = new URL(`file:///${helpPath.replace(/\\/g, "/")}`);

  if (topicFile) {
    baseUrl.searchParams.set("topic", topicFile.replace(/\\/g, "/"));
  }

  return baseUrl.toString();
}

function openHelpViewerInBrowser(topicFile = null) {
  const target = buildHelpViewerUrl(topicFile);
  openExternalTarget(target);
  return target;
}

module.exports = {
  getViewerHtmlPath,
  getHelpViewerHtmlPath,
  ensureViewerAssets,
  ensureHelpViewerAssets,
  buildViewerUrl,
  buildHelpViewerUrl,
  openViewerInBrowser,
  openHelpViewerInBrowser,
};
