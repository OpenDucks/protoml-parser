const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { spawn } = require("child_process");

const REPO_OWNER = "OpenDucks";
const REPO_NAME = "protoml-parser";
const RELEASES_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

function getRepoRoot() {
  return path.resolve(__dirname, "..", "..");
}

function isWindows() {
  return process.platform === "win32";
}

function getCachedChmPath() {
  const localAppData = process.env.LOCALAPPDATA;
  const baseDir = localAppData
    ? path.join(localAppData, "ProtoML", "help")
    : path.join(os.homedir(), "AppData", "Local", "ProtoML", "help");
  return path.join(baseDir, "protoml-help.chm");
}

function getLocalChmCandidates() {
  const repoRoot = getRepoRoot();
  return [
    path.join(repoRoot, "docs", "chm", "protoml-help.chm"),
    path.join(repoRoot, "dist", "protoml-help.chm"),
    getCachedChmPath(),
  ];
}

function resolveExistingChmPath() {
  return getLocalChmCandidates().find((candidate) => fs.existsSync(candidate)) || null;
}

function openChmFile(filePath) {
  if (!isWindows()) {
    throw new Error("Opening CHM help is currently only supported on Windows.");
  }

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error("CHM help file not found.");
  }

  const child = spawn("cmd.exe", ["/c", "start", "", filePath], {
    detached: true,
    stdio: "ignore",
  });

  child.unref();
  return filePath;
}

function request(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent": "protoml-parser",
        "Accept": "application/vnd.github+json, application/octet-stream",
      },
    }, (res) => {
      const statusCode = res.statusCode || 0;

      if ([301, 302, 303, 307, 308].includes(statusCode) && res.headers.location) {
        res.resume();
        if (redirectCount >= 5) {
          reject(new Error("Too many redirects while downloading CHM help."));
          return;
        }
        resolve(request(res.headers.location, redirectCount + 1));
        return;
      }

      if (statusCode >= 400) {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          reject(new Error(`Request failed with status ${statusCode}: ${Buffer.concat(chunks).toString("utf8")}`));
        });
        return;
      }

      resolve(res);
    });

    req.on("error", reject);
  });
}

async function fetchLatestReleaseMetadata() {
  const res = await request(RELEASES_API);
  const chunks = [];

  for await (const chunk of res) {
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function selectChmAsset(release) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];

  return assets.find((asset) => asset?.name === "protoml-help.chm")
    || assets.find((asset) => /\.chm$/i.test(asset?.name || "") && /protoml/i.test(asset?.name || ""))
    || null;
}

async function downloadFile(url, targetFile) {
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  const tempFile = `${targetFile}.download`;
  const res = await request(url);

  await new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(tempFile);
    res.pipe(stream);

    res.on("error", (error) => {
      stream.destroy(error);
    });

    stream.on("close", resolve);
    stream.on("error", (error) => {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      reject(error);
    });
  });

  fs.renameSync(tempFile, targetFile);
  return targetFile;
}

async function downloadLatestChm(targetFile = getCachedChmPath()) {
  const release = await fetchLatestReleaseMetadata();
  const asset = selectChmAsset(release);

  if (!asset?.browser_download_url) {
    throw new Error("No CHM asset was found in the latest GitHub release.");
  }

  await downloadFile(asset.browser_download_url, targetFile);
  return {
    filePath: targetFile,
    releaseName: release.name || release.tag_name || "latest",
    assetName: asset.name,
  };
}

async function ensureChmAvailable() {
  const localPath = resolveExistingChmPath();
  if (localPath) {
    return { filePath: localPath, source: "local" };
  }

  const downloadResult = await downloadLatestChm();
  return {
    filePath: downloadResult.filePath,
    source: "download",
    releaseName: downloadResult.releaseName,
    assetName: downloadResult.assetName,
  };
}

module.exports = {
  getCachedChmPath,
  getLocalChmCandidates,
  resolveExistingChmPath,
  openChmFile,
  downloadLatestChm,
  ensureChmAvailable,
};
