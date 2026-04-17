const { stripInlineComment } = require("./commentUtils")

function parseInline(ast, options = {}) {
  const parseText = (text) => {
    if (!text || typeof text !== "string") return text

    // Links: -a=url text -a-
    text = text.replace(/-a=([^\s]+)\s(.*?)-a-/g, (_, url, label) =>
      `<a href="${url}" target="_blank">${label}</a>`)

    // Bold: -b Text -b-
    text = text.replace(/-b\s(.*?)-b-/g, (_, content) =>
      `<b>${content}</b>`)

    // Italic: -i Text -i-
    text = text.replace(/-i\s(.*?)-i-/g, (_, content) =>
      `<i>${content}</i>`)

    return text
  }

  // Meeting
  if (Array.isArray(ast.meeting)) {
  ast.meeting = ast.meeting.map(line => {
    line = stripInlineComment(line).trim()

    if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`
    if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`
    if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`

    return parseText(line)
  })
}


  // Notes
  if (Array.isArray(ast.notes)) {
    ast.notes = ast.notes.map(parseText)
  }

  // Tasks
  if (Array.isArray(ast.tasks)) {
    ast.tasks = ast.tasks.map(task => ({
      ...task,
      text: parseText(task.text)
    }))
  }

  // Subjects
  if (ast.subjects) {
    for (const key in ast.subjects) {
      ast.subjects[key] = parseText(ast.subjects[key])
    }
  }

  return ast
}

module.exports = { parseInline }
