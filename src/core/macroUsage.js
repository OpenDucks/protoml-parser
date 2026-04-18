const fs = require("fs");
const path = require("path");

const { tokenize } = require("./tokenizer");
const { parseBlocks } = require("./blockParser");
const { resolveMacroPath } = require("../cli/options");

function normalizeFileRef(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function getMacroDefinition(baseDir, alias, file) {
  const projectMacroBase = path.resolve(__dirname, "..", "..", "macros");
  const normalized = resolveMacroPath(String(file || ""), projectMacroBase);
  const fullPath = path.isAbsolute(normalized)
    ? normalized
    : path.resolve(baseDir, normalizeFileRef(normalized));

  let actualName = alias;
  if (fs.existsSync(fullPath)) {
    const raw = fs.readFileSync(fullPath, "utf8");
    const match = raw.match(/^=name:(.+)$/m);
    if (match) {
      actualName = match[1].trim();
    }
  }

  return {
    alias,
    actual_name: actualName,
    file: normalizeFileRef(file),
    path: fullPath,
  };
}

function collectMacroUsage(filename, visited = new Set()) {
  const fullPath = path.resolve(filename);
  if (visited.has(fullPath)) {
    return null;
  }
  visited.add(fullPath);

  const raw = fs.readFileSync(fullPath, "utf8");
  const ast = parseBlocks(tokenize(raw));
  const baseDir = path.dirname(fullPath);
  const used = new Set();
  const importedRegistered = [];

  for (const importFile of Array.isArray(ast.macros_import) ? ast.macros_import : []) {
    const resolvedImport = path.resolve(baseDir, normalizeFileRef(importFile));
    if (!fs.existsSync(resolvedImport)) continue;
    const importedAst = parseBlocks(tokenize(fs.readFileSync(resolvedImport, "utf8")));
    for (const [alias, file] of Object.entries(importedAst.macros || {})) {
      importedRegistered.push(getMacroDefinition(path.dirname(resolvedImport), alias, file));
    }
  }

  const registered = [
    ...importedRegistered,
    ...Object.entries(ast.inline_macros || {}).map(([name, entry]) => ({
      alias: name,
      actual_name: name,
      file: "[inline macro]",
      path: `${fullPath}:${entry.line || 0}`,
    })),
    ...Object.entries(ast.macros || {}).map(([alias, file]) =>
      getMacroDefinition(baseDir, alias, file)
    ),
  ];

  for (const line of Array.isArray(ast.meeting) ? ast.meeting : []) {
    const match = String(line).match(/@@macro=([\w-]+):?/);
    if (match) used.add(match[1]);
  }

  const imported = Object.entries(ast.imports || {})
    .filter(([, entry]) => String(entry.format || "").toLowerCase() === "pml")
    .map(([name, entry]) => ({
      name,
      path: path.resolve(baseDir, normalizeFileRef(entry.file)),
      usage: collectMacroUsage(path.resolve(baseDir, normalizeFileRef(entry.file)), visited),
    }));

  return {
    path: fullPath,
    registered,
    used: [...used],
    imported: imported.filter((entry) => entry.usage),
  };
}

function formatMacroUsage(report, indent = "", verbosity = 0) {
  const lines = [];
  lines.push(`${indent}PML file: ${report.path}`);
  lines.push(`${indent}Registered macros: ${report.registered.length}`);
  lines.push(`${indent}Used macros: ${report.used.length}`);

  if (verbosity >= 1) {
    const registeredList = report.registered.map((entry) => (
      entry.alias === entry.actual_name
        ? entry.alias
        : `${entry.alias} -> ${entry.actual_name}`
    ));
    lines.push(`${indent}Registered list: ${registeredList.join(", ") || "(none)"}`);
    lines.push(`${indent}Used list: ${report.used.join(", ") || "(none)"}`);
  }

  if (verbosity >= 3) {
    const unused = report.registered.filter((entry) =>
      !report.used.includes(entry.alias) && !report.used.includes(entry.actual_name)
    );
    const unusedList = unused.map((entry) => (
      entry.alias === entry.actual_name
        ? entry.alias
        : `${entry.alias} -> ${entry.actual_name}`
    ));
    lines.push(`${indent}Unused registered macros: ${unusedList.join(", ") || "(none)"}`);
  }

  if (verbosity >= 2 && report.imported.length) {
    lines.push(`${indent}Imported PML files:`);
    for (const entry of report.imported) {
      lines.push(`${indent}- ${entry.name}: ${entry.path}`);
      lines.push(formatMacroUsage(entry.usage, `${indent}  `, verbosity));
    }
  }

  return lines.join("\n");
}

module.exports = {
  collectMacroUsage,
  formatMacroUsage,
};
