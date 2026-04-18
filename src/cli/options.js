const fs = require("fs");
const path = require("path");

function resolveMacroPath(inputPath, macroBase) {
  if (!inputPath) return inputPath;

  if (inputPath.includes("{{macro_dir}}")) {
    const suffix = inputPath.split("{{macro_dir}}")[1] || "";
    return path.resolve(macroBase, suffix.replace(/^[/\\]?/, ""));
  }

  return inputPath;
}

function extractSection(raw, sectionName) {
  const trimmed = String(raw || "").trimStart();
  if (trimmed.startsWith("@help")) {
    return extractKnownSection(raw, sectionName, ["name", "docs", "examples"]);
  }

  if (trimmed.startsWith("@new_macro")) {
    return extractKnownSection(raw, sectionName, ["name", "docs", "template"]);
  }

  const escapedSectionName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headerMatch = new RegExp(`^=${escapedSectionName}:`, "m").exec(raw);
  if (!headerMatch || headerMatch.index == null) {
    return null;
  }

  const contentStart = headerMatch.index + headerMatch[0].length;
  const rest = raw.slice(contentStart);
  const nextSectionMatch = /^=[a-zA-Z0-9_-]+:/m.exec(rest);
  const contentEnd = nextSectionMatch
    ? contentStart + nextSectionMatch.index
    : raw.length;

  return raw.slice(contentStart, contentEnd).trim() || null;
}

function extractKnownSection(raw, sectionName, orderedSectionNames) {
  const escapedSectionName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headerMatch = new RegExp(`^=${escapedSectionName}:`, "m").exec(raw);
  if (!headerMatch || headerMatch.index == null) {
    return null;
  }

  const contentStart = headerMatch.index + headerMatch[0].length;
  const currentIndex = orderedSectionNames.indexOf(sectionName);
  const nextSectionNames = currentIndex >= 0
    ? orderedSectionNames.slice(currentIndex + 1)
    : [];

  if (!nextSectionNames.length) {
    return raw.slice(contentStart).trim() || null;
  }

  const nextSectionPattern = nextSectionNames
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const rest = raw.slice(contentStart);
  const nextSectionMatch = new RegExp(`^=(?:${nextSectionPattern}):`, "m").exec(rest);
  const contentEnd = nextSectionMatch
    ? contentStart + nextSectionMatch.index
    : raw.length;

  return raw.slice(contentStart, contentEnd).trim() || null;
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    filename: null,
    format: null,
    output: null,
    outputExplicitlySet: false,
    verbosity: 0,
    strict: false,
    hideMeta: false,
    theme: null,
    command: null,
    path: null,
    extraArgs: [],
    graphView: "compact",
    graphDirection: "TD",
    trustMode: "warn",
    trustRegistry: [],
  };

  const filteredArgv = [];
  for (const arg of argv) {
    if (/^-v{1,3}$/.test(arg)) {
      options.verbosity = Math.max(options.verbosity, arg.length - 1);
      continue;
    }
    filteredArgv.push(arg);
  }

  const positional = [];
  const macroBase = path.resolve(__dirname, "..", "..", "macros");

  if (filteredArgv[0] === "tags") {
    options.command = "tags";
    options.path = filteredArgv[1] ? path.resolve(process.cwd(), filteredArgv[1]) : null;
    options.format = filteredArgv[2] || "statistics";
    options.output = options.path
      ? path.join(
          path.dirname(options.path),
          `${path.basename(options.path, path.extname(options.path))}-tags-report`
        )
      : null;
    parseSubcommandOptions(filteredArgv.slice(3), options);
    return options;
  }

  if (filteredArgv[0] === "analyze") {
    options.command = "analyze";
    options.path = filteredArgv[1] ? path.resolve(process.cwd(), filteredArgv[1]) : null;
    options.format = filteredArgv[2] || "statistics";
    options.output = options.path
      ? path.join(
          path.dirname(options.path),
          `${path.basename(options.path, path.extname(options.path))}-analysis-report`
        )
      : null;
    parseSubcommandOptions(filteredArgv.slice(3), options);
    return options;
  }

  if (filteredArgv[0] === "validate") {
    options.command = "validate";
    options.path = filteredArgv[1] ? path.resolve(process.cwd(), filteredArgv[1]) : null;
    parseSubcommandOptions(filteredArgv.slice(2), options);
    return options;
  }

  if (filteredArgv[0] === "trust") {
    options.command = "trust";
    options.path = filteredArgv[1] ? path.resolve(process.cwd(), filteredArgv[1]) : null;
    parseSubcommandOptions(filteredArgv.slice(2), options);
    return options;
  }

  if (filteredArgv[0] === "sign") {
    options.command = "sign";
    options.format = filteredArgv[1] || null;
    options.path = filteredArgv[2]
      ? path.resolve(process.cwd(), resolveMacroPath(filteredArgv[2], macroBase))
      : null;
    parseSubcommandOptions(filteredArgv.slice(3), options);
    return options;
  }

  if (filteredArgv[0] === "verify") {
    options.command = "verify";
    options.format = filteredArgv[1] || null;
    options.path = filteredArgv[2]
      ? path.resolve(process.cwd(), resolveMacroPath(filteredArgv[2], macroBase))
      : null;
    parseSubcommandOptions(filteredArgv.slice(3), options);
    return options;
  }

  if (filteredArgv[0] === "macros") {
    options.command = "macros";
    options.path = filteredArgv[1] ? path.resolve(process.cwd(), filteredArgv[1]) : null;
    parseSubcommandOptions(filteredArgv.slice(2), options);
    return options;
  }

  if (filteredArgv[0] === "macro_install") {
    options.command = "macro_install";
    options.format = filteredArgv[1] || "help";
    parseSubcommandOptions(filteredArgv.slice(2), options);
    return options;
  }

  if (filteredArgv[0] === "register") {
    options.command = "register";
    options.path = filteredArgv[1] ? path.resolve(process.cwd(), filteredArgv[1]) : null;
    options.format = filteredArgv[2] || "statistics";
    options.output = options.path
      ? path.join(options.path, `${path.basename(options.path)}-register-report`)
      : null;
    parseSubcommandOptions(filteredArgv.slice(3), options);
    return options;
  }

  if (filteredArgv[0] === "bundle") {
    options.command = "bundle";
    options.path = filteredArgv[1] ? path.resolve(process.cwd(), filteredArgv[1]) : null;
    options.output = options.path
      ? path.join(
          path.dirname(options.path),
          `${path.basename(options.path, path.extname(options.path))}-bundle`
        )
      : null;
    parseSubcommandOptions(filteredArgv.slice(2), options);
    return options;
  }

  if (filteredArgv[0] === "scaffold") {
    options.command = "scaffold";
    options.format = filteredArgv[1] || "meeting";
    options.path = filteredArgv[2] ? path.resolve(process.cwd(), filteredArgv[2]) : process.cwd();
    parseSubcommandOptions(filteredArgv.slice(3), options);
    return options;
  }

  if (filteredArgv[0] === "init") {
    options.command = "init";
    options.path = filteredArgv[1] ? path.resolve(process.cwd(), filteredArgv[1]) : process.cwd();
    parseSubcommandOptions(filteredArgv.slice(2), options);
    return options;
  }

  if (filteredArgv[0] === "chm") {
    options.command = "chm";
    const mode = filteredArgv[1];
    if (["app", "browser", "open", "path", "download", "compiled", "compiled_path"].includes(mode)) {
      options.format = mode;
      options.path = filteredArgv[2] && !filteredArgv[2].startsWith("-")
        ? filteredArgv[2]
        : null;
      parseSubcommandOptions(filteredArgv.slice(options.path ? 3 : 2), options);
    } else {
      options.format = "app";
      options.path = filteredArgv[1] && !filteredArgv[1].startsWith("-")
        ? filteredArgv[1]
        : null;
      parseSubcommandOptions(filteredArgv.slice(options.path ? 2 : 1), options);
    }
    return options;
  }

  if (filteredArgv[0] === "viewer") {
    options.command = "viewer";
    const mode = filteredArgv[1];
    if (["browser", "app", "path"].includes(mode)) {
      options.format = mode;
      options.path = filteredArgv[2] ? path.resolve(process.cwd(), filteredArgv[2]) : null;
      parseSubcommandOptions(filteredArgv.slice(3), options);
    } else {
      options.format = "browser";
      options.path = filteredArgv[1] ? path.resolve(process.cwd(), filteredArgv[1]) : null;
      parseSubcommandOptions(filteredArgv.slice(2), options);
    }
    return options;
  }

  if (filteredArgv[0] === "associate") {
    options.command = "associate";
    options.format = filteredArgv[1] || "pml";
    parseSubcommandOptions(filteredArgv.slice(2), options);
    return options;
  }

  for (let i = 0; i < filteredArgv.length; i++) {
    const arg = filteredArgv[i];

    if (arg.startsWith("-v")) {
      options.verbosity = arg.length - 1;
    } else if (arg.startsWith("-output=")) {
      options.output = arg.split("=")[1];
      options.outputExplicitlySet = true;
    } else if (arg.startsWith("-theme=")) {
      options.theme = arg.split("=")[1];
    } else if (arg === "-hideMeta") {
      options.hideMeta = true;
    } else if (arg === "-strict") {
      options.strict = true;
    } else if (arg.startsWith("-trust=")) {
      options.trustMode = arg.split("=")[1];
    } else if (arg.startsWith("-trustRegistry=")) {
      options.trustRegistry.push(arg.split("=")[1]);
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg === "--version") {
      const packageJsonPath = path.join(__dirname, "..", "..", "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      printVersion(packageJson.version);
      printBuildVersion(packageJson.build || "unknown");
      process.exit(0);
    } else if (arg === "--listMacros") {
      const next = filteredArgv[i + 1];
      if (!next) {
        console.error("[X] No path provided for --listMacros");
        process.exit(1);
      }
      const resolvedPath = resolveMacroPath(next, macroBase);
      const finalPath = path.resolve(process.cwd(), resolvedPath || macroBase);

      if (!fs.existsSync(finalPath)) {
        console.error("[X] Path not found:", finalPath);
        process.exit(1);
      }

      const files = fs.readdirSync(finalPath, {withFileTypes: true});
      const list = [];

      function walk(dir) {
        const entries = fs.readdirSync(dir, {withFileTypes: true});
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (entry.name.endsWith(".pml")) {
            const raw = fs.readFileSync(full, "utf8");
            const name =
              raw.match(/=name:(.+)/)?.[1]?.trim() ?? path.basename(full);
            const docs =
              extractSection(raw, "docs")?.split("\n")[0] ?? "(no docs)";
            list.push({name, path: full, docs});
          }
        }
      }

      walk(finalPath);

      if (list.length === 0) {
        console.log("No macros found.");
        process.exit(0);
      }

      console.log("\n📦 Available Macros:\n");
      for (const entry of list) {
        console.log(`- ${entry.name}\n  ↳ ${entry.docs}\n  📁 ${entry.path}\n`);
      }

      process.exit(0);
    } else if (arg === "--macroHelp") {
      const next = filteredArgv[i + 1];
      if (!next) {
        console.error("[X] No path provided for --macroHelp");
        process.exit(1);
      }
      const resolvedPath = resolveMacroPath(next, macroBase);
      const finalPath = path.resolve(process.cwd(), resolvedPath);

      if (!fs.existsSync(finalPath)) {
        console.error("[X] Macro file not found:", finalPath);
        process.exit(1);
      }

      const raw = fs.readFileSync(finalPath, "utf8");
      const name = raw.match(/=name:(.+)/)?.[1]?.trim() ?? "(unknown)";
      const docs = extractSection(raw, "docs") ?? "(no docs provided)";
      console.log(`\n🧠 Macro: ${name}\n`);
      console.log(docs);
      process.exit(0);
    } else if (arg === "--listMacrosJson") {
      const next = filteredArgv[i + 1];
      if (!next) {
        console.error("[X] No path provided for --listMacrosJson");
        process.exit(1);
      }
      const resolvedPath = resolveMacroPath(next, macroBase);
      const finalPath = path.resolve(process.cwd(), resolvedPath || macroBase);

      if (!fs.existsSync(finalPath)) {
        console.error("[X] Path not found:", finalPath);
        process.exit(1);
      }

      const result = [];

      function walk(dir) {
        const entries = fs.readdirSync(dir, {withFileTypes: true});
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (entry.name.endsWith(".pml")) {
            const raw = fs.readFileSync(full, "utf8");
            const name =
              raw.match(/=name:(.+)/)?.[1]?.trim() ?? path.basename(full);
            const docs = extractSection(raw, "docs") ?? "";
            const template = raw.match(/=template:(.+)/s)?.[1]?.trim() ?? "";
            result.push({name, docs, template, path: full});
          }
        }
      }

      walk(finalPath);

      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    } else if (arg === "--listDocs") {
      const helpDir = path.resolve(__dirname, "..", "..", "docs");

      if (!fs.existsSync(helpDir)) {
        console.error("[X] Help directory not found:", helpDir);
        process.exit(1);
      }

      const result = [];

      const entries = fs.readdirSync(helpDir, {withFileTypes: true});
      for (const entry of entries) {
        const full = path.join(helpDir, entry.name);
        if (entry.isFile() && entry.name.endsWith(".pml")) {
          const raw = fs.readFileSync(full, "utf8");
          const name = raw.match(/=name:(.+)/)?.[1]?.trim() ?? entry.name;
          const docs = extractSection(raw, "docs")?.split("\n")[0] ?? "";
          result.push({name, file: entry.name, docs});
        }
      }

      if (result.length === 0) {
        console.log("No help modules found.");
      } else {
        console.log("\n📚 Available Help Topics:\n");
        for (const entry of result) {
          console.log(
            `- ${entry.name} (module name)\n  ↳ ${entry.docs}\n  📁 ${entry.file}\n`
          );
        }
      }

      process.exit(0);
    } else if (
      arg === "--docs" &&
      filteredArgv[i + 1] &&
      !filteredArgv[i + 1].startsWith("-")
    ) {
      const helpDir = path.resolve(__dirname, "..", "..", "docs");
      const fileName = filteredArgv[i + 1].endsWith(".pml")
        ? filteredArgv[i + 1]
        : `${filteredArgv[i + 1]}.pml`;
      const helpFile = path.join(helpDir, fileName);

      if (!fs.existsSync(helpFile)) {
        console.error("[X] Help file not found:", helpFile);
        process.exit(1);
      }

      const raw = fs.readFileSync(helpFile, "utf8");
      const name = raw.match(/=name:(.+)/)?.[1]?.trim() ?? "(unknown)";
      const docs = extractSection(raw, "docs") ?? "(no docs)";
      const examples = extractSection(raw, "examples") ?? "(no examples)";

      console.log(`\n📘 Help: ${name}\n`);
      console.log("📝 Docs:\n" + docs);
      console.log("\n💡 Examples:\n" + examples);

      process.exit(0);
    } else {
      const resolvedArg = resolveMacroPath(arg, macroBase);
      positional.push(resolvedArg);
    }
  }

  if (!options.command) {
    if (positional.length >= 1) options.filename = positional[0];
    if (positional.length >= 2) options.format = positional[1];
    if (positional.length >= 3) {
      options.output = resolveOutputTarget(positional[2], options.filename);
      options.outputExplicitlySet = true;
    }

    if (!options.filename || options.filename.startsWith("-")) {
      console.error("[X] No valid input file provided.");
      printHelp();
      process.exit(1);
    }

    if (!options.format) {
      options.format = "json";
    }

    if (!options.output) {
      options.output = options.filename.replace(/\.[^/.]+$/, "");
    }
  }

  return options;
}

function parseSubcommandOptions(args, options) {
  for (const arg of args) {
    if (arg.startsWith("-output=")) {
      options.output = arg.split("=")[1];
      options.outputExplicitlySet = true;
    } else if (arg.startsWith("-graphView=")) {
      options.graphView = arg.split("=")[1];
    } else if (arg.startsWith("-graphDirection=")) {
      options.graphDirection = arg.split("=")[1].toUpperCase();
    } else if (arg.startsWith("-v")) {
      options.verbosity = arg.length - 1;
    } else if (arg.startsWith("-trust=")) {
      options.trustMode = arg.split("=")[1];
    } else if (arg.startsWith("-trustRegistry=")) {
      options.trustRegistry.push(arg.split("=")[1]);
    } else {
      options.extraArgs.push(arg);
    }
  }
}

function resolveOutputTarget(target, inputFile) {
  const resolvedTarget = path.resolve(process.cwd(), target);
  const sourceBaseName = path.basename(inputFile, path.extname(inputFile));
  const looksLikeDirectory =
    /[\\/]$/.test(target) ||
    (fs.existsSync(resolvedTarget) && fs.statSync(resolvedTarget).isDirectory()) ||
    path.extname(target) === "";

  if (looksLikeDirectory) {
    return path.join(resolvedTarget, sourceBaseName);
  }

  return resolvedTarget.replace(/\.[^/.]+$/, "");
}

function printHelp() {
  console.log(`


Protoparser CLI Tool

Alias: protoparser, protoml-parser
Alias Protoviewer: protoviewer, protoml-viewer
Usage:
  protoparser [options] <filename> <format>
  protoparser [options] <filename> <format> <output_dir>
  protoparser tags <tags_file> statistics
  protoparser analyze <pml_file> statistics
  protoparser validate <pml_file>
  protoparser trust <pml_file>
  protoparser sign <macro|pml> <file>
  protoparser verify <macro|pml> <file>
  protoparser macros <pml_file>
  protoparser macro_install <subcommand> [...]
  protoparser register <dir> statistics
  protoparser bundle <pml_file>
  protoparser scaffold meeting [target_dir]
  protoparser init [target_dir]
  protoparser chm [app|browser|path|compiled|compiled_path|download] [topic]
  protoparser viewer [browser|app|path] [file]
  protoparser associate [pml]
  protoparser --listMacros <macro_dir>
  protoparser --macroHelp <macro_file>
  protoparser --listMacrosJson <macro_dir>
  protoparser --listDocs
  protoparser --docs <module>
  protoviewer <filename> <theme>

Options:
  -v, -vv, -vvv           Set verbosity level (1–3)
  -output=<filename>      Set output base name (without extension)
  -theme=<name>           Apply export theme (HTML/PDF only)
  -hideMeta               Hide metadata sections in rendered output
  -graphView=<mode>       Set graph mode for analyze graph (compact, full, imports, tags)
  -graphDirection=<dir>   Set Mermaid graph direction (TD, LR, RL, BT)
  -strict                 Enable strict parsing
  -trust=<mode>           Set trust mode (off, warn, strict)
  -trustRegistry=<src>    Add trust registry source (file, dir, or URL)
  --listMacros "<dir>"      List available macros (e.g. {{macro_dir}})
  --macroHelp "<file>"      Show macro help from file
  --listMacrosJson "<dir>"  Output all macros as JSON array (with docs/template)
  --listDocs              List all available help modules from /docs
  --docs <file>           Show help module from /docs folder (e.g. meeting, protoml-parse)
  --help                  Show this help
  --version               Show version information

Examples:
  protoparser Meeting.pml html
  protoparser Meeting.pml html ./html
  protoparser Meeting.pml markdown
  protoparser Meeting.pml text
  protoparser tags _tags.pml statistics
  protoparser analyze Meeting.pml statistics
  protoparser analyze Meeting.pml graph
  protoparser analyze Meeting.pml graph -graphView=full -graphDirection=LR
  protoparser validate Meeting.pml
  protoparser trust Meeting.pml -trustRegistry=./my-registry
  protoparser sign macro ./macros/warn_box.pml ./keys/alice-private.pem Alice alice-main
  protoparser verify macro ./macros/warn_box.pml -trustRegistry=./my-registry
  protoparser tags _tags.pml validate
  protoparser macros Meeting.pml
  protoparser macro_install init
  protoparser macro_install init_registry ./my-registry
  protoparser macro_install init_pack legal-pack ./my-registry
  protoparser macro_install add_registry ./my-registry
  protoparser macro_install add_package legal-pack 1.0.0
  protoparser macro_install sync
  protoparser register ./docs statistics
  protoparser bundle Meeting.pml
  protoparser scaffold meeting ./demo
  protoparser init ./project
  protoparser chm
  protoparser chm browser
  protoparser chm path
  protoparser chm compiled
  protoparser chm compiled_path
  protoparser chm download
  protoparser viewer
  protoparser viewer browser ./meeting.pml
  protoparser viewer app ./meeting.pml
  protoparser associate
  protowebviewer ./meeting.pml
  protoparser -vv -output=notes Meeting.pml json
  protoparser --listMacros ./macros
  protoparser --macroHelp ./macros/finance/f_entry.pml
  protoparser --listMacrosJson {{macro_dir}}
  protoparser --listDocs
  protoparser --docs meeting
  protoviewer Meeting.pml dark
`);
}


function printVersion(version) {
  console.log(`Protoparser version: ${version}`);
}

function printBuildVersion(buildVersion) {
  console.log(`Build version: ${buildVersion}`);
}

module.exports = {parseArgs, resolveMacroPath};
