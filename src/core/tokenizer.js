const path = require("path")
const { stripInlineComment } = require("./commentUtils")

function tokenize(text) {
  const lines = text.split(/\r?\n/);
  const tokens = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = stripInlineComment(lines[i]).trim();
    const line = i + 1;

    if (raw === "" || raw.startsWith("//")) {
      continue; // skip empty lines and comments
    }
    if (raw.match(/^@\w+:/)) {
      const [key, ...val] = raw.slice(1).split(":");
      tokens.push({type: "meta", raw, key, value: val.join(":").trim(), line});
      continue;
    }

    if (raw.startsWith("@meta=")) {
      const match = raw.match(/^@meta=([^:]+):(.+)$/);
      if (match) {
        tokens.push({
          type: "meta",
          raw,
          key: match[1].trim(),
          value: match[2].trim(),
          line,
        });
        continue;
      }
    }

    if (raw.startsWith("@macro ")) {
      const match = raw.match(/^@macro\s+([^\s]+)\s+"(.+?)"$/);
      if (!match) {
        continue;
      }
      const [, name, fileRaw] = match;
      const projectRoot = path.resolve(__dirname, "../../");
      const macroDir = path.join(projectRoot, "macros");
      const file = fileRaw.replace("{{macro_dir}}", macroDir);

      tokens.push({type: "macro", name, file, raw, line});
      continue;
    }

    if (raw.startsWith("@import ")) {
      const match = raw.match(/^@import\s+([^\s]+)\s+"(.+?)"(?:\s+([^\s]+))?$/);
      if (match) {
        const [, name, file, format] = match;
        tokens.push({
          type: "import",
          name,
          file,
          format: (format || "text").toLowerCase(),
          raw,
          line,
        });
        continue;
      }
    }

    if (raw.startsWith("@tags_import ")) {
      const match = raw.match(/^@tags_import\s+"(.+?)"$/);
      if (match) {
        tokens.push({
          type: "tagsImport",
          file: match[1],
          raw,
          line,
        });
        continue;
      }
    }

    if (raw.startsWith("@protocol ")) {
      const match = raw.match(/^@protocol\s+"(.+?)"$/);
      if (match) {
        tokens.push({
          type: "directive",
          name: "protocol",
          value: match[1],
          raw,
          line,
        });
        continue;
      }
    }

    if (raw.startsWith("@title ")) {
      const match = raw.match(/^@title\s+"(.+?)"$/);
      if (match) {
        tokens.push({
          type: "directive",
          name: "title",
          value: match[1],
          raw,
          line,
        });
        continue;
      }
    }

    if (raw.startsWith("@meeting ")) {
      const match = raw.match(/^@meeting\s+"(.+?)"$/);
      if (match) {
        tokens.push({
          type: "directive",
          name: "meeting_title",
          value: match[1],
          raw,
          line,
        });
        tokens.push({type: "command", raw: "@meeting", value: "meeting", line});
        continue;
      }
    }

    // Command block e.g. @participants
    if (raw.startsWith("@@")) {
      tokens.push({type: "inlineCommand", raw, command: raw.slice(2), line});
    } else if (raw.startsWith("@")) {
      const value = raw.slice(1).split(":")[0].split("=")[0];
      tokens.push({type: "command", raw, value, line});
    }
    // Declaration with ID e.g. =pt1:Some value
    else if (raw.startsWith("=")) {
      const [left, ...right] = raw.slice(1).split(":");
      tokens.push({
        type: "declaration",
        raw,
        key: left.trim(),
        value: right.join(":").trim(),
        line,
      });
    }
    // List/entry item e.g. - Something
    else if (raw.startsWith("-")) {
      tokens.push({type: "entry", raw, value: raw.slice(1).trim(), line});
    }
    // Markdown header
    else if (raw.match(/^#{1,4}\s+/)) {
      const level = raw.match(/^#+/)[0].length;
      const value = raw.slice(level).trim();
      tokens.push({type: "heading", raw, value, level, line});
    }
    // Fallback
    else {
      tokens.push({type: "text", raw, value: raw, line});
    }
  }
  return tokens;
}

module.exports = {tokenize};
