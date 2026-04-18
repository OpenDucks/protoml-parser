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
  renderPmlAnalysisGraphPreview,
} = require("../src/core/pmlAnalysis.js");
const {
  validatePmlFile,
  validateTagFile,
  formatValidationReport,
} = require("../src/core/validation.js");
const {
  analyzePmlTrustSync,
  analyzePmlTrust,
  signFile,
  verifyFileTrust,
  formatTrustReport,
  formatVerificationReport,
} = require("../src/core/trust.js");
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
const {
  ensureChmAvailable,
  resolveExistingChmPath,
  openChmFile,
  downloadLatestChm,
  getCachedChmPath,
} = require("../src/utils/chm.js");
const {
  getViewerHtmlPath,
  getHelpViewerHtmlPath,
  openViewerInBrowser,
  openHelpViewerInBrowser,
} = require("../src/utils/viewer.js");
const {
  initMacroProject,
  initMacroRegistry,
  initMacroPack,
  upsertRegistryPack,
  removeRegistryPack,
  addRegistryToProject,
  removeRegistryFromProject,
  addPackageToProject,
  updatePackageInProject,
  removePackageFromProject,
  uninstallPackageFromProject,
  syncMacroProject,
  searchMacroRegistryPackages,
  listInstalledMacroPacks,
  getInstalledMacroInfo,
  formatMacroInstallResult,
  loadProjectConfig,
} = require("../src/core/macroInstall.js");
const { associatePmlFiles } = require("../src/utils/windowsAssociation.js");
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
      const graphPreview = renderPmlAnalysisGraphPreview(graphOutput, report, args)
      saveToFile(args.output, graphPreview, "html")
      log("info", `Graph preview saved to ${getOutputFilename(args.output, "html")}`)
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
  console.log(formatValidationReport(validatePmlFile(args.path, args), "Validation", args.verbosity))
  process.exit(0)
}

if (args.command === "trust") {
  if (!args.path) {
    throw new Error("No PML file provided.");
  }
  analyzePmlTrust(args.path, {
    registrySources: args.trustRegistry,
  })
    .then((report) => {
      console.log(formatTrustReport(report, args.verbosity));
    })
    .catch((error) => {
      console.error(`[X] ${error.message}`);
      process.exit(1);
    });
  return;
}

if (args.command === "sign") {
  const type = args.format;
  const [privateKeyPath, author, keyId] = args.extraArgs;
  if (!["macro", "pml"].includes(type)) {
    throw new Error("Sign type must be macro or pml.");
  }
  if (!args.path) {
    throw new Error("No file provided for sign.");
  }
  if (!privateKeyPath || !author) {
    throw new Error("Signing requires <private_key> and <author>.");
  }
  const result = signFile(args.path, type, privateKeyPath, author, keyId || "");
  console.log(formatMacroInstallResult("sign", [
    `type: ${result.type}`,
    `file: ${result.file}`,
    `signature: ${result.signature_file}`,
    `author: ${result.author}`,
    `sha256: ${result.sha256}`,
  ]));
  process.exit(0)
}

if (args.command === "verify") {
  const type = args.format;
  if (!["macro", "pml"].includes(type)) {
    throw new Error("Verify type must be macro or pml.");
  }
  if (!args.path) {
    throw new Error("No file provided for verify.");
  }
  verifyFileTrust(args.path, type, {
    registrySources: args.trustRegistry,
  })
    .then((report) => {
      console.log(formatVerificationReport(report));
    })
    .catch((error) => {
      console.error(`[X] ${error.message}`);
      process.exit(1);
    });
  return;
}

if (args.command === "macros") {
  if (!args.path) {
    throw new Error("No PML file provided.");
  }
  console.log(formatMacroUsage(collectMacroUsage(args.path), "", args.verbosity))
  process.exit(0)
}

if (args.command === "macro_install") {
  const subcommand = args.format;
  const [firstArg, secondArg, thirdArg] = args.extraArgs;

  if (subcommand === "help") {
    console.log(formatMacroInstallResult("macro_install", [
      "init [target_dir]",
      "init_registry [target_dir]",
      "init_pack <name> [registry_dir]",
      "add_registry <source>",
      "remove_registry <source>",
      "list_registries",
      "install <name> [version] [registry]",
      "add_package <name> [version] [registry]",
      "update_package <name> <version> [registry]",
      "remove <name>",
      "remove_package <name>",
      "sync",
      "search <query> [registry_source]",
      "list",
      "info <name>",
      "registry_add <registry_dir> <pack_dir>",
      "registry_update <registry_dir> <pack_dir>",
      "registry_remove <registry_dir> <pack_name>",
    ]));
    process.exit(0);
  }

  if (subcommand === "init") {
    const result = initMacroProject(firstArg || process.cwd());
    console.log(formatMacroInstallResult("macro_install init", [
      `project root: ${result.projectRoot}`,
      ...result.files,
    ]));
    process.exit(0);
  }

  if (subcommand === "init_registry") {
    const result = initMacroRegistry(firstArg || process.cwd());
    console.log(formatMacroInstallResult("macro_install init_registry", [
      `registry root: ${result.registryRoot}`,
      ...result.files,
    ]));
    process.exit(0);
  }

  if (subcommand === "init_pack") {
    if (!firstArg) {
      throw new Error("No pack name provided.");
    }
    const result = initMacroPack(firstArg, secondArg || process.cwd());
    console.log(formatMacroInstallResult("macro_install init_pack", [
      `pack root: ${result.packRoot}`,
      ...result.files,
    ]));
    process.exit(0);
  }

  if (subcommand === "add_registry") {
    if (!firstArg) {
      throw new Error("No registry source provided.");
    }
    const config = addRegistryToProject(process.cwd(), firstArg);
    console.log(formatMacroInstallResult("macro_install add_registry", config.registries.map((entry) => (
      typeof entry === "string" ? entry : entry.source
    ))));
    process.exit(0);
  }

  if (subcommand === "remove_registry") {
    if (!firstArg) {
      throw new Error("No registry source provided.");
    }
    const config = removeRegistryFromProject(process.cwd(), firstArg);
    console.log(formatMacroInstallResult("macro_install remove_registry", config.registries.map((entry) => (
      typeof entry === "string" ? entry : entry.source
    ))));
    process.exit(0);
  }

  if (subcommand === "list_registries") {
    const contents = loadProjectConfig(process.cwd());
    console.log(formatMacroInstallResult("macro_install list_registries", (contents.registries || []).map((entry) => (
      typeof entry === "string" ? entry : entry.source
    ))));
    process.exit(0);
  }

  if (subcommand === "add_package") {
    if (!firstArg) {
      throw new Error("No package name provided.");
    }
    const config = addPackageToProject(process.cwd(), firstArg, secondArg || null, thirdArg || null);
    console.log(formatMacroInstallResult("macro_install add_package", config.packages.map((pkg) => (
      `${pkg.name}${pkg.version ? `@${pkg.version}` : ""}${pkg.registry ? ` registry=${pkg.registry}` : ""}`
    ))));
    process.exit(0);
  }

  if (subcommand === "install") {
    if (!firstArg) {
      throw new Error("No package name provided.");
    }
    addPackageToProject(process.cwd(), firstArg, secondArg || null, thirdArg || null);
    const result = syncMacroProject(process.cwd());
    console.log(formatMacroInstallResult("macro_install install", result.packages.map((pkg) => (
      `${pkg.name}@${pkg.version || "unknown"} -> ${pkg.installed_path}`
    ))));
    process.exit(0);
  }

  if (subcommand === "update_package") {
    if (!firstArg || !secondArg) {
      throw new Error("Package name and version are required.");
    }
    const config = updatePackageInProject(process.cwd(), firstArg, secondArg, thirdArg || null);
    console.log(formatMacroInstallResult("macro_install update_package", config.packages.map((pkg) => (
      `${pkg.name}${pkg.version ? `@${pkg.version}` : ""}${pkg.registry ? ` registry=${pkg.registry}` : ""}`
    ))));
    process.exit(0);
  }

  if (subcommand === "remove_package") {
    if (!firstArg) {
      throw new Error("No package name provided.");
    }
    const config = removePackageFromProject(process.cwd(), firstArg);
    console.log(formatMacroInstallResult("macro_install remove_package", config.packages.map((pkg) => (
      `${pkg.name}${pkg.version ? `@${pkg.version}` : ""}${pkg.registry ? ` registry=${pkg.registry}` : ""}`
    ))));
    process.exit(0);
  }

  if (subcommand === "remove") {
    if (!firstArg) {
      throw new Error("No package name provided.");
    }
    const result = uninstallPackageFromProject(process.cwd(), firstArg);
    console.log(formatMacroInstallResult("macro_install remove", [
      `removed from project definition: ${firstArg}`,
      `install path: ${result.installPath}`,
    ]));
    process.exit(0);
  }

  if (subcommand === "sync") {
    const result = syncMacroProject(process.cwd());
    console.log(formatMacroInstallResult("macro_install sync", [
      `project root: ${result.projectRoot}`,
      `macro import index: ${result.importIndexFile}`,
      ...result.packages.map((pkg) => {
        const requested = pkg.used_version_fallback && pkg.requested_version
          ? ` requested=${pkg.requested_version}`
          : "";
        return `${pkg.name}@${pkg.version || "unknown"} -> ${pkg.installed_path}${requested}`;
      }),
    ]));
    process.exit(0);
  }

  if (subcommand === "search") {
    const query = firstArg || "";
    searchMacroRegistryPackages(process.cwd(), query, secondArg || null)
      .then((result) => {
        console.log(formatMacroInstallResult("macro_install search", result.packages.map((pkg) => (
          `${pkg.name}${pkg.version ? `@${pkg.version}` : ""} [${pkg.registry}]${pkg.author ? ` author=${pkg.author}` : ""}${pkg.trust ? ` trust=${typeof pkg.trust === "string" ? pkg.trust : JSON.stringify(pkg.trust)}` : ""} ${pkg.description || ""}${pkg.registry_source ? ` source=${pkg.registry_source}` : ""}`
        ))));
      })
      .catch((error) => {
        console.error(`[X] ${error.message}`);
        process.exit(1);
      });
    return;
  }

  if (subcommand === "list") {
    const result = listInstalledMacroPacks(process.cwd());
    console.log(formatMacroInstallResult("macro_install list", (result.packages || []).map((pkg) => (
      `${pkg.name}@${pkg.version || "unknown"} -> ${pkg.installed_path || "(unknown path)"}`
    ))));
    process.exit(0);
  }

  if (subcommand === "info") {
    if (!firstArg) {
      throw new Error("No pack name provided.");
    }
    const result = getInstalledMacroInfo(process.cwd(), firstArg);
    console.log(formatMacroInstallResult("macro_install info", [
      `pack root: ${result.packDir}`,
      `name: ${result.manifest.name}`,
      `version: ${result.manifest.version || "unknown"}`,
      `description: ${result.manifest.description || ""}`,
      `dependencies: ${JSON.stringify(result.manifest.dependencies || [])}`,
    ]));
    process.exit(0);
  }

  if (subcommand === "registry_add" || subcommand === "registry_update") {
    if (!firstArg || !secondArg) {
      throw new Error("Registry directory and pack directory are required.");
    }
    const result = upsertRegistryPack(firstArg, secondArg);
    console.log(formatMacroInstallResult(`macro_install ${subcommand}`, [
      `registry file: ${result.registryFile}`,
      `${result.entry.name}@${result.entry.version || "unknown"} -> ${result.entry.source}`,
    ]));
    process.exit(0);
  }

  if (subcommand === "registry_remove") {
    if (!firstArg || !secondArg) {
      throw new Error("Registry directory and pack name are required.");
    }
    const result = removeRegistryPack(firstArg, secondArg);
    console.log(formatMacroInstallResult("macro_install registry_remove", [
      `registry file: ${result.registryFile}`,
      `removed entries: ${result.removed}`,
    ]));
    process.exit(0);
  }

  throw new Error(`Unsupported macro_install subcommand: ${subcommand}`);
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

if (args.command === "chm") {
  const subcommand = args.format || "app";

  if (subcommand === "path") {
    console.log(getHelpViewerHtmlPath());
    process.exit(0);
  }

  if (subcommand === "download") {
    downloadLatestChm()
      .then((result) => {
        console.log(`Downloaded ${result.assetName} from ${result.releaseName}`);
        console.log(result.filePath);
      })
      .catch((error) => {
        console.error(`[X] ${error.message}`);
        process.exit(1);
      });
    return;
  }

  if (subcommand === "app" || subcommand === "open") {
    const { spawn } = require("child_process");
    const electronPath = require("electron");
    const helpWorkbench = path.join(__dirname, "help-workbench.js");
    const spawnArgs = args.path ? [helpWorkbench, args.path] : [helpWorkbench];

    spawn(electronPath, spawnArgs, {
      detached: true,
      stdio: "ignore",
    }).unref();

    console.log(`Opened help viewer${args.path ? ` for ${args.path}` : ""}`);
    process.exit(0);
  }

  if (subcommand === "browser") {
    const target = openHelpViewerInBrowser(args.path || null);
    console.log(`Opened browser help viewer: ${target}`);
    process.exit(0);
  }

  if (subcommand === "compiled_path") {
    const localPath = resolveExistingChmPath();
    console.log(localPath || getCachedChmPath());
    process.exit(0);
  }

  if (subcommand === "compiled") {
    ensureChmAvailable()
      .then((result) => {
        openChmFile(result.filePath);
        if (result.source === "download") {
          console.log(`Downloaded and opened CHM help from ${result.releaseName}`);
        } else {
          console.log(`Opened CHM help: ${result.filePath}`);
        }
      })
      .catch((error) => {
        console.error(`[X] ${error.message}`);
        process.exit(1);
      });
    return;
  }

  throw new Error(`Unsupported chm subcommand: ${subcommand}`);
}

if (args.command === "viewer") {
  const subcommand = args.format || "browser";

  if (subcommand === "path") {
    console.log(getViewerHtmlPath());
    process.exit(0);
  }

  if (subcommand === "browser") {
    const target = openViewerInBrowser(args.path);
    console.log(`Opened browser viewer: ${target}`);
    process.exit(0);
  }

  if (subcommand === "app") {
    const { spawn } = require("child_process");
    const electronPath = require("electron");
    const viewerWorkbench = path.join(__dirname, "viewer-workbench.js");
    const spawnArgs = args.path ? [viewerWorkbench, args.path] : [viewerWorkbench];

    spawn(electronPath, spawnArgs, {
      detached: true,
      stdio: "ignore",
    }).unref();

    console.log(`Opened standalone viewer window${args.path ? ` for ${args.path}` : ""}`);
    process.exit(0);
  }

  throw new Error(`Unsupported viewer subcommand: ${subcommand}`);
}

if (args.command === "associate") {
  if (args.format !== "pml") {
    throw new Error(`Unsupported association target: ${args.format}`);
  }

  const result = associatePmlFiles();
  console.log(formatMacroInstallResult("associate pml", [
    `extension: ${result.extension}`,
    `progId: ${result.progId}`,
    `command: ${result.command}`,
  ]));
  process.exit(0);
}

if (args.trustMode !== "off") {
  const trustReport = analyzePmlTrustSync(args.filename, {
    registrySources: args.trustRegistry,
  });
  const untrustedMacros = (trustReport.macros || []).filter((entry) => entry.effective_trust === "untrusted");
  const untrustedImports = (trustReport.imports || []).filter((entry) => entry.effective_trust === "untrusted");

  if (untrustedMacros.length || untrustedImports.length) {
    const reasonLines = [
      ...untrustedMacros.map((entry) => `macro ${entry.alias}: ${entry.reasons.join(", ") || "policy violation"}`),
      ...untrustedImports.map((entry) => `import ${entry.name}: ${entry.reasons.join(", ") || "policy violation"}`),
    ];

    if (args.trustMode === "strict") {
      throw new Error(`Trust validation failed for ${args.filename}\n${reasonLines.map((line) => `- ${line}`).join("\n")}`);
    }

    console.error(`[!] Trust warning for ${args.filename}`);
    for (const line of reasonLines) {
      console.error(`- ${line}`);
    }
  }
}

const ast = parseFile(args.filename, args)
if (!args.outputExplicitlySet && hasContentImports(ast)) {
  args.output = getAutoOutputPath(args.filename, args.format)
}
const output = renderers[args.format](ast, args)

saveToFile(args.output, output, args.format)
log("info", `File saved to ${getOutputFilename(args.output, args.format)}`)	
