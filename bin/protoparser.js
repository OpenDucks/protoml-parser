#!/usr/bin/env node
const path = require("path");
const { log, setVerbosity } = require("../src/utils/logger.js")
const { parseArgs } = require("../src/cli/options.js");
const { parseFile } = require("../src/core/parser.js");
const { saveToFile, getOutputFilename } = require("../src/utils/file.js");
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
  renderPmlAnalysisGraph,
} = require("../src/core/pmlAnalysis.js");
const {
  validatePmlFile,
  validateTagFile,
  formatValidationReport,
} = require("../src/core/validation.js");
const {
  collectMacroUsage,
  formatMacroUsage,
} = require("../src/core/macroUsage.js");
const {
  analyzeRegister,
  formatRegister,
  renderRegisterJSON,
  renderRegisterHTML,
  renderRegisterPDF,
} = require("../src/core/register.js");
const { bundlePmlFile } = require("../src/core/bundle.js");
const {
  scaffoldMeeting,
  initProject,
} = require("../src/core/scaffold.js");
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
  {
    const supportedFormats = ["statistics", "json", "html", "pdf", "validate"];
    if (!supportedFormats.includes(args.format)) {
      throw new Error(`Unsupported tags subcommand: ${args.format}`);
    }
  }

  if (args.format === "validate") {
    console.log(formatValidationReport(validateTagFile(args.path), "Tag validation", args.verbosity))
  } else {
    const report = analyzeTagStatistics(args.path)
    if (args.format === "statistics") {
    console.log(formatTagStatistics(report, "", args.verbosity))
    } else if (args.format === "json") {
      saveToFile(args.output, renderTagStatisticsJSON(report), "json")
      log("info", `File saved to ${getOutputFilename(args.output, "json")}`)
    } else if (args.format === "html") {
      saveToFile(args.output, renderTagStatisticsHTML(report), "html")
      log("info", `File saved to ${getOutputFilename(args.output, "html")}`)
    } else if (args.format === "pdf") {
      saveToFile(args.output, renderTagStatisticsPDF(report), "pdf")
      log("info", `File saved to ${getOutputFilename(args.output, "pdf")}`)
    }
  }
  process.exit(0)
}

if (args.command === "analyze") {
  if (!args.path) {
    throw new Error("No PML file provided.");
  }

  const supportedFormats = ["statistics", "json", "html", "pdf", "graph"];
  if (!supportedFormats.includes(args.format)) {
    throw new Error(`Unsupported analyze subcommand: ${args.format}`);
  }

  const report = analyzePmlFile(args.path)
  if (args.format === "statistics") {
    console.log(formatPmlAnalysis(report, "", args.verbosity))
  } else if (args.format === "json") {
    saveToFile(args.output, renderPmlAnalysisJSON(report), "json")
    log("info", `File saved to ${getOutputFilename(args.output, "json")}`)
  } else if (args.format === "html") {
    saveToFile(args.output, renderPmlAnalysisHTML(report), "html")
    log("info", `File saved to ${getOutputFilename(args.output, "html")}`)
  } else if (args.format === "pdf") {
    saveToFile(args.output, renderPmlAnalysisPDF(report), "pdf")
    log("info", `File saved to ${getOutputFilename(args.output, "pdf")}`)
  } else if (args.format === "graph") {
    const graphOutput = renderPmlAnalysisGraph(report, args)
    if (args.outputExplicitlySet) {
      saveToFile(args.output, graphOutput, "mmd")
      log("info", `File saved to ${getOutputFilename(args.output, "mmd")}`)
    } else {
      console.log(graphOutput)
    }
  }
  process.exit(0)
}

if (args.command === "validate") {
  if (!args.path) {
    throw new Error("No PML file provided.");
  }
  console.log(formatValidationReport(validatePmlFile(args.path), "Validation", args.verbosity))
  process.exit(0)
}

if (args.command === "macros") {
  if (!args.path) {
    throw new Error("No PML file provided.");
  }
  console.log(formatMacroUsage(collectMacroUsage(args.path), "", args.verbosity))
  process.exit(0)
}

if (args.command === "register") {
  if (!args.path) {
    throw new Error("No directory provided.");
  }
  const supportedFormats = ["statistics", "json", "html", "pdf"];
  if (!supportedFormats.includes(args.format)) {
    throw new Error(`Unsupported register subcommand: ${args.format}`);
  }
  const report = analyzeRegister(args.path);
  if (args.format === "statistics") {
    console.log(formatRegister(report, args.verbosity));
  } else if (args.format === "json") {
    saveToFile(args.output, renderRegisterJSON(report), "json");
    log("info", `File saved to ${getOutputFilename(args.output, "json")}`);
  } else if (args.format === "html") {
    saveToFile(args.output, renderRegisterHTML(report), "html");
    log("info", `File saved to ${getOutputFilename(args.output, "html")}`);
  } else if (args.format === "pdf") {
    saveToFile(args.output, renderRegisterPDF(report), "pdf");
    log("info", `File saved to ${getOutputFilename(args.output, "pdf")}`);
  }
  process.exit(0)
}

if (args.command === "bundle") {
  if (!args.path) {
    throw new Error("No PML file provided.");
  }
  const bundled = bundlePmlFile(args.path);
  saveToFile(args.output, bundled, "pml");
  log("info", `File saved to ${getOutputFilename(args.output, "pml")}`);
  process.exit(0)
}

if (args.command === "scaffold") {
  if (args.format !== "meeting") {
    throw new Error(`Unsupported scaffold target: ${args.format}`);
  }
  const result = scaffoldMeeting(args.path)
  console.log(`Scaffold created in ${result.targetDir}`)
  for (const file of result.files) {
    console.log(`- ${file}`)
  }
  process.exit(0)
}

if (args.command === "init") {
  const result = initProject(args.path)
  console.log(`Project initialized in ${result.targetDir}`)
  for (const file of result.files) {
    console.log(`- ${file}`)
  }
  process.exit(0)
}

const ast = parseFile(args.filename, args)
if (!args.outputExplicitlySet && hasContentImports(ast)) {
  args.output = getAutoOutputPath(args.filename, args.format)
}
const output = renderers[args.format](ast, args)

saveToFile(args.output, output, args.format)
log("info", `File saved to ${getOutputFilename(args.output, args.format)}`)	
