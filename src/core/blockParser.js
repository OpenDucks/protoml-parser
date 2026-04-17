const { stripInlineComment } = require("./commentUtils");

function parseBlocks(tokens, options = {}) {
  const result = {};
  let currentBlock = null;

  for (const token of tokens) {
    if (token.type === "meta") {
      result.meta = result.meta || {};
      result.meta[token.key] = token.value;
      continue;
    }

    if (token.type === "macro") {
      result.macros = result.macros || {};
      result.macros[token.name.trim()] = token.file.trim();
      continue;
    }

    if (token.type === "directive") {
      result.meta = result.meta || {};
      result.meta[token.name] = token.value;
      continue;
    }

    if (token.type === "tagsImport") {
      result.tags_import = result.tags_import || [];
      result.tags_import.push(token.file.trim());
      continue;
    }

    if (token.type === "import") {
      result.imports = result.imports || {};
      result.imports[token.name.trim()] = {
        file: token.file.trim(),
        format: token.format,
      };
      continue;
    }

    if (token.type === "command") {

      currentBlock = token.value.toLowerCase();
      if (!result[currentBlock]) {
        result[currentBlock] =
          currentBlock === "meeting"
            ? []
            : currentBlock === "participants" || currentBlock === "tags"
            ? {}
            : [];
      }
    }

    if (!currentBlock) continue;

    switch (token.type) {
      case "declaration":
        if (currentBlock === "participants") {
          const [name, alias, email] = token.value.split(",");
          result[currentBlock][token.key] = {
            name: name?.trim(),
            alias: alias?.trim(),
            email: email?.trim(),
          };
        } else if (currentBlock === "tags") {
          result[currentBlock][token.key] = token.value;
        } else {
          // General key:value map
          result[currentBlock][token.key] = token.value;
        }
        break;

      case "entry":
        if (currentBlock === "tasks") {
          const done = token.value.startsWith("[x]");

          const ptp = token.raw.match(/@ptp=([^\s]+)/)?.[1] || null;
          const subject = [...token.raw.matchAll(/(?:\s|^)=([^\s]+)/g)].pop()?.[1] || null;
          const tag = token.raw.match(/@tag=([^\s]+)/)?.[1] || null;

          const cleanedText = stripInlineComment(
            token.value
            .replace(/^\[(x| )\]/, "")
            .replace(/@ptp=[^\s]+/g, "")
            .replace(/@tag=[^\s]+/g, "")
            .replace(/=[^\s]+/g, "")
            .trim()
          ).trim();

          result[currentBlock].push({
            raw: token.raw, // raw line (für referenceLinker)
            text: cleanedText, // cleaned text for display
            done,
            meta: {
              ptp,
              subject,
              tag,
            },
          });
        } else {
          result[currentBlock].push(token.value);
        }
        break;

      case "heading":
      case "inlineCommand":
      case "text":
        if (currentBlock === "meeting") {
          result[currentBlock].push(token.raw);
        }
        break;
    }
  }

  return result;
}

module.exports = {parseBlocks};
