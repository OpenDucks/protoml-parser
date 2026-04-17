const fs = require("fs");
const path = require("path");

const { tokenize } = require("./tokenizer");
const { parseBlocks } = require("./blockParser");
const { parseFile } = require("./parser");
const { BUILTIN_META_KEYS } = require("./metaKeys");

function normalizeFileRef(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function addIssue(issues, severity, message) {
  issues.push({ severity, message });
}

function countKeys(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value).length
    : 0;
}

function countItems(value) {
  return Array.isArray(value) ? value.length : 0;
}

function findDuplicateDeclarations(tokens, blockName) {
  const seen = new Set();
  const duplicates = [];
  let currentBlock = null;

  for (const token of tokens) {
    if (token.type === "command") {
      currentBlock = token.value.toLowerCase();
      continue;
    }

    if (currentBlock === blockName && token.type === "declaration") {
      if (seen.has(token.key)) {
        duplicates.push(token.key);
      } else {
        seen.add(token.key);
      }
    }
  }

  return duplicates;
}

function findDuplicateMetaKeys(tokens) {
  const seen = new Set();
  const duplicates = [];

  for (const token of tokens) {
    if (token.type !== "meta" && token.type !== "directive") continue;

    const key = token.type === "directive" ? token.name : token.key;
    if (seen.has(key)) {
      duplicates.push(key);
    } else {
      seen.add(key);
    }
  }

  return duplicates;
}

function validatePmlFile(filename) {
  const fullPath = path.resolve(filename);
  const issues = [];

  if (!fs.existsSync(fullPath)) {
    addIssue(issues, "error", `File not found: ${fullPath}`);
    return { ok: false, path: fullPath, issues };
  }

  const raw = fs.readFileSync(fullPath, "utf8");
  const tokens = tokenize(raw);
  const localAst = parseBlocks(tokens);
  const baseDir = path.dirname(fullPath);

  for (const blockName of ["participants", "subjects", "tags"]) {
    for (const duplicate of findDuplicateDeclarations(tokens, blockName)) {
      addIssue(issues, "warning", `Duplicate ${blockName} ID: ${duplicate}`);
    }
  }

  for (const duplicate of findDuplicateMetaKeys(tokens)) {
    addIssue(issues, "warning", `Duplicate meta key: ${duplicate}`);
  }

  for (const token of tokens) {
    if (token.type === "meta" && BUILTIN_META_KEYS.includes(token.key) && String(token.raw || "").startsWith("@meta=")) {
      addIssue(issues, "warning", `Built-in meta key "${token.key}" is defined via @meta=. Prefer @${token.key}:... for clarity.`);
    }
  }

  for (const importFile of Array.isArray(localAst.tags_import) ? localAst.tags_import : []) {
    const resolved = path.resolve(baseDir, normalizeFileRef(importFile));
    if (!fs.existsSync(resolved)) {
      addIssue(issues, "error", `Missing @tags_import file: ${resolved}`);
    }
  }

  for (const [name, entry] of Object.entries(localAst.imports || {})) {
    const resolved = path.resolve(baseDir, normalizeFileRef(entry.file));
    if (!fs.existsSync(resolved)) {
      addIssue(issues, "error", `Missing @import file for "${name}": ${resolved}`);
    }

    const format = String(entry.format || "text").toLowerCase();
    if (!["html", "pml", "text"].includes(format)) {
      addIssue(issues, "warning", `Unknown import format for "${name}": ${format}`);
    }
  }

  for (const [name, file] of Object.entries(localAst.macros || {})) {
    const normalized = String(file || "").replace("{{macro_dir}}", path.resolve(__dirname, "..", "..", "macros"));
    const resolved = path.isAbsolute(normalized)
      ? normalized
      : path.resolve(baseDir, normalizeFileRef(normalized));
    if (!fs.existsSync(resolved)) {
      addIssue(issues, "error", `Missing macro file for "${name}": ${resolved}`);
    }
  }

  try {
    parseFile(fullPath, { strict: true });
  } catch (err) {
    addIssue(issues, "error", err.message);
  }

  const summary = {
    meta_keys: Object.keys(localAst.meta || {}),
    blocks_present: [
      "participants",
      "subjects",
      "tags",
      "tasks",
      "notes",
      "meeting",
      "signatures",
      "approvals",
      "references",
      "attachments",
    ].filter((key) => localAst[key] && (Array.isArray(localAst[key]) ? localAst[key].length : Object.keys(localAst[key]).length)),
    counts: {
      participants: countKeys(localAst.participants),
      subjects: countKeys(localAst.subjects),
      tags: countKeys(localAst.tags),
      tasks: countItems(localAst.tasks),
      notes: countItems(localAst.notes),
      meeting_lines: countItems(localAst.meeting),
      signatures: countKeys(localAst.signatures),
      approvals: countKeys(localAst.approvals),
      references: countItems(localAst.references),
      attachments: countItems(localAst.attachments),
      macros: countKeys(localAst.macros),
      imports: countKeys(localAst.imports),
      tag_imports: countItems(localAst.tags_import),
    },
    imports: Object.entries(localAst.imports || {}).map(([name, entry]) => ({
      name,
      file: normalizeFileRef(entry.file),
      format: String(entry.format || "text").toLowerCase(),
    })),
    tags_imports: (Array.isArray(localAst.tags_import) ? localAst.tags_import : []).map(normalizeFileRef),
    macros: Object.entries(localAst.macros || {}).map(([name, file]) => ({
      name,
      file: normalizeFileRef(file),
    })),
  };

  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    path: fullPath,
    issues,
    summary,
  };
}

function validateTagFile(filename) {
  const fullPath = path.resolve(filename);
  const issues = [];

  if (!fs.existsSync(fullPath)) {
    addIssue(issues, "error", `File not found: ${fullPath}`);
    return { ok: false, path: fullPath, issues };
  }

  const raw = fs.readFileSync(fullPath, "utf8");
  const ast = parseBlocks(tokenize(raw));
  const baseDir = path.dirname(fullPath);

  if (!ast.tags || !Object.keys(ast.tags).length) {
    addIssue(issues, "error", "Tag file does not define an @tags block.");
  }

  for (const importFile of Array.isArray(ast.tags_import) ? ast.tags_import : []) {
    const resolved = path.resolve(baseDir, normalizeFileRef(importFile));
    if (!fs.existsSync(resolved)) {
      addIssue(issues, "error", `Missing nested @tags_import file: ${resolved}`);
    }
  }

  for (const sourceRef of Array.isArray(ast.tag_sources) ? ast.tag_sources : []) {
    const resolved = path.resolve(baseDir, normalizeFileRef(sourceRef));
    if (!fs.existsSync(resolved)) {
      addIssue(issues, "error", `Missing @tag_sources file: ${resolved}`);
      continue;
    }

    const sourceValidation = validatePmlFile(resolved);
    for (const issue of sourceValidation.issues.filter((entry) => entry.severity === "error")) {
      addIssue(issues, "warning", `Source validation issue in ${resolved}: ${issue.message}`);
    }
  }

  const summary = {
    meta_keys: Object.keys(ast.meta || {}),
    counts: {
      tags: countKeys(ast.tags),
      tag_imports: countItems(ast.tags_import),
      tag_sources: countItems(ast.tag_sources),
    },
    tags_imports: (Array.isArray(ast.tags_import) ? ast.tags_import : []).map(normalizeFileRef),
    tag_sources: (Array.isArray(ast.tag_sources) ? ast.tag_sources : []).map(normalizeFileRef),
  };

  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    path: fullPath,
    issues,
    summary,
  };
}

function formatValidationReport(report, title = "Validation", verbosity = 0) {
  const lines = [];
  lines.push(`${title}: ${report.path}`);
  lines.push(`Status: ${report.ok ? "ok" : "failed"}`);

  if (verbosity > 0 && report.summary) {
    const counts = report.summary.counts || {};
    const countEntries = Object.entries(counts).filter(([, value]) => Number(value) > 0);
    const metaKeys = Array.isArray(report.summary.meta_keys) ? report.summary.meta_keys : [];

    if (metaKeys.length) {
      lines.push(`Meta keys: ${metaKeys.join(", ")}`);
    }

    if (Array.isArray(report.summary.blocks_present) && report.summary.blocks_present.length) {
      lines.push(`Blocks: ${report.summary.blocks_present.join(", ")}`);
    }

    if (countEntries.length) {
      lines.push("Detected:");
      for (const [key, value] of countEntries) {
        lines.push(`- ${key}: ${value}`);
      }
    }

    if (Array.isArray(report.summary.imports) && report.summary.imports.length) {
      lines.push("Imports:");
      for (const entry of report.summary.imports) {
        lines.push(`- ${entry.name}: ${entry.file} (${entry.format})`);
      }
    }

    if (Array.isArray(report.summary.tags_imports) && report.summary.tags_imports.length) {
      lines.push("Tag imports:");
      for (const entry of report.summary.tags_imports) {
        lines.push(`- ${entry}`);
      }
    }

    if (Array.isArray(report.summary.tag_sources) && report.summary.tag_sources.length) {
      lines.push("Tag sources:");
      for (const entry of report.summary.tag_sources) {
        lines.push(`- ${entry}`);
      }
    }

    if (verbosity >= 2 && Array.isArray(report.summary.macros) && report.summary.macros.length) {
      lines.push("Macros:");
      for (const entry of report.summary.macros) {
        lines.push(`- ${entry.name}: ${entry.file}`);
      }
    }

    if (verbosity >= 3) {
      lines.push("Checks:");
      if (Array.isArray(report.summary.imports)) {
        for (const entry of report.summary.imports) {
          lines.push(`- import detected: ${entry.name} (${entry.format}) -> ${entry.file}`);
        }
      }
      if (Array.isArray(report.summary.tags_imports)) {
        for (const entry of report.summary.tags_imports) {
          lines.push(`- tag import detected: ${entry}`);
        }
      }
      if (Array.isArray(report.summary.tag_sources)) {
        for (const entry of report.summary.tag_sources) {
          lines.push(`- tag source detected: ${entry}`);
        }
      }
      if (Array.isArray(report.summary.macros)) {
        for (const entry of report.summary.macros) {
          lines.push(`- macro detected: ${entry.name} -> ${entry.file}`);
        }
      }
    }
  }

  if (!report.issues.length) {
    lines.push("No issues found.");
  } else {
    lines.push("Issues:");
    for (const issue of report.issues) {
      lines.push(`- [${issue.severity}] ${issue.message}`);
    }
  }

  return lines.join("\n");
}

module.exports = {
  validatePmlFile,
  validateTagFile,
  formatValidationReport,
};
