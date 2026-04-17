const fs = require("fs");
const path = require("path");

const { tokenize } = require("./tokenizer");
const { parseBlocks } = require("./blockParser");
const { loadAndMergeImports } = require("./loader");

function normalizeFileRef(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function isObjectBlock(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function serializeMeta(ast) {
  const meta = ast.meta || {};
  const lines = [];

  if (meta.protocol) lines.push(`@protocol "${meta.protocol}"`);
  if (meta.title) lines.push(`@title "${meta.title}"`);

  for (const [key, value] of Object.entries(meta)) {
    if (["protocol", "title", "meeting_title"].includes(key)) continue;
    lines.push(`@${key}:${value}`);
  }

  return lines;
}

function serializeObjectBlock(name, value, formatter) {
  if (!isObjectBlock(value) || !Object.keys(value).length) return [];
  const lines = [`@${name}`];
  for (const [id, entry] of Object.entries(value)) {
    lines.push(`=${id}:${formatter(entry)}`);
  }
  return lines;
}

function serializeListBlock(name, value, prefix = "- ") {
  if (!Array.isArray(value) || !value.length) return [];
  return [`@${name}`, ...value.map((entry) => `${prefix}${entry}`)];
}

function expandMeetingImports(lines, importCache) {
  return lines.flatMap((line) => {
    const match = String(line).trim().match(/^@@(?:import|output)=([^\s]+)$/);
    if (!match) return [line];

    const entry = importCache?.[match[1]];
    if (!entry) return [line];
    if (Array.isArray(entry.content)) return expandMeetingImports(entry.content, importCache);
    return String(entry.content || "").split(/\r?\n/);
  });
}

function bundlePmlFile(filename) {
  const fullPath = path.resolve(filename);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const raw = fs.readFileSync(fullPath, "utf8");
  const ast = parseBlocks(tokenize(raw));
  const mergedAst = loadAndMergeImports(ast, path.dirname(fullPath), {});

  const out = [];
  out.push(...serializeMeta(mergedAst));

  if (mergedAst.macros && Object.keys(mergedAst.macros).length) {
    out.push("");
    for (const [name, file] of Object.entries(mergedAst.macros)) {
      out.push(`@macro ${name} "${normalizeFileRef(file)}"`);
    }
  }

  const participants = serializeObjectBlock("participants", mergedAst.participants, (entry) =>
    [entry.name, entry.alias, entry.email].filter((v) => v != null && v !== "").join(",")
  );
  if (participants.length) out.push("", ...participants);

  const tags = serializeObjectBlock("tags", mergedAst.tags, (entry) => entry);
  if (tags.length) out.push("", ...tags);

  const subjects = serializeObjectBlock("subjects", mergedAst.subjects, (entry) => entry);
  if (subjects.length) out.push("", ...subjects);

  const signatures = serializeObjectBlock("signatures", mergedAst.signatures, (entry) =>
    [entry.name, entry.role, entry.date, entry.note].filter((v) => v != null && v !== "").join(",")
  );
  if (signatures.length) out.push("", ...signatures);

  const approvals = serializeObjectBlock("approvals", mergedAst.approvals, (entry) =>
    [entry.label, entry.status, entry.by, entry.date, entry.notes].filter((v) => v != null && v !== "").join(",")
  );
  if (approvals.length) out.push("", ...approvals);

  if (Array.isArray(mergedAst.references) && mergedAst.references.length) {
    out.push("", "@references", ...mergedAst.references.map((entry) => `- ${entry}`));
  }

  if (Array.isArray(mergedAst.attachments) && mergedAst.attachments.length) {
    out.push("", "@attachments", ...mergedAst.attachments.map((entry) => `- ${entry}`));
  }

  if (Array.isArray(mergedAst.tasks) && mergedAst.tasks.length) {
    out.push("", "@tasks");
    for (const task of mergedAst.tasks) {
      out.push(task.raw || `-[${task.done ? "x" : " "}] ${task.text}`);
    }
  }

  if (Array.isArray(mergedAst.notes) && mergedAst.notes.length) {
    out.push("", "@notes", ...mergedAst.notes.map((entry) => `- ${entry}`));
  }

  if (Array.isArray(mergedAst.meeting) && mergedAst.meeting.length) {
    const meetingTitle = mergedAst.meta?.meeting_title;
    out.push("");
    out.push(meetingTitle ? `@meeting "${meetingTitle}"` : "@meeting");
    const expandedMeeting = expandMeetingImports(mergedAst.meeting, mergedAst._importCache);
    out.push(...expandedMeeting);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

module.exports = {
  bundlePmlFile,
};
