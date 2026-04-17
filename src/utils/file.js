const fs = require("fs")
const path = require("path")

function saveToFile(filename, content, format) {
  const ext = path.extname(filename)
  const safeFilename = ext ? filename : `${filename}.${format}`

  try {
    fs.mkdirSync(path.dirname(safeFilename), { recursive: true })
    fs.writeFileSync(safeFilename, content)
  } catch (err) {
    console.error(`Failed to save file: ${err.message}`)
    process.exit(1)
  }
}

module.exports = { saveToFile }
