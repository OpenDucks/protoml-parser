const fs = require("fs")
const path = require("path")
const { tokenize } = require("./tokenizer")
const { parseBlocks } = require("./blockParser")
const { resolveMacroPath } = require("../cli/options")

function resolveMacroFilePath(basePath, file) {
  const projectMacroBase = path.resolve(__dirname, "..", "..", "macros")
  const normalized = resolveMacroPath(String(file || ""), projectMacroBase)

  if (path.isAbsolute(normalized)) {
    return normalized
  }

  return path.resolve(basePath, normalized.replace(/\"/g, ""))
}

function parseImportedPmlFile(filename, options = {}) {
  const raw = fs.readFileSync(filename, "utf8")
  const tokens = tokenize(raw)
  let ast = parseBlocks(tokens, options)

  ast = loadAndMergeImports(ast, path.dirname(filename), options)
  ast = loadAndMergeMacros(ast, path.dirname(filename), options)

  return ast
}

function mergeImportedAst(mainAst, importedAst) {
  if (!importedAst || typeof importedAst !== "object") return mainAst

  if (importedAst.meta) {
    mainAst.meta = { ...importedAst.meta, ...mainAst.meta }
  }

  const mergeableBlocks = ["participants", "subjects", "tags", "macros", "imports"]
  for (const key of mergeableBlocks) {
    if (!importedAst[key]) continue
    mainAst[key] = { ...importedAst[key], ...mainAst[key] }
  }

  return mainAst
}

function loadAndMergeImports(mainAst, basePath, options = {}) {
  if (!mainAst || typeof mainAst !== "object") return mainAst

  const tagImports = findTagImports(mainAst)

  for (const importFile of tagImports) {
    const fullPath = path.resolve(basePath, importFile)

    if (!fs.existsSync(fullPath)) {
      if (options.strict) throw new Error(`Import file not found: ${fullPath}`)
      continue
    }

    const raw = fs.readFileSync(fullPath, "utf8")
    const tokens = tokenize(raw)
    const importedAst = parseBlocks(tokens, options)

    if (importedAst.tags) {
      mainAst.tags = { ...importedAst.tags, ...mainAst.tags }
    } else if (options.strict) {
      throw new Error(`Tag import does not define an @tags block: ${fullPath}`)
    }
  }

  if (mainAst.imports) {
    const importCache = {}

    for (const name in mainAst.imports) {
      const entry = mainAst.imports[name]
      const fullPath = path.resolve(basePath, entry.file)

      if (!fs.existsSync(fullPath)) {
        if (options.strict) throw new Error(`Import file not found: ${fullPath}`)
        continue
      }

      const format = (entry.format || "text").toLowerCase()
      const rawContent = fs.readFileSync(fullPath, "utf8")
      let content = rawContent

      if (format === "pml") {
        const importedAst = parseImportedPmlFile(fullPath, options)
        mergeImportedAst(mainAst, importedAst)
        content = Array.isArray(importedAst.meeting) ? importedAst.meeting : []
      }

      importCache[name] = {
        name,
        format,
        file: entry.file,
        path: fullPath,
        content,
      }
    }

    mainAst._importCache = importCache
  }

  return mainAst
}

function findTagImports(ast) {
  if (!ast || !ast.tags_import) return []
  return Array.isArray(ast.tags_import) ? ast.tags_import : [ast.tags_import]
}

const macroCache = {}

function loadAndMergeMacros(ast, basePath, options = {}) {
  if (!ast.macros) return ast

  for (const name in ast.macros) {
    const file = ast.macros[name]
    const fullPath = resolveMacroFilePath(basePath, file)

    if (!fs.existsSync(fullPath)) continue
    const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/)

    let macroName = null
    let templateLines = []
    let inTemplate = false

    for (const line of lines) {
      if (line.startsWith("=name:")) {
        macroName = line.slice(6).trim()
      } else if (line.startsWith("=template:")) {
        inTemplate = true
        const rest = line.slice(10).trim()
        if (rest) templateLines.push(rest)
      } else if (inTemplate && (line.startsWith("@") || line.startsWith("="))) {
        inTemplate = false
      } else if (inTemplate) {
        templateLines.push(line)
      }
    }

    if (macroName && templateLines.length) {
      macroCache[macroName] = templateLines.join("\n")
    }
  }

  ast._macroCache = macroCache
  return ast
}

module.exports = { loadAndMergeImports, loadAndMergeMacros }
