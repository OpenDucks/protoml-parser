const fs = require("fs");
const path = require("path");
const { app, BrowserWindow } = require("electron");
const { getViewerHtmlPath, ensureViewerAssets } = require("../src/utils/viewer.js");

const inputFile = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : null;

function escapeForJavascript(value) {
  return JSON.stringify(value);
}

app.whenReady().then(() => {
  ensureViewerAssets();

  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
    },
    title: "ProtoML Independent Viewer",
  });

  win.loadFile(getViewerHtmlPath());

  win.webContents.on("did-finish-load", () => {
    if (!inputFile || !fs.existsSync(inputFile)) {
      return;
    }

    const source = fs.readFileSync(inputFile, "utf8");
    const fileName = path.basename(inputFile);
    win.webContents.executeJavaScript(`
      if (window.applyBootstrap) {
        window.applyBootstrap({
          filename: ${escapeForJavascript(fileName)},
          source: ${escapeForJavascript(source)}
        });
      }
    `);
  });
});
