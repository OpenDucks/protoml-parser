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
      tokens.push({type: "meta", key, value: val.join(":").trim(), line});
      continue;
    }

    if (raw.startsWith("@macro ")) {
      const [, name, fileRaw] = raw.split(" ");
      const projectRoot = path.resolve(__dirname, "../../");
      const macroDir = path.join(projectRoot, "macros");
      const file = fileRaw
        .replace(/\"/g, "")
        .replace("{{macro_dir}}", macroDir);

      tokens.push({type: "macro", name, file, raw, line});
      continue;
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
