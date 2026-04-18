function extractSection(raw, sectionName, knownSections = ["name", "docs", "template"]) {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const header = new RegExp(`^=${escaped}:`, "m").exec(raw);
  if (!header || header.index == null) return "";

  const contentStart = header.index + header[0].length;
  const nextPattern = knownSections
    .filter((name) => name !== sectionName)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  if (!nextPattern) {
    return raw.slice(contentStart).trim();
  }

  const rest = raw.slice(contentStart);
  const nextSectionMatch = new RegExp(`^=(?:${nextPattern}):`, "m").exec(rest);
  const contentEnd = nextSectionMatch ? contentStart + nextSectionMatch.index : raw.length;
  return raw.slice(contentStart, contentEnd).trim();
}

function parseMacroDefinition(raw) {
  const source = String(raw || "").replace(/\r/g, "");
  const trimmed = source.trimStart();
  if (!trimmed.startsWith("@new_macro")) {
    return null;
  }

  const knownSections = ["name", "docs", "template"];
  const name = extractSection(source, "name", knownSections).trim();
  const docs = extractSection(source, "docs", knownSections);
  const template = extractSection(source, "template", knownSections);

  if (!name || !template) {
    return null;
  }

  return {
    name,
    docs,
    template,
    raw: source,
  };
}

function extractInlineMacroBlocks(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const macros = [];
  const keptLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed !== "@new_macro") {
      keptLines.push(lines[index]);
      continue;
    }

    const startLine = index + 1;
    const blockLines = [lines[index]];
    let cursor = index + 1;
    let endedWithExplicitMarker = false;

    while (cursor < lines.length) {
      const currentTrimmed = lines[cursor].trim();
      if (currentTrimmed === "@end_macro") {
        endedWithExplicitMarker = true;
        break;
      }
      if (currentTrimmed === "@new_macro") {
        break;
      }

      blockLines.push(lines[cursor]);
      cursor += 1;
    }

    const parsed = parseMacroDefinition(blockLines.join("\n"));
    macros.push({
      line: startLine,
      raw: blockLines.join("\n"),
      definition: parsed,
      error: parsed ? null : "Inline macro requires both =name: and =template: sections.",
    });

    if (endedWithExplicitMarker) {
      index = cursor;
    } else {
      index = cursor - 1;
    }
  }

  return {
    cleanedText: keptLines.join("\n"),
    macros,
  };
}

module.exports = {
  parseMacroDefinition,
  extractInlineMacroBlocks,
};
