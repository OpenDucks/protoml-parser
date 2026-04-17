#!/usr/bin/env node
const path = require("path");
const { log, setVerbosity } = require("../src/utils/logger.js")
const { parseArgs } = require("../src/cli/options.js");
const { parseFile } = require("../src/core/parser.js");
const { saveToFile } = require("../src/utils/file.js");
const {
  analyzeTagStatistics,
  formatTagStatistics,
  renderTagStatisticsJSON,
  renderTagStatisticsHTML,
  renderTagStatisticsPDF,
} = require("../src/core/tagStatistics.js");
const {
  analyzePmlFile,
  formatPmlAnalysis,
  renderPmlAnalysisJSON,
  renderPmlAnalysisHTML,
  renderPmlAnalysisPDF,
} = require("../src/core/pmlAnalysis.js");
const renderers = require("../src/renders/index.js");

function hasContentImports(ast) {
  if (!ast?.imports || typeof ast.imports !== "object") {
    return false;
  }

  return Object.values(ast.imports).some((entry) => {
    const format = String(entry?.format || "").toLowerCase();
    return format === "html" || format === "pml";
  });
}

function getAutoOutputPath(filename, format) {
  const sourceDir = path.dirname(filename);
  const baseName = path.basename(filename, path.extname(filename));
  return path.join(sourceDir, format, baseName);
}

const args = parseArgs()
setVerbosity(args.verbosity)

if (args.command === "tags") {
  if (!args.path) {
    throw new Error("No tag file provided.");
  }
  if (args.format !== "statistics") {
    const supportedFormats = ["statistics", "json", "html", "pdf"];
    if (!supportedFormats.includes(args.format)) {
      throw new Error(`Unsupported tags subcommand: ${args.format}`);
    }
  }

  const report = analyzeTagStatistics(args.path)
  if (args.format === "statistics") {
    console.log(formatTagStatistics(report))
  } else if (args.format === "json") {
    saveToFile(args.output, renderTagStatisticsJSON(report), "json")
    log("info", `File saved to ${args.output}.json`)
  } else if (args.format === "html") {
    saveToFile(args.output, renderTagStatisticsHTML(report), "html")
    log("info", `File saved to ${args.output}.html`)
  } else if (args.format === "pdf") {
    saveToFile(args.output, renderTagStatisticsPDF(report), "pdf")
    log("info", `File saved to ${args.output}.pdf`)
  }
  process.exit(0)
}

if (args.command === "analyze") {
  if (!args.path) {
    throw new Error("No PML file provided.");
  }

  const supportedFormats = ["statistics", "json", "html", "pdf"];
  if (!supportedFormats.includes(args.format)) {
    throw new Error(`Unsupported analyze subcommand: ${args.format}`);
  }

  const report = analyzePmlFile(args.path)
  if (args.format === "statistics") {
    console.log(formatPmlAnalysis(report))
  } else if (args.format === "json") {
    saveToFile(args.output, renderPmlAnalysisJSON(report), "json")
    log("info", `File saved to ${args.output}.json`)
  } else if (args.format === "html") {
    saveToFile(args.output, renderPmlAnalysisHTML(report), "html")
    log("info", `File saved to ${args.output}.html`)
  } else if (args.format === "pdf") {
    saveToFile(args.output, renderPmlAnalysisPDF(report), "pdf")
    log("info", `File saved to ${args.output}.pdf`)
  }
  process.exit(0)
}

const ast = parseFile(args.filename, args)
if (!args.outputExplicitlySet && hasContentImports(ast)) {
  args.output = getAutoOutputPath(args.filename, args.format)
}
const output = renderers[args.format](ast, args)

saveToFile(args.output, output, args.format)
log("info", `File saved to ${args.output}.${args.format}`)	
