const path = require("path");
const { app, BrowserWindow } = require("electron");
const { getHelpViewerHtmlPath, ensureHelpViewerAssets } = require("../src/utils/viewer.js");

const requestedTopic = process.argv[2] || null;

app.whenReady().then(() => {
  ensureHelpViewerAssets();

  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
    },
    title: "ProtoML Help Viewer",
  });

  const helpPath = getHelpViewerHtmlPath();
  const fileUrl = new URL(`file:///${helpPath.replace(/\\/g, "/")}`);

  if (requestedTopic) {
    const normalizedTopic = String(requestedTopic).replace(/\\/g, "/");
    fileUrl.searchParams.set("topic", normalizedTopic);
  }

  win.loadURL(fileUrl.toString());
});
