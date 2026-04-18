const path = require("path");
const { spawnSync } = require("child_process");

function getProtoParserCommand() {
  if (process.pkg) {
    return `"${process.execPath}" viewer app "%1"`;
  }

  const cliPath = path.resolve(__dirname, "..", "..", "bin", "protoparser.js");
  return `"${process.execPath}" "${cliPath}" viewer app "%1"`;
}

function runRegistryAdd(args) {
  const result = spawnSync("reg", ["add", ...args], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.status !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw new Error(details || "Failed to update Windows file association.");
  }
}

function associatePmlFiles() {
  if (process.platform !== "win32") {
    throw new Error("Windows file association is only available on Windows.");
  }

  const progId = "ProtoML.Document";
  const command = getProtoParserCommand();
  const icon = `"${process.execPath}",0`;
  const keys = [
    ["HKCU\\Software\\Classes\\.pml", "/ve", "/d", progId, "/f"],
    ["HKCU\\Software\\Classes\\ProtoML.Document", "/ve", "/d", "ProtoML Document", "/f"],
    ["HKCU\\Software\\Classes\\ProtoML.Document\\DefaultIcon", "/ve", "/d", icon, "/f"],
    ["HKCU\\Software\\Classes\\ProtoML.Document\\shell", "/ve", "/d", "open", "/f"],
    ["HKCU\\Software\\Classes\\ProtoML.Document\\shell\\open", "/ve", "/d", "Open with ProtoML Viewer", "/f"],
    ["HKCU\\Software\\Classes\\ProtoML.Document\\shell\\open\\command", "/ve", "/d", command, "/f"],
  ];

  for (const keyArgs of keys) {
    runRegistryAdd(keyArgs);
  }

  return {
    extension: ".pml",
    progId,
    command,
  };
}

module.exports = {
  associatePmlFiles,
};
