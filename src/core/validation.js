const fs = require("fs");
const path = require("path");

const { tokenize } = require("./tokenizer");
const { parseBlocks } = require("./blockParser");
const { parseFile } = require("./parser");
const { BUILTIN_META_KEYS } = require("./metaKeys");
const { analyzePmlTrustSync } = require("./trust");

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

function validatePmlFile(filename, options = {}) {
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
    if (token.type === "inlineMacro" && token.error) {
      addIssue(issues, "error", `Invalid inline macro on line ${token.line}: ${token.error}`);
    }
  }

  for (const importFile of Array.isArray(localAst.tags_import) ? localAst.tags_import : []) {
    const resolved = path.resolve(baseDir, normalizeFileRef(importFile));
    if (!fs.existsSync(resolved)) {
      addIssue(issues, "error", `Missing @tags_import file: ${resolved}`);
    }
  }

  for (const importFile of Array.isArray(localAst.participants_import) ? localAst.participants_import : []) {
    const resolved = path.resolve(baseDir, normalizeFileRef(importFile));
    if (!fs.existsSync(resolved)) {
      addIssue(issues, "error", `Missing @participants_import file: ${resolved}`);
    }
  }

  for (const importFile of Array.isArray(localAst.macros_import) ? localAst.macros_import : []) {
    const resolved = path.resolve(baseDir, normalizeFileRef(importFile));
    if (!fs.existsSync(resolved)) {
      addIssue(issues, "error", `Missing @macros_import file: ${resolved}`);
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

  const trustReport = analyzePmlTrustSync(fullPath, {
    registrySources: Array.isArray(options.trustRegistry) ? options.trustRegistry : [],
  });

  for (const macro of trustReport.macros || []) {
    if (macro.effective_trust === "untrusted") {
      addIssue(
        issues,
        options.trustMode === "strict" ? "error" : "warning",
        `Untrusted macro "${macro.alias}" detected: ${macro.reasons.join(", ") || "policy violation"}`
      );
    }
  }

  for (const imported of trustReport.imports || []) {
    if (imported.effective_trust === "untrusted") {
      addIssue(
        issues,
        options.trustMode === "strict" ? "error" : "warning",
        `Imported PML "${imported.name}" is untrusted: ${imported.reasons.join(", ") || "policy violation"}`
      );
    }
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
      inline_macros: countKeys(localAst.inline_macros),
      imports: countKeys(localAst.imports),
      tag_imports: countItems(localAst.tags_import),
      participants_imports: countItems(localAst.participants_import),
      macros_imports: countItems(localAst.macros_import),
    },
    imports: Object.entries(localAst.imports || {}).map(([name, entry]) => ({
      name,
      file: normalizeFileRef(entry.file),
      format: String(entry.format || "text").toLowerCase(),
    })),
    tags_imports: (Array.isArray(localAst.tags_import) ? localAst.tags_import : []).map(normalizeFileRef),
    participants_imports: (Array.isArray(localAst.participants_import) ? localAst.participants_import : []).map(normalizeFileRef),
    macros_imports: (Array.isArray(localAst.macros_import) ? localAst.macros_import : []).map(normalizeFileRef),
    macros: Object.entries(localAst.macros || {}).map(([name, file]) => ({
      name,
      file: normalizeFileRef(file),
    })),
    inline_macros: Object.entries(localAst.inline_macros || {}).map(([name, entry]) => ({
      name,
      line: entry.line,
    })),
    trust: {
      effective_trust: trustReport.effective_trust,
      signature_status: trustReport.signature_status,
      author: trustReport.author,
      author_trust: trustReport.author_trust,
      macro_counts: {
        trusted: (trustReport.macros || []).filter((entry) => entry.effective_trust === "trusted").length,
        unknown: (trustReport.macros || []).filter((entry) => entry.effective_trust === "unknown").length,
        untrusted: (trustReport.macros || []).filter((entry) => entry.effective_trust === "untrusted").length,
      },
      imported_pml_untrusted: (trustReport.imports || []).filter((entry) => entry.effective_trust === "untrusted").length,
      macros: trustReport.macros || [],
      imports: trustReport.imports || [],
    },
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

    if (Array.isArray(report.summary.participants_imports) && report.summary.participants_imports.length) {
      lines.push("Participant imports:");
      for (const entry of report.summary.participants_imports) {
        lines.push(`- ${entry}`);
      }
    }

    if (Array.isArray(report.summary.macros_imports) && report.summary.macros_imports.length) {
      lines.push("Macro imports:");
      for (const entry of report.summary.macros_imports) {
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

    if (verbosity >= 2 && Array.isArray(report.summary.inline_macros) && report.summary.inline_macros.length) {
      lines.push("Inline macros:");
      for (const entry of report.summary.inline_macros) {
        lines.push(`- ${entry.name} (line ${entry.line})`);
      }
    }

    if (report.summary.trust) {
      lines.push(`Trust: ${report.summary.trust.effective_trust} (signature=${report.summary.trust.signature_status}, author=${report.summary.trust.author || "(none)"}, author_trust=${report.summary.trust.author_trust || "unknown"})`);
      const macroCounts = report.summary.trust.macro_counts || {};
      if (macroCounts.trusted || macroCounts.unknown || macroCounts.untrusted) {
        lines.push(`Macro trust: trusted=${macroCounts.trusted || 0}, unknown=${macroCounts.unknown || 0}, untrusted=${macroCounts.untrusted || 0}`);
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
      if (Array.isArray(report.summary.participants_imports)) {
        for (const entry of report.summary.participants_imports) {
          lines.push(`- participant import detected: ${entry}`);
        }
      }
      if (Array.isArray(report.summary.macros_imports)) {
        for (const entry of report.summary.macros_imports) {
          lines.push(`- macro import detected: ${entry}`);
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
      if (Array.isArray(report.summary.inline_macros)) {
        for (const entry of report.summary.inline_macros) {
          lines.push(`- inline macro detected: ${entry.name} (line ${entry.line})`);
        }
      }
      if (Array.isArray(report.summary.trust?.macros)) {
        for (const entry of report.summary.trust.macros) {
          lines.push(`- macro trust: ${entry.alias} => ${entry.effective_trust} (signature=${entry.signature_status}, author=${entry.author_trust})`);
        }
      }
      if (Array.isArray(report.summary.trust?.imports)) {
        for (const entry of report.summary.trust.imports) {
          lines.push(`- imported pml trust: ${entry.name} => ${entry.effective_trust}`);
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
