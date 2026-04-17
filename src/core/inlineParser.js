const { stripInlineComment } = require("./commentUtils")
const { collectMeetingHeadings } = require("./headingUtils")

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
    const headings = collectMeetingHeadings(ast.meeting)
    let headingIndex = 0

    ast.meeting = ast.meeting.map(line => {
      line = stripInlineComment(line).trim()

      if (line.match(/^#{1,6}\s+/)) {
        const heading = headings[headingIndex++]
        return `<h${heading.level} id="${heading.id}">${parseText(heading.text)}</h${heading.level}>`
      }

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
