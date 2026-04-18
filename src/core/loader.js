const fs = require("fs")
const path = require("path")
const { tokenize } = require("./tokenizer")
const { parseBlocks } = require("./blockParser")
const { resolveMacroPath } = require("../cli/options")
const { BUILTIN_META_KEYS } = require("./metaKeys")
const { parseMacroDefinition } = require("./macroDefinition")

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
  ast = preserveLocalMetaConstants(ast)

  return ast
}

function preserveLocalMetaConstants(ast) {
  if (!Array.isArray(ast.meeting)) return ast

  const localConstants = Object.fromEntries(
    BUILTIN_META_KEYS.map((key) => [key, ast.meta?.[key]])
  )

  ast.meeting = ast.meeting.map((line) =>
    String(line).replace(/@@ref=meta:([A-Za-z0-9_-]+)/g, (match, key) => {
      if (!BUILTIN_META_KEYS.includes(String(key))) {
        return match
      }
      return localConstants[key] != null ? String(localConstants[key]) : `@@ref=meta:${key}`
    })
  )

  return ast
}

function mergeImportedAst(mainAst, importedAst) {
  if (!importedAst || typeof importedAst !== "object") return mainAst

  if (importedAst.meta) {
    mainAst.meta = { ...importedAst.meta, ...mainAst.meta }
  }

  const mergeableBlocks = ["participants", "subjects", "tags", "macros", "imports", "signatures", "approvals"]
  for (const key of mergeableBlocks) {
    if (!importedAst[key]) continue
    mainAst[key] = { ...importedAst[key], ...mainAst[key] }
  }

  for (const key of ["attachments", "references"]) {
    if (!Array.isArray(importedAst[key])) continue
    mainAst[key] = [...importedAst[key], ...(mainAst[key] || [])]
  }

  return mainAst
}

function loadAndMergeImports(mainAst, basePath, options = {}) {
  if (!mainAst || typeof mainAst !== "object") return mainAst

  const participantImports = findParticipantImports(mainAst)

  for (const importFile of participantImports) {
    const fullPath = path.resolve(basePath, importFile)

    if (!fs.existsSync(fullPath)) {
      if (options.strict) throw new Error(`Import file not found: ${fullPath}`)
      continue
    }

    const raw = fs.readFileSync(fullPath, "utf8")
    const tokens = tokenize(raw)
    const importedAst = parseBlocks(tokens, options)

    if (importedAst.participants) {
      mainAst.participants = { ...importedAst.participants, ...mainAst.participants }
    } else if (options.strict) {
      throw new Error(`Participant import does not define an @participants block: ${fullPath}`)
    }
  }

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

function findParticipantImports(ast) {
  if (!ast || !ast.participants_import) return []
  return Array.isArray(ast.participants_import) ? ast.participants_import : [ast.participants_import]
}

function findMacroImports(ast) {
  if (!ast || !ast.macros_import) return []
  return Array.isArray(ast.macros_import) ? ast.macros_import : [ast.macros_import]
}

function loadAndMergeMacros(ast, basePath, options = {}) {
  const macroCache = { ...(ast._macroCache || {}) }
  const macroImports = findMacroImports(ast)
  for (const importFile of macroImports) {
    const fullPath = path.resolve(basePath, importFile)

    if (!fs.existsSync(fullPath)) {
      if (options.strict) throw new Error(`Macro import file not found: ${fullPath}`)
      continue
    }

    const importedTokens = tokenize(fs.readFileSync(fullPath, "utf8"))
    const importedAst = parseBlocks(importedTokens, options)

    if (importedAst.macros) {
      ast.macros = { ...(importedAst.macros || {}), ...(ast.macros || {}) }
    } else if (options.strict) {
      throw new Error(`Macro import does not define any @macro entries: ${fullPath}`)
    }
  }

  for (const [name, entry] of Object.entries(ast.inline_macros || {})) {
    if (entry?.template) {
      macroCache[name] = entry.template
    }
  }

  if (!ast.macros && !Object.keys(ast.inline_macros || {}).length) return ast

  for (const name in ast.macros) {
    const file = ast.macros[name]
    const fullPath = resolveMacroFilePath(basePath, file)

    if (!fs.existsSync(fullPath)) continue
    const parsedMacro = parseMacroDefinition(fs.readFileSync(fullPath, "utf8"))

    if (parsedMacro?.name && parsedMacro.template) {
      macroCache[parsedMacro.name] = parsedMacro.template
    }
  }

  ast._macroCache = macroCache
  return ast
}

module.exports = { loadAndMergeImports, loadAndMergeMacros }
