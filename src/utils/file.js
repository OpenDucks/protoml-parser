const fs = require("fs")
const path = require("path")

function getExtensionForFormat(format) {
  const normalized = String(format || "").toLowerCase()
  const extensionMap = {
    markdown: "md",
    text: "txt",
    graph: "mmd",
  }

  return extensionMap[normalized] || normalized
}

function getOutputFilename(filename, format) {
  const ext = path.extname(filename)
  return ext ? filename : `${filename}.${getExtensionForFormat(format)}`
}

function saveToFile(filename, content, format) {
  const safeFilename = getOutputFilename(filename, format)

  try {
    fs.mkdirSync(path.dirname(safeFilename), { recursive: true })
    fs.writeFileSync(safeFilename, content)
  } catch (err) {
    console.error(`Failed to save file: ${err.message}`)
    process.exit(1)
  }
}

module.exports = { saveToFile, getOutputFilename, getExtensionForFormat }
