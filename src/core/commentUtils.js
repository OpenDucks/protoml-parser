function stripInlineComment(text) {
  if (typeof text !== "string" || text.length === 0) {
    return text;
  }

  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] === "/" && text[i + 1] === "/") {
      const isCommentStart = i === 0 || /\s/.test(text[i - 1]);
      if (isCommentStart) {
        return text.slice(0, i).trimEnd();
      }
    }
  }

  return text;
}

module.exports = { stripInlineComment };
