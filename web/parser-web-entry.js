const { tokenize } = require("../src/core/tokenizer.js");
const { parseBlocks } = require("../src/core/blockParser.js");
const { resolveReferences } = require("../src/core/referenceLinker.js");
const { parseInline } = require("../src/core/inlineParser.js");
const renderHTML = require("../src/renders/html.js");
const renderJSON = require("../src/renders/json.js");
const renderMarkdown = require("../src/renders/markdown.js");
const renderText = require("../src/renders/text.js");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function countKeys(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value).length
    : 0;
}

function countItems(value) {
  return Array.isArray(value) ? value.length : 0;
}

function countTaskStates(tasks = []) {
  let open = 0;
  let done = 0;

  for (const task of tasks) {
    if (task?.done) done += 1;
    else open += 1;
  }

  return { open, done };
}

function buildWarnings(tokens, localAst, resolvedAst) {
  const warnings = [];
  const blockDeclarationGroups = ["participants", "subjects", "tags"];
  let currentBlock = null;
  const declarationSeen = new Map();
  const metaSeen = new Set();

  for (const token of tokens) {
    if (token.type === "command") {
      currentBlock = String(token.value || "").toLowerCase();
      continue;
    }

    if (token.type === "meta" || token.type === "directive") {
      const key = token.type === "directive" ? token.name : token.key;
      if (metaSeen.has(key)) {
        warnings.push({
          severity: "warning",
          message: `Duplicate meta key "${key}" on line ${token.line}.`,
        });
      } else {
        metaSeen.add(key);
      }
    }

    if (token.type === "declaration" && blockDeclarationGroups.includes(currentBlock)) {
      const seenKey = `${currentBlock}:${token.key}`;
      if (declarationSeen.has(seenKey)) {
        warnings.push({
          severity: "warning",
          message: `Duplicate ${currentBlock} ID "${token.key}" on line ${token.line}.`,
        });
      } else {
        declarationSeen.set(seenKey, token.line);
      }
    }
  }

  for (const task of localAst.tasks || []) {
    if (task.meta?.ptp && task.assigned_to?.unresolved) {
      warnings.push({
        severity: "error",
        message: `Unresolved participant reference "@ptp=${task.meta.ptp}" in tasks.`,
      });
    }
    if (task.meta?.subject && task.subject?.unresolved) {
      warnings.push({
        severity: "error",
        message: `Unresolved subject reference "=${task.meta.subject}" in tasks.`,
      });
    }
    if (task.meta?.tag && task.tag?.unresolved) {
      warnings.push({
        severity: "warning",
        message: `Unknown task tag "@tag=${task.meta.tag}".`,
      });
    }
  }

  if ((localAst.tags_import || []).length || (localAst.participants_import || []).length || (localAst.macros_import || []).length || countKeys(localAst.imports)) {
    warnings.push({
      severity: "info",
      message: "Browser mode parses the current source only. @import, @tags_import, @participants_import, and @macros_import are not resolved from disk here.",
    });
  }

  if (countKeys(localAst.macros)) {
    warnings.push({
      severity: "info",
      message: "Local @macro declarations are parsed, but browser mode does not load external macro templates from files.",
    });
  }

  if (!countItems(resolvedAst.meeting) && !countItems(resolvedAst.tasks) && !countItems(resolvedAst.notes)) {
    warnings.push({
      severity: "info",
      message: "This document currently has no meeting, task, or note content to render.",
    });
  }

  return warnings;
}

function buildStats(source, tokens, localAst, resolvedAst) {
  const taskState = countTaskStates(resolvedAst.tasks || []);
  const lines = String(source || "").split(/\r?\n/);
  const nonEmptyLines = lines.filter((line) => line.trim()).length;

  return {
    characters: String(source || "").length,
    lines: lines.length,
    non_empty_lines: nonEmptyLines,
    tokens: tokens.length,
    meta_keys: countKeys(localAst.meta),
    participants: countKeys(resolvedAst.participants),
    subjects: countKeys(resolvedAst.subjects),
    tags: countKeys(resolvedAst.tags),
    tasks_total: countItems(resolvedAst.tasks),
    tasks_open: taskState.open,
    tasks_done: taskState.done,
    notes: countItems(resolvedAst.notes),
    meeting_lines: countItems(resolvedAst.meeting),
    references: countItems(resolvedAst.references),
    attachments: countItems(resolvedAst.attachments),
    signatures: countKeys(resolvedAst.signatures),
    approvals: countKeys(resolvedAst.approvals),
    imports: countKeys(localAst.imports),
    tag_imports: countItems(localAst.tags_import),
    participants_imports: countItems(localAst.participants_import),
    macros_imports: countItems(localAst.macros_import),
    local_macros: countKeys(localAst.macros),
  };
}

function parseSource(source) {
  const tokens = tokenize(source);
  const localAst = parseBlocks(tokens);
  const resolvedAst = parseInline(resolveReferences(clone(localAst)));
  const stats = buildStats(source, tokens, localAst, resolvedAst);
  const warnings = buildWarnings(tokens, localAst, resolvedAst);

  return {
    tokens,
    localAst,
    ast: resolvedAst,
    stats,
    warnings,
  };
}

function parseTextToHTML(source, options = {}) {
  return renderHTML(parseSource(source).ast, options);
}

function parseTextToJSON(source) {
  return renderJSON(parseSource(source).ast);
}

function parseTextToMarkdown(source, options = {}) {
  return renderMarkdown(parseSource(source).ast, options);
}

function parseTextToText(source, options = {}) {
  return renderText(parseSource(source).ast, options);
}

module.exports = {
  parseSource,
  parseTextToHTML,
  parseTextToJSON,
  parseTextToMarkdown,
  parseTextToText,
};
