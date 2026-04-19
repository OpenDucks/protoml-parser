const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { parseMacroDefinition } = require("../core/macroDefinition");

const repoRoot = path.resolve(__dirname, "..", "..");
const docsDir = path.join(repoRoot, "docs");
const chmDir = path.join(docsDir, "chm");
const htmlDocsDir = path.join(chmDir, "html_docs");
const projectFile = path.join(chmDir, "protoml-help.hhp");
const tocFile = path.join(chmDir, "TOC.hhc");
const indexFile = path.join(chmDir, "Index.hhk");
const tocHtmlFile = path.join(chmDir, "toc.html");
const embeddedTocHtmlFile = path.join(chmDir, "toc.embedded.html");
const helpViewerFile = path.join(chmDir, "help-viewer.html");
const stylesFile = path.join(htmlDocsDir, "help.css");
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const protoVersion = packageJson.version || "unknown";

const compilerCandidates = [
  process.env.HHC_EXE,
  "C:\\Program Files (x86)\\HTML Help Workshop\\hhc.exe",
  "C:\\Program Files\\HTML Help Workshop\\hhc.exe",
].filter(Boolean);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "topic";
}

function titleCaseFromName(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractSection(raw, sectionName) {
  const trimmed = String(raw || "").trimStart();
  if (trimmed.startsWith("@help")) {
    return extractKnownSection(raw, sectionName, ["name", "docs", "examples"]);
  }

  if (trimmed.startsWith("@new_macro")) {
    return extractKnownSection(raw, sectionName, ["name", "docs", "template"]);
  }

  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const header = new RegExp(`^=${escaped}:`, "m").exec(raw);
  if (!header || header.index == null) return "";

  const contentStart = header.index + header[0].length;
  const rest = raw.slice(contentStart);
  const nextSectionMatch = /^=[a-zA-Z0-9_-]+:/m.exec(rest);
  const contentEnd = nextSectionMatch ? contentStart + nextSectionMatch.index : raw.length;
  return raw.slice(contentStart, contentEnd).trim();
}

function extractKnownSection(raw, sectionName, orderedSectionNames) {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const header = new RegExp(`^=${escaped}:`, "m").exec(raw);
  if (!header || header.index == null) return "";

  const contentStart = header.index + header[0].length;
  const currentIndex = orderedSectionNames.indexOf(sectionName);
  const nextSectionNames = currentIndex >= 0
    ? orderedSectionNames.slice(currentIndex + 1)
    : [];

  if (!nextSectionNames.length) {
    return raw.slice(contentStart).trim();
  }

  const nextSectionPattern = nextSectionNames
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const rest = raw.slice(contentStart);
  const nextSectionMatch = new RegExp(`^=(?:${nextSectionPattern}):`, "m").exec(rest);
  const contentEnd = nextSectionMatch ? contentStart + nextSectionMatch.index : raw.length;
  return raw.slice(contentStart, contentEnd).trim();
}

function inlineFormat(text) {
  return escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderMarkdownish(text, options = {}) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const html = [];
  let paragraph = [];
  let listItems = [];
  let codeFence = null;
  let codeLines = [];

  const macroCache = options.macroCache || {};

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineFormat(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!listItems.length) return;
    html.push("<ul>");
    for (const item of listItems) {
      html.push(`<li>${inlineFormat(item)}</li>`);
    }
    html.push("</ul>");
    listItems = [];
  }

  function flushCode() {
    if (!codeFence) return;
    const langClass = codeFence ? ` class="language-${escapeAttribute(codeFence)}"` : "";
    html.push(`<pre><code${langClass}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeFence = null;
    codeLines = [];
  }

  function renderMacroLine(line) {
    const match = String(line || "").trim().match(/^@@macro=([\w-]+):(.*)$/);
    if (!match) return null;

    const [, macroName, rawParams] = match;
    const template = macroCache[macroName];
    if (!template) {
      return `<pre><code>${escapeHtml(line)}</code></pre>`;
    }

    const params = {};
    for (const entry of rawParams.split(";")) {
      const [key, ...rest] = entry.split("=");
      if (!key) continue;
      params[key.trim()] = rest.join("=").trim();
    }

    return String(template).replace(/\{\{(.*?)\}\}/g, (_, key) => {
      const normalizedKey = String(key).trim();
      return params[normalizedKey] ?? "";
    });
  }

  for (const line of lines) {
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^```([a-zA-Z0-9_-]+)?$/);
    if (fenceMatch) {
      if (codeFence != null) {
        flushCode();
      } else {
        flushParagraph();
        flushList();
        codeFence = fenceMatch[1] || "";
      }
      continue;
    }

    if (codeFence != null) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const renderedMacro = renderMacroLine(trimmed);
    if (renderedMacro) {
      flushParagraph();
      flushList();
      html.push(renderedMacro);
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      listItems.push(trimmed.slice(2).trim());
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushCode();

  return html.join("\n");
}

function loadBundledMacroCache() {
  const macrosDir = path.join(repoRoot, "macros");
  const cache = {};

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".pml")) {
        continue;
      }

      const parsed = parseMacroDefinition(fs.readFileSync(fullPath, "utf8"));
      if (parsed?.name && parsed.template) {
        cache[parsed.name] = parsed.template;
      }
    }
  }

  if (fs.existsSync(macrosDir)) {
    walk(macrosDir);
  }

  return cache;
}

function htmlTemplate(title, body) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} - ProtoML ${escapeHtml(protoVersion)}</title>
  <link rel="stylesheet" href="help.css">
</head>
<body>
  <nav class="topnav">
    <a href="../toc.html">Contents</a>
    <span class="version">ProtoML ${escapeHtml(protoVersion)}</span>
  </nav>
  <main class="page">
    ${body}
  </main>
</body>
</html>
`;
}

function buildGuidePages() {
  return [
    {
      file: "00_overview.html",
      title: "Documentation Index",
      group: "Guides",
      keywords: ["overview", "documentation", "index", "protoml", "intro", "what is protoml"],
      body: `
        <h1>ProtoML Documentation</h1>
        <p>ProtoML is a lightweight document language for meetings, protocols, task lists, reusable content, shared participants, shared tags, and structured exports.</p>
        <p>The repository includes the parser, renderers, CLI tools, bundled macros, the Electron viewer, and Windows CHM help generation.</p>
        <h2>Start here</h2>
        <ul>
          <li><a href="01_installation.html">Installation And Release Use</a></li>
          <li><a href="02_quick_start.html">Quick Start</a></li>
          <li><a href="06_concepts.html">ProtoML Concepts</a></li>
          <li><a href="07_authoring_guide.html">Authoring Guide</a></li>
          <li><a href="08a_reuse_and_imports.html">Reuse And Imports Guide</a></li>
          <li><a href="08_macro_registry_guide.html">Own Macro Registry Guide</a></li>
          <li><a href="13_macro_security_trust_model.html">Macro Security And Trust Model</a></li>
          <li><a href="14_validation_and_analysis_workflows.html">Validation And Analysis Workflows</a></li>
          <li><a href="15_governance_documents.html">Governance Documents</a></li>
          <li><a href="16_release_and_packaging.html">Release And Packaging</a></li>
          <li><a href="11_examples_cookbook.html">Examples Cookbook</a></li>
        </ul>
        <h2>By role</h2>
        <ul>
          <li>Authors: Quick Start, Authoring Guide, Reuse And Imports Guide, Outputs And Rendering</li>
          <li>Macro users: Macros Guide, Reuse And Imports Guide, Own Macro Registry Guide, Macro Security And Trust Model, Examples Cookbook</li>
          <li>CLI users: CLI Reference, Outputs And Rendering, Validation And Analysis Workflows, Release And Packaging</li>
          <li>Viewer users: Viewer Guide</li>
          <li>Governance-focused users: Governance Documents, Validation And Analysis Workflows</li>
          <li>Users exploring the language surface: Reference Map</li>
        </ul>
        <h2>What lives where</h2>
        <ul>
          <li><code>README.md</code> for project overview, installation, quick start, and release structure</li>
          <li><code>docs/*.pml</code> for built-in CLI help topics via <code>protoparser --docs &lt;topic&gt;</code></li>
          <li><code>docs/chm/</code> for generated Windows CHM help project files and compiled output</li>
          <li><code>examples/</code> for runnable feature and macro-registry examples</li>
        </ul>
      `,
    },
    {
      file: "01_installation.html",
      title: "Installation And Release Use",
      group: "Guides",
      keywords: ["install", "npm", "release", "dist", "chm", "executables"],
      body: `
        <h1>Installation And Release Use</h1>
        <h2>Install from npm</h2>
        <pre><code>npm install -g protoml-parser</code></pre>
        <h2>Install from source</h2>
        <pre><code>git clone https://github.com/Ente/protoml-parser.git
cd protoml-parser
npm install -g .</code></pre>
        <h2>Release structure</h2>
        <ul>
          <li>Source code for development and npm publishing</li>
          <li>Windows and Linux executables in <code>dist/</code></li>
          <li>Native Windows CHM help in <code>docs/chm/</code> and copied to <code>dist/</code> during release preparation</li>
          <li><code>SHA256SUMS.txt</code> for release checksums</li>
        </ul>
        <h2>Version check</h2>
        <pre><code>protoparser --version</code></pre>
        <h2>Continue with</h2>
        <p>After installation, move on to <a href="02_quick_start.html">Quick Start</a> for the first end-to-end document workflow.</p>
      `,
    },
    {
      file: "02_quick_start.html",
      title: "Quick Start",
      group: "Guides",
      keywords: ["quick start", "first file", "render", "viewer"],
      body: `
        <h1>Quick Start</h1>
        <p>This is the shortest useful end-to-end ProtoML workflow.</p>
        <h2>1. Install</h2>
        <pre><code>npm install -g protoml-parser</code></pre>
        <h2>2. Create <code>test.pml</code></h2>
        <pre><code>@tags_import "_tags.pml"
@protocol "Weekly Sync - {{date}}"

@date:17.04.2026

@participants
=lead:Jane Doe,jdoe,jdoe@example.com
=ops:Max Mustermann,mmustermann,max@example.com

@subjects
=0:Release status
=1:Next steps

@tasks
-[ ] Prepare package notes @ptp=lead =0 @tag=important
-[ ] Validate release build @ptp=ops =1 @tag=review

@meeting "Minutes"
# Weekly Sync
## Participants
@@e=lead, @@e=ops
## Topics
@@e=0
@@e=1</code></pre>
        <h2>3. Create <code>_tags.pml</code></h2>
        <pre><code>@title "Shared Workflow Tags"

@tags
=important:High priority
=review:Needs review</code></pre>
        <p>This first split already demonstrates a useful ProtoML habit: keep reusable classification in a shared tags file and keep meeting-specific content in the meeting file.</p>
        <h2>4. Render HTML</h2>
        <pre><code>protoparser "test.pml" html</code></pre>
        <p>HTML is the best first output because it shows most of the structure, styling, tags, and macro behavior in the richest form.</p>
        <h2>5. Open it in the viewer</h2>
        <pre><code>protoviewer "test.pml"</code></pre>
        <p>Use the viewer when you want a local review loop while editing instead of thinking in terms of generated export files.</p>
        <h2>6. Add a first macro</h2>
        <pre><code>@macro badge "{{macro_dir}}/badge.pml"
@@macro=badge:text=review</code></pre>
        <p>This is a good first macro because it adds presentation reuse without changing the document model itself.</p>
        <h2>7. Explore the feature suite</h2>
        <pre><code>protoparser "examples/feature-suite/main_demo.pml" html
protoparser analyze "examples/feature-suite/main_demo.pml" statistics
protoparser tags "examples/feature-suite/_workflow_tags.pml" statistics</code></pre>
        <p>The feature suite is where you should look once the first file makes sense. It shows imports, tag merging, macros, analysis, and richer cross-file behavior.</p>
        <h2>Path recommendation</h2>
        <p>Wrap file paths in double quotes whenever possible, especially for paths with spaces or <code>{{macro_dir}}</code>.</p>
        <h2>What you learned in this first pass</h2>
        <ul>
          <li>ProtoML separates structured data from the reader-facing narrative</li>
          <li>Shared tags are a practical way to keep task language consistent</li>
          <li>HTML and the viewer are the easiest first ways to inspect a document</li>
          <li>Macros add reusable rendering patterns on top of a stable document structure</li>
        </ul>
        <h2>Next reading</h2>
        <ul>
          <li><a href="06_concepts.html">ProtoML Concepts</a></li>
          <li><a href="07_authoring_guide.html">Authoring Guide</a></li>
          <li><a href="04_macros_guide.html">Macros Guide</a></li>
          <li><a href="08a_reuse_and_imports.html">Reuse And Imports Guide</a></li>
          <li><a href="08_macro_registry_guide.html">Own Macro Registry Guide</a></li>
        </ul>
      `,
    },
    {
      file: "03_cli_workflows.html",
      title: "CLI Reference",
      group: "Guides",
      keywords: ["cli", "workflow", "reference", "validate", "analyze", "register", "bundle"],
      body: `
        <h1>CLI Reference</h1>
        <p>ProtoML currently exposes these main binaries: <code>protoml-parser</code>, <code>protoparser</code>, <code>protoml-viewer</code>, and <code>protoviewer</code>.</p>
        <h2>Main syntax</h2>
        <pre><code>protoparser [options] &lt;filename&gt; &lt;format&gt;
protoparser [options] &lt;filename&gt; &lt;format&gt; &lt;output_dir&gt;</code></pre>
        <h2>Main render formats</h2>
        <pre><code>protoparser "test.pml" html
protoparser "test.pml" pdf
protoparser "test.pml" json
protoparser "test.pml" markdown
protoparser "test.pml" text</code></pre>
        <p>Most users should think of these as three classes of outputs: reader-facing rich output, archival/static output, and machine-readable output.</p>
        <h2>Analysis and validation</h2>
        <pre><code>protoparser validate "test.pml"
protoparser tags "_tags.pml" validate
protoparser tags "_tags.pml" statistics
protoparser macros "test.pml"
protoparser trust "test.pml"
protoparser analyze "test.pml" statistics
protoparser analyze "test.pml" graph
protoparser register "meetings" statistics
protoparser bundle "test.pml"</code></pre>
        <p>These commands are where ProtoML stops being just a renderer and starts acting like a document system. They let you inspect structure, governance metadata, tag usage, macro usage, import relationships, and document trust state.</p>
        <p><code>register</code> here means a governance report over document folders. It is separate from macro registries and the <code>macro_install ..._registry</code> commands used for external macro packs.</p>
        <h2>Project and packaging commands</h2>
        <pre><code>protoparser scaffold meeting "./demo"
protoparser init "./project"</code></pre>
        <p>Use these when you want a repeatable starting structure instead of hand-creating the first files.</p>
        <h2>Macro commands</h2>
        <pre><code>protoparser --listMacros "{{macro_dir}}"
protoparser --macroHelp "{{macro_dir}}/finance/f_entry.pml"
protoparser --listMacrosJson "{{macro_dir}}"</code></pre>
        <p>These are especially useful when a team wants to discover what is already bundled before inventing new macros.</p>
        <h2>Documentation commands</h2>
        <pre><code>protoparser --listDocs
protoparser --docs meeting
protoparser chm
protoparser chm path
protoparser chm download</code></pre>
        <p>The built-in docs help with precise topic lookup, while the CHM guides are better for learning and orientation.</p>
        <h2>Trust and signing commands</h2>
        <pre><code>protoparser trust "test.pml"
protoparser sign macro "./macros/warn_box.pml" "./keys/alice-private.pem" "Alice" alice-main
protoparser sign pml "./governance/release-approval.pml" "./keys/alice-private.pem" "Alice" alice-main
protoparser verify macro "./macros/warn_box.pml" -trustRegistry="./my-registry"
protoparser verify pml "./governance/release-approval.pml" -trustRegistry="./authors-registry"</code></pre>
        <p>These commands provide the lightweight trust workflow: static risk checks, detached signatures, and author trust lookup via registry sources. The same detached signature model works for normal governance-style <code>.pml</code> files as well as macros.</p>
        <h2>Useful options</h2>
        <ul>
          <li><code>-v</code>, <code>-vv</code>, <code>-vvv</code> for verbosity on text-style reports</li>
          <li><code>-theme=&lt;name&gt;</code> for HTML and PDF themes</li>
          <li><code>-strict</code> for stricter validation behavior</li>
          <li><code>-trust=off|warn|strict</code> and repeatable <code>-trustRegistry=...</code> flags for trust enforcement and author lookup</li>
          <li><code>-graphView=&lt;mode&gt;</code> and <code>-graphDirection=&lt;dir&gt;</code> for graph rendering</li>
        </ul>
        <h2>Common workflow patterns</h2>
        <ul>
          <li>Authoring loop: <code>protoviewer</code> or <code>protoparser "...pml" html</code></li>
          <li>Quality loop: <code>validate</code>, <code>analyze</code>, and <code>macros</code></li>
          <li>Governance loop: <code>register "&lt;dir&gt;" statistics</code></li>
          <li>Packaging loop: <code>bundle</code> for a single-file archive form</li>
        </ul>
        <h2>Verbosity</h2>
        <ul>
          <li><code>-v</code> adds a compact structural overview</li>
          <li><code>-vv</code> adds deeper lists and nested detail</li>
          <li><code>-vvv</code> adds the most verbose diagnostics available for the command</li>
        </ul>
        <h2>Related guides</h2>
        <ul>
          <li><a href="10_outputs_and_rendering.html">Outputs And Rendering</a></li>
          <li><a href="09_viewer_guide.html">Viewer Guide</a></li>
          <li><a href="05_windows_help_and_dev.html">Windows Help And Development</a></li>
          <li><a href="15a_signed_governance_workflow.html">Signed Governance Workflow Tutorial</a></li>
        </ul>
      `,
    },
    {
      file: "04_macros_guide.html",
      title: "Macros Guide",
      group: "Guides",
      keywords: ["macros", "external macros", "macro install", "registry", "macro packs", "macros import"],
      body: `
        <h1>Macros Guide</h1>
        <p>ProtoML macros provide reusable rendering templates, mainly for HTML-oriented output.</p>
        <h2>What macros are good for</h2>
        <p>Macros are best when the same visual or structured output pattern appears repeatedly across documents. They help you standardize presentation without turning your documents into copy-pasted HTML fragments.</p>
        <h2>Using bundled macros</h2>
        <pre><code>@macro badge "{{macro_dir}}/badge.pml"
@@macro=badge:text=review</code></pre>
        <p>Prefer quotes around paths in CLI usage.</p>
        <pre><code>protoparser --listMacros "{{macro_dir}}"
protoparser --macroHelp "{{macro_dir}}/finance/f_entry.pml"</code></pre>
        <h2>Bundled macro areas</h2>
        <ul>
          <li>standalone: <code>alert</code>, <code>badge</code>, <code>calendar_event</code>, <code>clicktoreveal</code>, <code>codeblock_copy</code>, <code>image</code>, <code>progress_bar</code>, <code>quote</code>, <code>spoiler</code>, <code>tts</code>, <code>warn_box</code></li>
          <li>grouped sets: <code>actions</code>, <code>decisions</code>, <code>finance</code>, <code>highlight</code>, <code>summary</code>, <code>taskflow</code>, <code>timeline</code></li>
        </ul>
        <h2>Writing custom macros</h2>
        <pre><code>@new_macro
=name:statusPill
=template:
&lt;span class="status-pill status-{{state}}"&gt;{{label}}&lt;/span&gt;</code></pre>
        <p>When writing a macro, keep the input parameters obvious and stable. The best custom macros are easy to understand from the call site alone.</p>
        <h2>When to prefer imports, macros, or themes</h2>
        <ul>
          <li>Use imports when the repeated thing is mostly content</li>
          <li>Use macros when you need a reusable component with its own structure and presentation, such as alerts, badges, timelines, summaries, or cards</li>
          <li>Use themes when the desired effect is document-wide styling such as colors, typography, spacing, or general page chrome</li>
          <li>Use tags when the repeated thing is really classification, not rendering</li>
        </ul>
        <h2>External macro pack workflow</h2>
        <pre><code>protoparser macro_install init
protoparser macro_install init_registry "./my-registry"
protoparser macro_install init_pack "legal-pack" "./my-registry"
protoparser macro_install add_registry "./my-registry"
protoparser macro_install install "legal-pack"</code></pre>
        <h2>Use installed packs in a document</h2>
        <pre><code>@macros_import ".protoml/macro-packs/macros.index.pml"</code></pre>
        <p>This is useful when multiple teams or projects should consume the same curated macro set instead of copying files around manually.</p>
        <h2>Practical advice</h2>
        <ul>
          <li>Use imports for content reuse and macros for rendering reuse</li>
          <li>Prefer themes over macros when you only want to change the overall visual look of the document</li>
          <li>Start with bundled macros before creating a shared pack workflow</li>
          <li>Treat untrusted macro files as unsafe, especially when they include JavaScript</li>
          <li>Keep macro names and parameter names predictable across a macro family</li>
        </ul>
        <h2>Related guides</h2>
        <ul>
          <li><a href="06_concepts.html">ProtoML Concepts</a></li>
          <li><a href="08a_reuse_and_imports.html">Reuse And Imports Guide</a></li>
          <li><a href="08_macro_registry_guide.html">Own Macro Registry Guide</a></li>
          <li><a href="11_examples_cookbook.html">Examples Cookbook</a></li>
          <li><a href="03_cli_workflows.html">CLI Reference</a></li>
        </ul>
      `,
    },
    {
      file: "05_windows_help_and_dev.html",
      title: "Windows Help And Development",
      group: "Guides",
      keywords: ["windows help", "chm", "development", "build", "html help workshop"],
      body: `
        <h1>Windows Help And Development</h1>
        <h2>Open the local CHM help</h2>
        <pre><code>protoparser chm
protoparser chm path
protoparser chm download</code></pre>
        <h2>Install HTML Help Workshop first</h2>
        <p>If you want to compile the CHM on your own Windows machine, install Microsoft HTML Help Workshop first.</p>
        <p>Archived installer:</p>
        <pre><code>https://web.archive.org/web/20160201063255/http://download.microsoft.com/download/0/A/9/0A939EF6-E31C-430F-A3DF-DFAE7960D564/htmlhelp.exe</code></pre>
        <h2>Build the CHM project files</h2>
        <pre><code>npm run build:chm:project</code></pre>
        <h2>Compile the CHM</h2>
        <pre><code>npm run build:chm</code></pre>
        <h2>Other useful development commands</h2>
        <pre><code>npm run build:web
npm run dev
npm run build:exe
npm run install:local</code></pre>
        <h2>Related guides</h2>
        <ul>
          <li><a href="03_cli_workflows.html">CLI Reference</a></li>
          <li><a href="00_overview.html">Documentation Index</a></li>
        </ul>
      `,
    },
    {
      file: "06_concepts.html",
      title: "ProtoML Concepts",
      group: "Guides",
      keywords: ["concepts", "document model", "imports", "macros", "tags"],
      body: `
        <h1>ProtoML Concepts</h1>
        <p>ProtoML is not just Markdown with a few extra commands. It behaves more like a small document system for structured protocols, reusable building blocks, and machine-readable exports.</p>
        <h2>Document shape</h2>
        <p>A typical ProtoML file combines metadata, structured blocks such as <code>@participants</code> or <code>@tasks</code>, and a freeform <code>@meeting</code> block for the readable narrative.</p>
        <p>The structured blocks act as the source of truth. The meeting block is where that structured data is turned into a readable document.</p>
        <h2>IDs and references</h2>
        <ul>
          <li><code>=lead:Jane Doe,...</code> defines a participant ID</li>
          <li><code>=0:Release status</code> defines a subject ID</li>
          <li><code>@@e=lead</code> echoes a known entry into the meeting text</li>
          <li><code>@@ref=participants:lead:email</code> fetches a specific field</li>
        </ul>
        <p>This is what makes ProtoML maintainable: values are defined once and then referenced consistently.</p>
        <h2>Imports vs. macros</h2>
        <p>Use <code>@import</code> when you want to reuse content. Use <code>@macro</code> when you want reusable rendering templates.</p>
        <ul>
          <li>Imports help you split large documents into maintainable pieces</li>
          <li>Macros help you standardize repeated render patterns</li>
          <li>They can be combined, but they solve different problems</li>
        </ul>
        <h2>Tags as shared classification</h2>
        <p>Tags are ProtoML's reusable classification layer for tasks. Define them locally with <code>@tags</code>, share them with <code>@tags_import</code>, and analyze them with <code>protoparser tags ...</code>. Participant lists can be reused in a similar way with <code>@participants_import</code>.</p>
        <p>That means ProtoML can support not just writing, but also reporting on work across a document set.</p>
        <h2>When to use what</h2>
        <ul>
          <li>Use metadata for document-level facts</li>
          <li>Use structured blocks when data should be referenceable</li>
          <li>Use <code>@meeting</code> for the human-readable story</li>
          <li>Use <code>@import</code> to split content across files</li>
          <li>Use <code>@macro</code> to standardize repeated rendered patterns</li>
          <li>Use shared tags when multiple files should use the same task vocabulary</li>
        </ul>
        <h2>Related guides</h2>
        <ul>
          <li><a href="07_authoring_guide.html">Authoring Guide</a></li>
          <li><a href="04_macros_guide.html">Macros Guide</a></li>
          <li><a href="12_reference_map.html">Reference Map</a></li>
        </ul>
      `,
    },
    {
      file: "07_authoring_guide.html",
      title: "Authoring Guide",
      group: "Guides",
      keywords: ["authoring", "best practices", "writing", "documents"],
      body: `
        <h1>Authoring Guide</h1>
        <p>This guide focuses on writing maintainable ProtoML documents, not on listing every syntax rule.</p>
        <h2>Start with a consistent skeleton</h2>
        <ol>
          <li>document metadata</li>
          <li>participants</li>
          <li>subjects</li>
          <li>tags or tag imports</li>
          <li>tasks</li>
          <li>meeting content</li>
          <li>optional governance blocks such as signatures, approvals, references, or attachments</li>
        </ol>
        <p>This order keeps the structural source of truth near the top and the human-readable narrative near the bottom, which makes large files easier to review and diff.</p>
        <h2>Name things for reuse</h2>
        <p>Prefer stable, meaningful IDs such as <code>lead</code>, <code>pm</code>, <code>security</code>, <code>release</code>, or <code>review</code>.</p>
        <p>A good rule is that an ID should still make sense three months later without reading the whole file again.</p>
        <h2>Keep structured data in blocks</h2>
        <p>If a value should be reused later, define it once in a block instead of duplicating it in prose.</p>
        <ul>
          <li>Participants belong in <code>@participants</code>, not copied repeatedly in meeting text</li>
          <li>Use <code>@participants_import</code> when multiple documents share the same participant roster</li>
          <li>Subjects belong in <code>@subjects</code>, then tasks and notes can point back to them</li>
          <li>Approval and signature data belong in their dedicated blocks if they are referenced more than once</li>
        </ul>
        <h2>Use shared tags for teams and projects</h2>
        <p>Move stable task vocabularies into shared <code>_tags.pml</code> files when multiple documents share the same workflow or cross-file analysis matters.</p>
        <p>Keep local tags only when a label is temporary, one-off, or too project-specific to be worth sharing.</p>
        <h2>Split large documents deliberately</h2>
        <p>Use <code>@import</code> for appendices, reusable legal or policy text, standard meeting sections, or shared snippets.</p>
        <p>The main document should still read like the table of contents and orchestration layer of the whole document, not like a random pile of imports.</p>
        <h2>Use macros sparingly but intentionally</h2>
        <p>Macros are best for repeated presentation patterns such as alerts, badges, summaries, timelines, and finance cards.</p>
        <p>If the repeated thing is really content, choose imports. If you need a reusable rendered component with its own structure and presentation, choose macros. If you only want to change the overall document look, choose a renderer theme instead.</p>
        <h2>Governance documents need extra discipline</h2>
        <p>Establish conventions for <code>@record_id</code>, <code>@status</code>, <code>@author</code>, <code>@version</code>, <code>@effective_date</code>, <code>@valid_until</code>, and <code>@review_date</code>, then use <code>protoparser register "&lt;dir&gt;" statistics</code>.</p>
        <h2>Worked example</h2>
        <pre><code>@tags_import "_workflow_tags.pml"
@protocol "Platform Weekly Sync - {{date}}"
@date:17.04.2026
@author:Jane Doe
@status:review
@record_id:PLATFORM-WEEKLY-2026-04-17

@participants
=lead:Jane Doe,jdoe,jdoe@example.com
=ops:Max Mustermann,mmustermann,max@example.com
=sec:Alex Roe,aroe,alex@example.com

@subjects
=release:Release status
=security:Security review
=followup:Next actions

@tasks
-[ ] Finalize release notes @ptp=lead =release @tag=important
-[ ] Recheck deployment window @ptp=ops =release @tag=review
-[ ] Confirm exception handling for audit finding @ptp=sec =security @tag=blocked

@meeting "Weekly Minutes"
# Platform Weekly Sync
## Summary
Current focus: @@e=release
## Participants
@@e=lead, @@e=ops, @@e=sec
## Open points
Audit topic: @@e=security
Next section: @@e=followup</code></pre>
        <h2>Why this example is maintainable</h2>
        <ul>
          <li>Document identity and lifecycle are visible at the top</li>
          <li>Participant and subject IDs are stable and descriptive</li>
          <li>Tasks point to structured subjects and tags instead of embedding everything in plain text</li>
          <li>The meeting block reads clearly while still reusing structured values</li>
          <li>The shared tags file keeps workflow classification consistent across multiple documents</li>
        </ul>
        <h2>Common authoring mistakes</h2>
        <ul>
          <li>Using throwaway IDs such as <code>1</code> or <code>x</code> for everything</li>
          <li>Keeping important document metadata only in prose</li>
          <li>Copying repeated names and labels instead of referencing them</li>
          <li>Using macros where a plain import or structured block would be simpler</li>
          <li>Letting large files grow without extracting reusable imported sections</li>
        </ul>
        <h2>Related guides</h2>
        <ul>
          <li><a href="06_concepts.html">ProtoML Concepts</a></li>
          <li><a href="08a_reuse_and_imports.html">Reuse And Imports Guide</a></li>
          <li><a href="11_examples_cookbook.html">Examples Cookbook</a></li>
          <li><a href="12_reference_map.html">Reference Map</a></li>
        </ul>
      `,
    },
    {
      file: "08a_reuse_and_imports.html",
      title: "Reuse And Imports Guide",
      group: "Guides",
      keywords: ["imports", "reuse", "participants_import", "tags_import", "macros_import", "shared files"],
      body: `
        <h1>Reuse And Imports Guide</h1>
        <p>ProtoML has several reuse mechanisms, and they solve different problems. This guide connects them into one practical workflow so you can choose the right one quickly.</p>
        <h2>Choose the right reuse tool</h2>
        <ul>
          <li><code>@import name "file" pml|html</code> when you want to inject maintained content into the meeting output</li>
          <li><code>@participants_import "file.pml"</code> when multiple documents should share the same participant roster</li>
          <li><code>@tags_import "file.pml"</code> when multiple documents should share the same task vocabulary</li>
          <li><code>@macros_import "file.pml"</code> when one generated or curated macro index should expose many macros at once</li>
          <li><code>@macro name "file.pml"</code> when a document should register one concrete macro file directly</li>
        </ul>
        <h2>Shared participants</h2>
        <pre><code>@participants_import "_participants.pml"

@tasks
-[ ] Prepare release notes @ptp=lead

@meeting "Minutes"
Lead: @@e=lead
Lead mail: @@ref=participants:lead:email</code></pre>
        <p>Use this when teams, committees, or recurring meeting series keep reusing the same people. The participant file becomes the shared source of truth.</p>
        <h2>Shared tags</h2>
        <pre><code>@tags_import "_workflow_tags.pml"

@tasks
-[ ] Check deployment window @tag=review
-[ ] Confirm fix plan @tag=blocked</code></pre>
        <p>Use shared tags when reporting and workflow consistency matter across many documents. This is the most common cross-file reuse mechanism after plain imports.</p>
        <h2>Content imports</h2>
        <pre><code>@import appendix "appendix.pml" pml
@import legal "legal_notice.html" html

@meeting "Minutes"
## Appendix
@@output=appendix
## Notice
@@import=legal</code></pre>
        <p>Content imports are best for maintained snippets, appendices, reusable sections, or legal text that should live outside the main document.</p>
        <h2>Direct macros vs. macro indexes</h2>
        <pre><code>@macro badge "{{macro_dir}}/badge.pml"
@@macro=badge:text=review</code></pre>
        <p>This direct form is best for a small number of known macros inside one document or repository.</p>
        <pre><code>@macros_import ".protoml/macro-packs/macros.index.pml"
@@macro=decisionCard:title=Storage;text=Use the replicated tier</code></pre>
        <p>This indexed form is best once you install packs through <code>macro_install</code> and want one shared entry point for many macros.</p>
        <h2>Recommended file layout</h2>
        <pre><code>meetings/
  weekly-sync.pml
shared/
  _participants.pml
  _workflow_tags.pml
snippets/
  appendix.pml
  legal_notice.html</code></pre>
        <p>This layout keeps shared assets explicit and avoids mixing long-lived vocabularies with one-off meeting text.</p>
        <h2>Common mistakes</h2>
        <ul>
          <li>Using a macro when the repeated thing is really just maintained content</li>
          <li>Keeping participant lists local in every meeting even though the same roster repeats weekly</li>
          <li>Using local tags everywhere and then wondering why cross-file statistics are inconsistent</li>
          <li>Registering many macros one by one when a generated <code>@macros_import</code> index would be cleaner</li>
        </ul>
        <h2>Rule of thumb</h2>
        <ul>
          <li>Reuse data with imports to blocks such as participants and tags</li>
          <li>Reuse content with <code>@import</code></li>
          <li>Reuse rendering with macros</li>
        </ul>
        <h2>Related guides</h2>
        <ul>
          <li><a href="07_authoring_guide.html">Authoring Guide</a></li>
          <li><a href="04_macros_guide.html">Macros Guide</a></li>
          <li><a href="08_macro_registry_guide.html">Own Macro Registry Guide</a></li>
          <li><a href="14_validation_and_analysis_workflows.html">Validation And Analysis Workflows</a></li>
        </ul>
      `,
    },
    {
      file: "08_macro_registry_guide.html",
      title: "Own Macro Registry Guide",
      group: "Guides",
      keywords: ["macro registry", "own registry", "macro packs", "registry workflow", "macros import"],
      body: `
        <h1>Own Macro Registry Guide</h1>
        <p>This guide shows how to build and maintain your own local ProtoML macro registry, publish packs into it, and consume those packs from a project meeting file.</p>
        <h2>What this workflow is for</h2>
        <p>Use a custom macro registry when you want a reusable, curated macro catalog for one team, one company, or one document domain instead of copying macro files between repositories.</p>
        <p>This guide is about macro package registries only. It is not about <code>protoparser register "&lt;dir&gt;"</code>, which creates governance and status reports for document collections.</p>
        <h2>Where a company registry can live</h2>
        <ul>
          <li>a simple internal web server that serves <code>protoml.registry.json</code> and pack files over HTTP or HTTPS</li>
          <li>a shared local path such as <code>Z:\\protoml-registry</code> or <code>/mnt/protoml-registry</code></li>
          <li>an intranet static host or normal artifact/file server</li>
        </ul>
        <p>You do not need a special registry backend. A company registry can be just static JSON plus files on a plain web server or network path.</p>
        <h2>Choose the right trust path first</h2>
        <ul>
          <li>Use bundled <code>{{macro_dir}}</code> macros first when the shipped macro set already covers the need</li>
          <li>Use a registry when you need reusable custom packs across multiple projects or teams</li>
          <li>Use detached signatures plus a registry when your custom macros should resolve to <code>trusted</code></li>
          <li>Use unsigned local macros only for exploratory work where <code>unknown</code> is acceptable</li>
        </ul>
        <h2>Create the registry</h2>
        <pre><code>protoparser macro_install init_registry "./my-registry"</code></pre>
        <p>This creates the local registry root and the <code>protoml.registry.json</code> index file.</p>
        <h2>Create a pack inside the registry</h2>
        <pre><code>protoparser macro_install init_pack "meeting-kit" "./my-registry"</code></pre>
        <p>This gives you a pack folder with a <code>protoml-pack.json</code> manifest and a place for the pack's macro files.</p>
        <h2>Add macros to the pack</h2>
        <p>Place your custom macro files into the pack and describe the pack in its manifest. A simple macro could look like this:</p>
        <pre><code>@new_macro
=name:decisionCard
=docs:
Renders a highlighted decision summary.
=template:
&lt;div class="decision-card"&gt;
  &lt;strong&gt;{{title}}&lt;/strong&gt;&lt;br&gt;
  {{text}}
&lt;/div&gt;</code></pre>
        <h2>Add the pack to the registry index</h2>
        <pre><code>protoparser macro_install registry_add "./my-registry" "./my-registry/packs/meeting-kit"</code></pre>
        <p>If the pack changes later, refresh the registry entry with:</p>
        <pre><code>protoparser macro_install registry_update "./my-registry" "./my-registry/packs/meeting-kit"</code></pre>
        <h2>Connect a project to your registry</h2>
        <pre><code>protoparser macro_install init
protoparser macro_install add_registry "./my-registry"</code></pre>
        <p>This prepares the project-local macro configuration and adds your registry as a source.</p>
        <h2>Install or sync a pack from the registry</h2>
        <pre><code>protoparser macro_install add_package "meeting-kit" 1.0.0
protoparser macro_install sync</code></pre>
        <p>Or install in one step:</p>
        <pre><code>protoparser macro_install install "meeting-kit" 1.0.0</code></pre>
        <p>The project then receives the installed files in <code>.protoml/macro-packs/</code> and a generated <code>macros.index.pml</code>.</p>
        <h2>Bind the registry macros into a meeting file</h2>
        <pre><code>@macros_import ".protoml/macro-packs/macros.index.pml"
@protocol "Architecture Review - {{date}}"

@participants
=lead:Jane Doe,jdoe,jdoe@example.com

@meeting "Architecture Review"
# Decisions
@@macro=decisionCard:title=Storage;text=Use the replicated storage tier</code></pre>
        <p>This is the meeting-side integration step: the generated macro index exposes the installed macros, and the meeting document uses them with <code>@@macro=...</code>.</p>
        <h2>Manage installed packs in a project</h2>
        <ul>
          <li>List installed packs: <code>protoparser macro_install list</code></li>
          <li>Inspect a pack: <code>protoparser macro_install info "meeting-kit"</code></li>
          <li>Change the requested version: <code>protoparser macro_install update_package "meeting-kit" 1.1.0</code></li>
          <li>Remove the package definition: <code>protoparser macro_install remove_package "meeting-kit"</code></li>
          <li>Uninstall and remove a pack from the project: <code>protoparser macro_install remove "meeting-kit"</code></li>
        </ul>
        <h2>Manage the registry itself</h2>
        <ul>
          <li>Add a pack entry: <code>registry_add</code></li>
          <li>Refresh a changed pack entry: <code>registry_update</code></li>
          <li>Remove a pack entry: <code>protoparser macro_install registry_remove "./my-registry" "meeting-kit"</code></li>
        </ul>
        <p>Removing a pack from the registry index stops future resolution through that registry entry, but existing project installs may still keep local copies until updated or removed.</p>
        <h2>Signing workflow for registry macros</h2>
        <p>If you want a registry-delivered macro to become <code>trusted</code> in the ProtoML trust workflow, the macro file itself must be signed and the signing author must be listed in the registry <code>authors</code> section.</p>
        <pre><code>protoparser sign macro "./my-registry/packs/meeting-kit/macros/meeting_kit_sample.pml" "./keys/alice-private.pem" "Alice" alice-main</code></pre>
        <p>This creates a detached <code>*.sig.json</code> file next to the macro. The registry then needs a matching trusted author entry:</p>
        <pre><code>{
  "version": 1,
  "name": "my-registry",
  "authors": [
    {
      "name": "Alice",
      "trust": "trusted",
      "keys": [
        {
          "id": "alice-main",
          "public_key": "-----BEGIN PUBLIC KEY----- ..."
        }
      ]
    }
  ],
  "packages": []
}</code></pre>
        <p>After that, consumers can run <code>verify</code> or <code>trust</code> with <code>-trustRegistry=...</code> and the macro can resolve to <code>trusted</code> if it has no hard risk flags such as JavaScript or external URLs.</p>
        <h2>Registries can be split or combined</h2>
        <p>A ProtoML registry does not have to do everything at once. A registry may publish:</p>
        <ul>
          <li>package entries in <code>packages</code> for install, sync, and search workflows</li>
          <li>author trust entries in <code>authors</code> for trust, verify, and validate workflows</li>
          <li>or both in one combined registry</li>
        </ul>
        <p>That means teams can keep macro delivery in one registry and trusted authors in another if that better matches their release and security process.</p>
        <h2>Recommended trust-aware workflow</h2>
        <ol>
          <li>Start with bundled macros when possible</li>
          <li>Create a custom pack only for the gaps</li>
          <li>Sign the pack macros before treating them as production-ready</li>
          <li>Publish the signing authors in the registry <code>authors</code> list</li>
          <li>Install the pack into the project and check it with <code>trust</code>, <code>verify</code>, or <code>validate -trust=...</code></li>
          <li>Review JavaScript and external URLs explicitly, even for signed registry macros</li>
        </ol>
        <h2>What about built-in macros?</h2>
        <p>Bundled built-in macros can resolve to <code>trusted</code> without detached sidecars when they match the shipped built-in hash manifest and do not trigger hard risk flags.</p>
        <p>If built-in macros should participate in the exact same author-signature workflow as external macros, they still need detached signatures and a matching trusted author entry in a documented trust registry. Extra or modified files in the built-in macro directory are not automatically trusted.</p>
        <h2>Detached sidecar workflow without a registry</h2>
        <p>Not every signed macro has to live inside a registry.</p>
        <p>Author side:</p>
        <ul>
          <li>sign the standalone macro file with <code>protoparser sign macro ...</code></li>
          <li>ship the macro together with its <code>*.sig.json</code> sidecar</li>
          <li>ship the public key through a documented channel</li>
        </ul>
        <p>User side:</p>
        <ul>
          <li>keep the macro and sidecar together</li>
          <li>run <code>protoparser verify macro ...</code></li>
          <li>treat the result as cryptographic verification, not as automatic registry trust</li>
        </ul>
        <h2>Remote registries</h2>
        <p>ProtoML can already use remote registry URLs for discovery, trust lookup, and explicit search. The remote workflow is intentionally simple: the registry is just a JSON document plus reachable pack files behind normal HTTP or HTTPS URLs.</p>
        <h2>What the registry admin must do</h2>
        <ol>
          <li>Host a <code>protoml.registry.json</code> file on a stable HTTP or HTTPS URL</li>
          <li>Publish each pack at a stable remote location and make sure the registry <code>source</code> and <code>manifest</code> paths point to reachable files</li>
          <li>Keep package versions immutable once published whenever possible</li>
          <li>Optionally publish an <code>authors</code> list with trusted or untrusted authors and public keys for trust verification</li>
          <li>Document whether the registry is public, internal, reviewed, or experimental</li>
        </ol>
        <p>A minimal remote registry usually looks like a static website, GitHub Pages site, internal web server, or artifact host that serves JSON and pack files without any special server logic.</p>
        <h2>What the user must do</h2>
        <ol>
          <li>Add the remote registry to the project with <code>protoparser macro_install add_registry "https://example.org/protoml.registry.json"</code> if it should be part of the project config</li>
          <li>Search it explicitly with <code>protoparser macro_install search "meeting" "https://example.org/protoml.registry.json"</code> if it should only be queried ad hoc</li>
          <li>Use repeatable <code>-trustRegistry=...</code> flags with <code>trust</code>, <code>verify</code>, or <code>validate -trust=...</code> when one or more registries should act as author trust sources</li>
          <li>Review the registry owner and pack maintainers before treating the registry as trusted</li>
        </ol>
        <h2>Local company registry variant</h2>
        <p>Some teams do not want HTTP hosting at all. In that case, the same registry can live in a shared directory or mounted network path.</p>
        <pre><code>protoparser macro_install add_registry "Z:\\protoml-registry"
protoparser macro_install add_registry "/mnt/protoml-registry"
protoparser validate "./governance/release-checklist.pml" -trust=strict -trustRegistry="Z:\\protoml-registry"</code></pre>
        <p>This works well for internal-only environments where a reviewed file share or NFS path is easier to operate than a hosted web endpoint.</p>
        <h2>Operational notes</h2>
        <ul>
          <li>Remote registries are best for discovery and trust lookup first</li>
          <li>For controlled environments, teams should still prefer a reviewed internal registry</li>
          <li>If a remote registry changes frequently, consumers should pin versions in <code>protoml.macros.json</code></li>
          <li>Trust classification still comes from risk flags, signatures, and author trust, not from the fact that a registry happens to be remote</li>
        </ul>
        <h2>Recommended maintenance flow</h2>
        <ol>
          <li>Create or edit macros inside a pack</li>
          <li>Update the pack version when behavior meaningfully changes</li>
          <li>Refresh the registry entry</li>
          <li>Update consuming projects and run <code>sync</code></li>
          <li>Render HTML and verify the macro output in a real document</li>
        </ol>
        <h2>Practical advice</h2>
        <ul>
          <li>Keep packs focused on one domain such as meetings, approvals, finance, or legal output</li>
          <li>Prefer semantic macro names that still make sense outside the original project</li>
          <li>Use a local registry first before introducing remote distribution</li>
          <li>Inspect the generated project macro index after pack changes</li>
        </ul>
        <h2>Related guides</h2>
        <ul>
          <li><a href="04_macros_guide.html">Macros Guide</a></li>
          <li><a href="03_cli_workflows.html">CLI Reference</a></li>
          <li><a href="11_examples_cookbook.html">Examples Cookbook</a></li>
          <li><a href="13_macro_security_trust_model.html">Macro Security And Trust Model</a></li>
          <li><a href="15a_signed_governance_workflow.html">Signed Governance Workflow Tutorial</a></li>
        </ul>
      `,
    },
    {
      file: "09_viewer_guide.html",
      title: "Viewer Guide",
      group: "Guides",
      keywords: ["viewer", "protoviewer", "electron", "preview"],
      body: `
        <h1>Viewer Guide</h1>
        <p>ProtoML now has two viewer paths: the Electron-based <code>protoviewer</code> and the browser-based independent viewer in <code>web/index.html</code>.</p>
        <h2>Independent browser viewer</h2>
        <p>The browser viewer gives you an editor, local file upload, drag-and-drop loading, in-browser preview, and HTML export without requiring Electron.</p>
        <pre><code>npm run build:web
protoparser viewer
protoparser viewer app "./meeting.pml"
protowebviewer "./meeting.pml"</code></pre>
        <h2>Start the viewer</h2>
        <pre><code>protoviewer "test.pml"
protoviewer "test.pml" dark</code></pre>
        <p>This is the fastest way to inspect the rendered shape of a document while you are still editing the source.</p>
        <h2>When to use the viewer vs. CLI rendering</h2>
        <ul>
          <li>Use the browser viewer when you want an independent, cross-platform local workspace</li>
          <li>Use <code>protoviewer</code> for immediate local review</li>
          <li>Use <code>protoparser ... html|pdf|json|markdown|text</code> when you need export files or automation</li>
        </ul>
        <h2>Typical workflow</h2>
        <ol>
          <li>Edit the <code>.pml</code> file</li>
          <li>Open it in <code>protoviewer</code> for local review</li>
          <li>Use <code>protoparser</code> when you need distributable output</li>
        </ol>
        <h2>Limits</h2>
        <ul>
          <li>The viewer is a local GUI tool, not a publishing pipeline</li>
          <li>It complements the CLI, but does not replace export or analysis commands</li>
          <li>The browser viewer works from source text or uploaded files, not direct arbitrary filesystem path access</li>
        </ul>
        <h2>Related guides</h2>
        <ul>
          <li><a href="03_cli_workflows.html">CLI Reference</a></li>
          <li><a href="10_outputs_and_rendering.html">Outputs And Rendering</a></li>
          <li><a href="14_validation_and_analysis_workflows.html">Validation And Analysis Workflows</a></li>
        </ul>
      `,
    },
    {
      file: "10_outputs_and_rendering.html",
      title: "Outputs And Rendering",
      group: "Guides",
      keywords: ["outputs", "rendering", "html", "pdf", "json", "markdown", "text"],
      body: `
        <h1>Outputs And Rendering</h1>
        <p>ProtoML treats the source <code>.pml</code> file as structured input that can be rendered in several ways depending on audience and workflow.</p>
        <h2>Supported outputs</h2>
        <ul>
          <li>HTML</li>
          <li>PDF</li>
          <li>JSON</li>
          <li>Markdown</li>
          <li>Text</li>
        </ul>
        <p>These outputs are not just format conversions. They represent different ways of consuming the same structured ProtoML source.</p>
        <h2>Choosing the right output</h2>
        <ul>
          <li>HTML: best for rich presentation and macro-heavy output</li>
          <li>PDF: best for distribution and archiving</li>
          <li>JSON: best for tooling and post-processing</li>
          <li>Markdown: best for readable lightweight documentation workflows</li>
          <li>Text: best for minimal plain inspection</li>
        </ul>
        <h2>What each output emphasizes</h2>
        <ul>
          <li>HTML preserves the richest visual structure and is usually the best default rendering target</li>
          <li>PDF is for stable sharing when the final layout should not depend on the reader's environment</li>
          <li>JSON exposes the document structure so other tools can inspect or transform it</li>
          <li>Markdown and text emphasize readability over interactive or styled output</li>
        </ul>
        <h2>Typical commands</h2>
        <pre><code>protoparser "test.pml" html
protoparser "test.pml" pdf
protoparser "test.pml" json
protoparser "test.pml" markdown
protoparser "test.pml" text</code></pre>
        <h2>Practical output choices</h2>
        <ul>
          <li>During authoring: HTML or the viewer</li>
          <li>For handoff or sign-off: PDF</li>
          <li>For integrations or post-processing: JSON</li>
          <li>For lightweight text-first review: Markdown or text</li>
        </ul>
        <h2>Output path behavior</h2>
        <ul>
          <li>Without an explicit output name, ProtoML derives the output name from the input file</li>
          <li>With <code>-output=&lt;name&gt;</code>, you choose the base filename</li>
          <li>With a third positional argument, you can target a directory</li>
          <li>Files with content imports may auto-render into format-specific subfolders</li>
        </ul>
        <p>This automatic path behavior is especially useful once documents start importing HTML or ProtoML snippets, because it avoids cluttering the source directory.</p>
        <h2>Rendering and macros</h2>
        <p>Macros are most valuable in HTML output. Markdown and text prioritize readability and intentionally avoid carrying across complex styling or embedded behavior.</p>
        <h2>Themes and metadata visibility</h2>
        <p>HTML and PDF output can be influenced either by an explicit CLI theme or by document metadata such as <code>@theme:dark</code>. Metadata output itself can be hidden with <code>-hideMeta</code> or <code>@hide_meta:true</code> when the rendered document should stay visually focused on the body content.</p>
        <pre><code>protoparser "test.pml" html -theme=dark
protoparser "test.pml" pdf -hideMeta</code></pre>
        <h2>Output strategy for teams</h2>
        <ul>
          <li>Keep one authoritative <code>.pml</code> source</li>
          <li>Choose HTML for day-to-day review</li>
          <li>Generate PDF only when you need a stable distributable artifact</li>
          <li>Use JSON when ProtoML should feed downstream tooling or reporting</li>
        </ul>
        <h2>Related guides</h2>
        <ul>
          <li><a href="03_cli_workflows.html">CLI Reference</a></li>
          <li><a href="09_viewer_guide.html">Viewer Guide</a></li>
          <li><a href="04_macros_guide.html">Macros Guide</a></li>
          <li><a href="16_release_and_packaging.html">Release And Packaging</a></li>
        </ul>
      `,
    },
    {
      file: "11_examples_cookbook.html",
      title: "Examples Cookbook",
      group: "Guides",
      keywords: ["examples", "cookbook", "feature suite", "recipes"],
      body: `
        <h1>Examples Cookbook</h1>
        <p>ProtoML already ships runnable examples. This guide explains which workflow each one demonstrates.</p>
        <h2>Simple meeting protocol</h2>
        <p>Use a small document with <code>@participants</code>, <code>@subjects</code>, <code>@tasks</code>, and <code>@meeting</code> as the best starting point for weekly syncs and team notes.</p>
        <p>This is the minimal pattern that already shows ProtoML's value: structured data at the top, readable narrative below, and references between them.</p>
        <h2>Shared tags across files</h2>
        <pre><code>protoparser tags "examples/feature-suite/_workflow_tags.pml" statistics</code></pre>
        <p>Use this pattern when multiple meeting files should report against the same workflow vocabulary.</p>
        <h2>Content imports</h2>
        <p>The feature suite demonstrates both imported <code>.pml</code> and imported <code>.html</code>.</p>
        <p>Choose this when standard sections, appendices, or maintained snippets should live outside the main file.</p>
        <h2>Macros</h2>
        <p>Macros are the right example path when repeated presentation blocks start appearing in many documents. Explore bundled macros first, then move to registry-based packs only when sharing really matters.</p>
        <h2>Analysis and statistics</h2>
        <pre><code>protoparser analyze "examples/feature-suite/main_demo.pml" statistics
protoparser analyze "examples/feature-suite/main_demo.pml" graph
protoparser register "examples/feature-suite" statistics</code></pre>
        <p>These commands are what turn example documents into something you can inspect operationally, not just render visually.</p>
        <h2>Recommended example path</h2>
        <ol>
          <li>Start with <code>examples/feature-suite/main_demo.pml</code></li>
          <li>Render it to HTML</li>
          <li>Run tag analysis on <code>_workflow_tags.pml</code></li>
          <li>Run <code>analyze ... statistics</code></li>
          <li>Explore bundled macros with <code>--listMacros "{{macro_dir}}"</code></li>
          <li>Explore the external macro registry example in <code>examples/macro-registry-suite/</code></li>
        </ol>
        <h2>Related guides</h2>
        <ul>
          <li><a href="02_quick_start.html">Quick Start</a></li>
          <li><a href="08a_reuse_and_imports.html">Reuse And Imports Guide</a></li>
          <li><a href="04_macros_guide.html">Macros Guide</a></li>
          <li><a href="10_outputs_and_rendering.html">Outputs And Rendering</a></li>
          <li><a href="08_macro_registry_guide.html">Own Macro Registry Guide</a></li>
        </ul>
      `,
    },
    {
      file: "12_reference_map.html",
      title: "Reference Map",
      group: "Guides",
      keywords: ["reference map", "document model", "language surface", "overview"],
      body: `
        <h1>Reference Map</h1>
        <p>This is a map of the language surface, not a full syntax listing.</p>
        <h2>Metadata and document identity</h2>
        <p>Common document-level fields include <code>@author</code>, <code>@version</code>, <code>@status</code>, <code>@record_id</code>, <code>@confidentiality</code>, <code>@effective_date</code>, <code>@valid_until</code>, <code>@review_date</code>, and <code>@meta=key:value</code>.</p>
        <h2>Core structure blocks</h2>
        <p>Primary content blocks include <code>@participants</code>, <code>@subjects</code>, <code>@tasks</code>, <code>@notes</code>, and <code>@meeting</code>.</p>
        <h2>Reuse and modularity</h2>
        <p>ProtoML supports reuse through <code>@import</code>, <code>@macro</code>, <code>@macros_import</code>, <code>@tags_import</code>, and <code>@participants_import</code>.</p>
        <h2>References and navigation</h2>
        <p>Reference and navigation features include <code>@@e=id</code>, <code>@@ref=group:id[:field]</code>, <code>@@toc</code>, <code>@references</code>, and <code>@attachments</code>.</p>
        <h2>Governance and approval surface</h2>
        <p>Formal-document features include <code>@signatures</code>, <code>@approvals</code>, <code>@@signature=id</code>, and <code>@@approval=id</code>.</p>
        <h2>Analysis and tooling surface</h2>
        <p>CLI tooling covers rendering, validation, trust inspection, signing and verification, tag statistics, cross-file analysis, register reporting, bundling, macro inspection, scaffolding, and CHM help access.</p>
        <h2>Use this map with</h2>
        <ul>
          <li><a href="06_concepts.html">ProtoML Concepts</a></li>
          <li><a href="03_cli_workflows.html">CLI Reference</a></li>
          <li><a href="08a_reuse_and_imports.html">Reuse And Imports Guide</a></li>
          <li><a href="00_overview.html">Documentation Index</a></li>
        </ul>
      `,
    },
    {
      file: "13_macro_security_trust_model.html",
      title: "Macro Security And Trust Model",
      group: "Guides",
      keywords: ["macro security", "trust model", "xss", "untrusted macros", "macro safety"],
      body: `
        <h1>Macro Security And Trust Model</h1>
        <p>ProtoML macros are still the highest-trust extension surface in the system, but the trust workflow is now formalized so teams can inspect, sign, and classify them without building a heavy PKI layer into every document.</p>
        <h2>Three separate concepts</h2>
        <ul>
          <li><strong>Risk flags</strong>: what the macro actually does, such as JavaScript or external URLs</li>
          <li><strong>Signature status</strong>: whether the file matches a detached signature sidecar</li>
          <li><strong>Author trust</strong>: whether the signing author is marked trusted or untrusted in a registry</li>
        </ul>
        <p>ProtoML combines these into one <code>effective trust</code> value instead of mixing the concepts together.</p>
        <h2>Effective trust levels</h2>
        <ul>
          <li><code>trusted</code>: valid signature by a trusted author, or a bundled built-in macro that matches the shipped hash manifest, and no hard risk violations</li>
          <li><code>unknown</code>: no signature or no trusted registry author match, but also no hard risk violation</li>
          <li><code>untrusted</code>: invalid signature, untrusted author, JavaScript, external URLs, or imported untrusted content</li>
        </ul>
        <h2>Important simplification</h2>
        <p>Plain HTML by itself is not treated as an automatic trust failure anymore. Macros are HTML-oriented by design, so HTML is only tracked as a capability flag. The hard downgrade conditions are JavaScript and external URLs.</p>
        <p>Bundled built-in macros are identified by their real file location and a shipped hash manifest, not just by writing <code>{{macro_dir}}</code> in the document. That prevents newly dropped files in the built-in directory from becoming trusted automatically.</p>
        <h2>How to read common trust outcomes</h2>
        <ul>
          <li>Bundled built-in macro plus matching shipped hash and no hard risk flag: usually <code>trusted</code></li>
          <li>Bundled built-in macro with JavaScript or external URLs: still <code>untrusted</code></li>
          <li>Normal local custom macro without signatures: usually <code>unknown</code></li>
          <li>Signed custom macro with trusted registry author and no hard risk flag: <code>trusted</code></li>
          <li>Imported <code>.pml</code> file without trust information: usually <code>unknown</code></li>
        </ul>
        <h2>Detached signatures instead of inline syntax</h2>
        <p>Macros and <code>.pml</code> files are signed via detached sidecars such as <code>warning.pml.sig.json</code>. This keeps ProtoML syntax clean and lets the same signing flow work for macros and full documents.</p>
        <pre><code>protoparser sign macro "./macros/warn_box.pml" "./keys/alice-private.pem" "Alice" alice-main
protoparser verify macro "./macros/warn_box.pml" -trustRegistry="./my-registry"</code></pre>
        <h2>Detached sidecars outside a registry</h2>
        <p>The detached <code>*.sig.json</code> format also works without any registry at all.</p>
        <p>Author side:</p>
        <ul>
          <li>sign the macro or document</li>
          <li>distribute the original file and the generated <code>*.sig.json</code> together</li>
          <li>share the public key through a documented channel</li>
        </ul>
        <p>User side:</p>
        <ul>
          <li>keep the file and sidecar together</li>
          <li>run <code>protoparser verify ...</code> to verify integrity and authorship cryptographically</li>
          <li>use a trust registry only if the author should also resolve to <code>trusted</code> or <code>untrusted</code></li>
        </ul>
        <p>Without a registry, signed content can still be verified, but it typically remains <code>unknown</code> rather than <code>trusted</code>.</p>
        <h2>Registry author model</h2>
        <p>The registry is used as an author trust directory, not as a sandbox. It can declare authors and their public keys, plus package metadata for discovery.</p>
        <pre><code>{
  "version": 1,
  "authors": [
    {
      "name": "Alice",
      "trust": "trusted",
      "keys": [
        {
          "id": "alice-main",
          "public_key": "-----BEGIN PUBLIC KEY----- ..."
        }
      ]
    }
  ]
}</code></pre>
        <h2>What validation enforces</h2>
        <ul>
          <li><code>validate</code> reports untrusted macros and imported <code>.pml</code> files</li>
          <li><code>-trust=warn</code> warns but allows rendering</li>
          <li><code>-trust=strict</code> blocks rendering on untrusted macro or imported document trust failures</li>
          <li><code>unknown</code> content is visible in trust reports, but does not fail by default</li>
        </ul>
        <h2>What was intentionally left out</h2>
        <ul>
          <li>No popularity or download-count trust scoring</li>
          <li>No mandatory online lookup for normal local rendering</li>
          <li>No separate signature syntax inside ProtoML blocks</li>
        </ul>
        <p>Those ideas create substantial overhead and unclear semantics. Detached signatures plus author registries give most of the practical value with much less maintenance cost.</p>
        <h2>Recommended team policy</h2>
        <ol>
          <li>Keep signed production macros in version-controlled repositories</li>
          <li>Publish trusted authors in one internal registry</li>
          <li>Run <code>protoparser trust</code> and <code>validate -trust=strict</code> in CI for sensitive documents</li>
          <li>Review any macro that contains JavaScript or external URLs manually</li>
          <li>Prefer bundled built-in macros for common safe defaults before introducing new custom packs</li>
        </ol>
        <h2>Related guides</h2>
        <ul>
          <li><a href="04_macros_guide.html">Macros Guide</a></li>
          <li><a href="08_macro_registry_guide.html">Own Macro Registry Guide</a></li>
          <li><a href="15_governance_documents.html">Governance Documents</a></li>
        </ul>
      `,
    },
    {
      file: "14_validation_and_analysis_workflows.html",
      title: "Validation And Analysis Workflows",
      group: "Guides",
      keywords: ["validation", "analysis", "register", "graph", "quality workflow"],
      body: `
        <h1>Validation And Analysis Workflows</h1>
        <p>ProtoML includes a second layer beyond rendering: commands that help you inspect document quality, structure, references, and governance state.</p>
        <h2>Document validation</h2>
        <pre><code>protoparser validate "meeting.pml"
protoparser -v validate "meeting.pml"
protoparser validate "meeting.pml" -trust=strict -trustRegistry="./authors-registry" -trustRegistry="./macro-registry"</code></pre>
        <p>Use validation when you want to catch missing imports, missing macros, duplicate IDs, unresolved references, or untrusted macro usage before focusing on visual output. The <code>-trustRegistry=...</code> flag is repeatable, so validation can merge multiple trust sources when authors and packages are split across different registries.</p>
        <h2>Trust inspection</h2>
        <pre><code>protoparser trust "meeting.pml"
protoparser -vv trust "meeting.pml" -trustRegistry="./authors-registry" -trustRegistry="./macro-registry"</code></pre>
        <p>This is the best command when you want a dedicated trust report for the document, its used macros, and imported <code>.pml</code> files.</p>
        <h2>Signed governance documents</h2>
        <pre><code>protoparser sign pml "./governance/release-approval.pml" "./keys/alice-private.pem" "Alice" alice-main
protoparser verify pml "./governance/release-approval.pml" -trustRegistry="./authors-registry"</code></pre>
        <p>Normal ProtoML documents can be signed too. That is useful for controlled governance files such as release approvals, operational procedures, policy texts, and reviewable internal records.</p>
        <h2>Shared tag validation and statistics</h2>
        <pre><code>protoparser tags "_tags.pml" validate
protoparser tags "_tags.pml" statistics
protoparser tags "_tags.pml" html</code></pre>
        <p>This is useful when tags are a cross-document vocabulary and you want to understand how tasks are distributed across files.</p>
        <h2>General document analysis</h2>
        <pre><code>protoparser analyze "meeting.pml" statistics
protoparser analyze "meeting.pml" html
protoparser analyze "meeting.pml" graph</code></pre>
        <p>Analysis is the best command when you need to understand imported content, merged structures, macro usage, or dependency shape.</p>
        <h2>Graph output</h2>
        <pre><code>protoparser analyze "meeting.pml" graph -graphView=full -graphDirection=LR
protoparser analyze "meeting.pml" graph -output=meeting-graph</code></pre>
        <p>Graph output is especially helpful once documents start importing other ProtoML files or building shared tag trees.</p>
        <h2>Register workflow for directories</h2>
        <pre><code>protoparser register "meetings" statistics
protoparser register "meetings" html
protoparser register "meetings" pdf</code></pre>
        <p>Use register reports when you care about document inventory, missing metadata, overdue reviews, or open work across a folder.</p>
        <p>This command does not manage macro registries or macro packs. For external macro catalogs and installed macro packages, use <code>macro_install</code> and the macro registry workflow instead.</p>
        <h2>Macro usage inspection</h2>
        <pre><code>protoparser macros "meeting.pml"</code></pre>
        <p>This is useful for understanding which registered macros are actually used, especially before cleanup or pack refactors.</p>
        <h2>Recommended quality workflow</h2>
        <ol>
          <li>Render the file for visual inspection</li>
          <li>Run <code>validate</code> to catch structural issues</li>
          <li>Run <code>analyze</code> when imports or cross-file structure matter</li>
          <li>Run <code>tags ... statistics</code> when the shared task vocabulary matters</li>
          <li>Run <code>register</code> across directories for governance-style collections</li>
        </ol>
        <h2>When each workflow matters most</h2>
        <ul>
          <li>Validation: before publishing or sharing</li>
          <li>Analysis: when debugging structure or dependencies</li>
          <li>Tag statistics: when workflow labels are part of reporting</li>
          <li>Register reports: when the document set is managed like an inventory</li>
        </ul>
        <h2>Related guides</h2>
        <ul>
          <li><a href="03_cli_workflows.html">CLI Reference</a></li>
          <li><a href="15_governance_documents.html">Governance Documents</a></li>
          <li><a href="16_release_and_packaging.html">Release And Packaging</a></li>
        </ul>
      `,
    },
    {
      file: "15_governance_documents.html",
      title: "Governance Documents",
      group: "Guides",
      keywords: ["governance", "approvals", "signatures", "record id", "review date"],
      body: `
        <h1>Governance Documents</h1>
        <p>ProtoML is not limited to lightweight notes. It also supports more controlled documents with metadata, approvals, references, and lifecycle tracking.</p>
        <h2>Core governance metadata</h2>
        <ul>
          <li><code>@author</code></li>
          <li><code>@version</code></li>
          <li><code>@status</code></li>
          <li><code>@record_id</code></li>
          <li><code>@confidentiality</code></li>
          <li><code>@effective_date</code></li>
          <li><code>@valid_until</code></li>
          <li><code>@review_date</code></li>
        </ul>
        <h2>Approval and signature structures</h2>
        <pre><code>@signatures
=lead:Jane Doe,Project Lead,18.04.2026,Signed digitally

@approvals
=security:Security Review,approved,Jane Doe,18.04.2026,Reviewed and accepted</code></pre>
        <p>These let you separate reusable governance data from the final meeting or document narrative.</p>
        <h2>Embedding governance elements in the reader-facing document</h2>
        <pre><code>@@signature=lead
@@approval=security
@@ref=meta:record_id</code></pre>
        <h2>Detached signatures for governance files</h2>
        <pre><code>protoparser sign pml "./governance/release-approval.pml" "./keys/alice-private.pem" "Alice" alice-main
protoparser verify pml "./governance/release-approval.pml" -trustRegistry="./authors-registry"</code></pre>
        <p>Detached file signatures complement the in-document governance blocks. They help prove the integrity and authorship of the whole <code>.pml</code> file without replacing semantic fields such as <code>@signatures</code>, <code>@approvals</code>, or review metadata.</p>
        <h2>Supporting sections</h2>
        <ul>
          <li><code>@references</code> for source material or governing documents</li>
          <li><code>@attachments</code> for linked artifacts</li>
          <li><code>@tasks</code> for open remediation or follow-up actions</li>
        </ul>
        <h2>Why governance metadata matters</h2>
        <p>Once documents are reviewed, approved, versioned, or periodically revisited, their lifecycle becomes just as important as their prose. ProtoML's governance fields help keep that lifecycle explicit and machine-readable.</p>
        <h2>Recommended directory workflow</h2>
        <ol>
          <li>Standardize required metadata for the document class</li>
          <li>Keep signatures and approvals in dedicated blocks</li>
          <li>Use stable <code>@record_id</code> values</li>
          <li>Run <code>protoparser register "&lt;dir&gt;" statistics</code> across the collection</li>
          <li>Review overdue or incomplete documents using register output</li>
        </ol>
        <h2>Good use cases</h2>
        <ul>
          <li>Release approvals</li>
          <li>Operational procedures</li>
          <li>Compliance and audit records</li>
          <li>Policy documents with periodic review requirements</li>
          <li>Controlled onboarding or access review documents</li>
        </ul>
        <h2>Related guides</h2>
        <ul>
          <li><a href="07_authoring_guide.html">Authoring Guide</a></li>
          <li><a href="14_validation_and_analysis_workflows.html">Validation And Analysis Workflows</a></li>
          <li><a href="13_macro_security_trust_model.html">Macro Security And Trust Model</a></li>
        </ul>
      `,
    },
    {
      file: "15a_signed_governance_workflow.html",
      title: "Workflow 1: Board Approval Context",
      group: "Workflow Guides",
      keywords: ["workflow", "tutorial", "governance signing", "board of directors", "author-only registry", "practical example"],
      body: `
        <h1>Workflow 1: Board Approval Context</h1>
        <p>This workflow series follows one continuous story. Acme Inc. is preparing a release that requires formal Board of Directors approval. The company wants the final governance document to be both readable as ProtoML and verifiable as a signed file.</p>
        <h2>The story</h2>
        <p>The board secretariat authors the document. The board chair signs it. Employees in Release Operations and Compliance later verify it before using it. The trust source is an author-only registry reviewed internally by the company.</p>
        <h2>Step 1: Write the governance document</h2>
        <pre><code>@protocol "Board Release Approval - Q2"

@author:Board Secretariat
@version:1.0.0
@status:approved
@record_id:BOD-2026-0419
@confidentiality:internal
@effective_date:19.04.2026
@review_date:19.10.2026

@signatures
=chair:Jane Director,Board Chair,19.04.2026,Signed after board vote

@approvals
=release:Release Approval,approved,Jane Director,19.04.2026,Approved for distribution

@meeting "Resolution"
# Release approval
The Board of Directors approves Release 2026.04 for distribution.

@@signature=chair
@@approval=release
@@ref=meta:record_id</code></pre>
        <p>The ProtoML content still carries the normal governance meaning for readers. The detached signature added later will protect the file as an artifact.</p>
        <h2>Why this document shape matters</h2>
        <ul>
          <li>the governance fields support register-style portfolio reporting</li>
          <li>the embedded approvals and signatures remain readable in rendered output</li>
          <li>the document is ready for detached file signing in the next workflow step</li>
        </ul>
        <h2>Continue with</h2>
        <p>Next, the board secretariat publishes the trusted signer list in <a href="15b_author_registry_workflow.html">Workflow 2: Build An Author-Only Registry</a>.</p>
      `,
    },
    {
      file: "15b_author_registry_workflow.html",
      title: "Workflow 2: Build An Author-Only Registry",
      group: "Workflow Guides",
      keywords: ["workflow", "author registry", "trusted authors", "public keys", "board of directors"],
      body: `
        <h1>Workflow 2: Build An Author-Only Registry</h1>
        <p>Acme Inc. does not need a full macro package registry for this governance story. It only needs one reviewed trust source that says which board members are trusted signers and which public keys belong to them.</p>
        <h2>The registry</h2>
        <p>The board secretariat maintains one internal registry whose only real job is trust lookup for approved signers.</p>
        <h2>Bootstrap the key pair first</h2>
        <p>Before the registry can publish trusted signers, each signer needs a private key for signing and a public key for verification.</p>
        <pre><code>openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "./keys/jane-director-private.pem"
openssl rsa -pubout -in "./keys/jane-director-private.pem" -out "./keys/jane-director-public.pem"</code></pre>
        <p>The private key stays with Jane Director. The exported public key is what the board secretariat copies into the registry JSON.</p>
        <pre><code>{
  "version": 1,
  "name": "acme-board-authors",
  "authors": [
    {
      "name": "Jane Director",
      "trust": "trusted",
      "keys": [
        {
          "id": "board-chair-2026",
          "public_key": "-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"
        }
      ]
    },
    {
      "name": "Martin Director",
      "trust": "trusted",
      "keys": [
        {
          "id": "board-member-2026",
          "public_key": "-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"
        }
      ]
    }
  ],
  "packages": []
}</code></pre>
        <p>This is still a valid ProtoML registry. It is simply author-focused rather than package-focused.</p>
        <h2>Why this works</h2>
        <ul>
          <li>trust-oriented commands only need the <code>authors</code> list for signer lookup</li>
          <li>an empty <code>packages</code> list is acceptable when this registry is not used for macro delivery</li>
          <li>the registry can be published on an internal file share or internal HTTPS endpoint</li>
        </ul>
        <h2>Company hosting choices</h2>
        <p>Acme Inc. can publish this registry in two equally simple ways:</p>
        <ul>
          <li>as an internal URL such as <code>https://intra.acme.local/protoml/protoml.registry.json</code></li>
          <li>as a shared path such as <code>Z:\\board-registry</code> or <code>/mnt/board-registry</code></li>
        </ul>
        <p>In both cases the content is still just static JSON. The difference is only how employees reach it.</p>
        <h2>Continue with</h2>
        <p>Once the trusted author registry exists, the board chair signs the final ProtoML file in <a href="15c_sign_governance_workflow.html">Workflow 3: Sign And Publish The Governance Document</a>.</p>
      `,
    },
    {
      file: "15c_sign_governance_workflow.html",
      title: "Workflow 3: Sign And Publish The Governance Document",
      group: "Workflow Guides",
      keywords: ["workflow", "sign pml", "governance document", "publish signed file", "board approval"],
      body: `
        <h1>Workflow 3: Sign And Publish The Governance Document</h1>
        <p>The board chair now signs the final approval file so employees can later verify both integrity and authorship.</p>
        <h2>If the signer key does not exist yet</h2>
        <pre><code>openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "./keys/jane-director-private.pem"
openssl rsa -pubout -in "./keys/jane-director-private.pem" -out "./keys/jane-director-public.pem"</code></pre>
        <p>The public key should already be published in the board author registry before employees start validating released files.</p>
        <h2>Sign the file</h2>
        <pre><code>protoparser sign pml "./governance/board-release-approval.pml" "./keys/jane-director-private.pem" "Jane Director" board-chair-2026</code></pre>
        <p>This creates a detached <code>board-release-approval.pml.sig.json</code> file next to the document.</p>
        <h2>What gets distributed internally</h2>
        <ul>
          <li>the governance document file</li>
          <li>its matching <code>*.sig.json</code> sidecar</li>
          <li>the author-only registry file or its internal URL</li>
        </ul>
        <p>If the document does not depend on external macro packs, employees do not need any macro package registry to validate this story.</p>
        <h2>Operational note</h2>
        <p>The detached signature does not replace <code>@signatures</code> or <code>@approvals</code> inside the ProtoML content. It complements them by protecting the file as a file.</p>
        <h2>Continue with</h2>
        <p>Now the document reaches Release Operations. Lea validates it in <a href="15d_validate_governance_workflow.html">Workflow 4: Employee Validation And Trust Decision</a>.</p>
      `,
    },
    {
      file: "15d_validate_governance_workflow.html",
      title: "Workflow 4: Employee Validation And Trust Decision",
      group: "Workflow Guides",
      keywords: ["workflow", "verify pml", "trust pml", "validate pml", "employee validation", "compliance"],
      body: `
        <h1>Workflow 4: Employee Validation And Trust Decision</h1>
        <p>Lea from Release Operations receives the document and wants to know whether it is intact and actually signed by a trusted board member.</p>
        <h2>Verify the file cryptographically</h2>
        <p>Her first step is a direct cryptographic verification against the board author registry.</p>
        <pre><code>protoparser verify pml "./governance/board-release-approval.pml"</code></pre>
        <p>If the nearest project <code>protoml.macros.json</code> already lists the board registry, this checks the detached signature cryptographically and also looks up the signer without extra flags.</p>
        <h2>Inspect the full trust result</h2>
        <pre><code>protoparser trust "./governance/board-release-approval.pml"</code></pre>
        <p>This is the better command when Lea wants the full trust picture, including document-level trust classification and any imported ProtoML dependencies. Extra <code>-trustRegistry=...</code> flags are only needed when the project config does not already list every relevant source.</p>
        <h2>Run strict validation before reuse</h2>
        <pre><code>protoparser validate "./governance/board-release-approval.pml" -trust=strict</code></pre>
        <p>This catches structural issues too, not just signature issues. The nearest project <code>protoml.macros.json</code> is used automatically when present.</p>
        <h2>What if registries are split?</h2>
        <p>Some companies separate responsibilities:</p>
        <ul>
          <li>the board secretariat owns the author-only registry</li>
          <li>the platform team owns a macro/package registry</li>
        </ul>
        <p>Then the employee can combine them:</p>
        <pre><code>protoparser validate "./governance/board-release-approval.pml" -trust=strict -trustRegistry="./board-authors-registry" -trustRegistry="./macro-registry"</code></pre>
        <p>ProtoML merges the provided trust sources for author lookup. Registries that have no relevant <code>authors</code> entries simply add nothing to that part of the result.</p>
        <h2>How to read the outcome</h2>
        <ul>
          <li><code>trusted</code>: the file matches its signature and the signer is trusted in the registry</li>
          <li><code>unknown</code>: the signature may be valid, but the signer is not matched to a trusted registry author</li>
          <li><code>untrusted</code>: the signature is invalid, the signer is marked untrusted, or dependent trust checks fail</li>
        </ul>
        <h2>Why this workflow works well</h2>
        <ul>
          <li>the board can stay focused on people and approvals instead of package delivery</li>
          <li>employees get one repeatable CLI workflow for validation</li>
          <li>directory-level register reports still complement the file-level trust story</li>
          <li>the same signing model also works for other governance documents such as policies, onboarding approvals, or audit records</li>
        </ul>
        <h2>Related guides</h2>
        <ul>
          <li><a href="15_governance_documents.html">Governance Documents</a></li>
          <li><a href="13_macro_security_trust_model.html">Macro Security And Trust Model</a></li>
          <li><a href="14_validation_and_analysis_workflows.html">Validation And Analysis Workflows</a></li>
          <li><a href="08_macro_registry_guide.html">Own Macro Registry Guide</a></li>
        </ul>
        <h2>Continue with</h2>
        <p>Once Lea trusts the single file, the next question is usually broader: which governance documents across the portfolio are missing metadata, overdue, or still open? Continue with <a href="15e_governance_portfolio_workflow.html">Workflow 5: Review A Governance Portfolio</a>.</p>
      `,
    },
    {
      file: "15e_governance_portfolio_workflow.html",
      title: "Workflow 5: Review A Governance Portfolio",
      group: "Workflow Guides",
      keywords: ["workflow", "register", "governance portfolio", "document inventory", "review dates", "record_id"],
      body: `
        <h1>Workflow 5: Review A Governance Portfolio</h1>
        <p>After validating one signed board approval file, Lea now has a broader operational question: is the surrounding governance portfolio in good shape, or are there other documents that are overdue, incomplete, or missing metadata?</p>
        <h2>The scenario shift</h2>
        <p>This step is no longer mainly about one signer. It is about the health of a whole governance collection such as release approvals, procedures, onboarding records, and policy documents.</p>
        <h2>Run a register report across the directory</h2>
        <pre><code>protoparser register "./governance" statistics
protoparser register "./governance" html</code></pre>
        <p>This gives Lea a governance-oriented portfolio view rather than a single-file trust result.</p>
        <h2>What Lea is looking for</h2>
        <ul>
          <li>documents missing <code>@record_id</code>, <code>@author</code>, <code>@version</code>, or <code>@status</code></li>
          <li>documents whose <code>@review_date</code> is due or overdue</li>
          <li>documents whose <code>@valid_until</code> has expired</li>
          <li>documents that still contain open tasks or unresolved follow-up work</li>
        </ul>
        <h2>Why this matters after trust validation</h2>
        <p>A file can be signed correctly and still be operationally weak if governance metadata is stale or missing. Trust answers "can I trust this artifact?", while register reporting helps answer "is the governance set being managed properly?"</p>
        <h2>Typical follow-up</h2>
        <p>If the portfolio report looks healthy, Release Operations can proceed confidently. If not, Lea may need a more practical release-facing workflow that combines governance, validation, and packaging checks for one concrete release package.</p>
        <h2>Continue with</h2>
        <p>That next step is covered in <a href="15f_release_ops_workflow.html">Workflow 6: Release Operations Without A Board Story</a>.</p>
        <h2>Related guides</h2>
        <ul>
          <li><a href="15_governance_documents.html">Governance Documents</a></li>
          <li><a href="14_validation_and_analysis_workflows.html">Validation And Analysis Workflows</a></li>
          <li><a href="16_release_and_packaging.html">Release And Packaging</a></li>
          <li><a href="03_cli_workflows.html">CLI Reference</a></li>
        </ul>
      `,
    },
    /*{
      file: "15f_release_ops_workflow.html",
      title: "Workflow 6: Release Operations Without A Board Story",
      group: "Workflow Guides",
      keywords: ["workflow", "release operations", "validate", "release checks", "practical release", "ops"],
      body: `
        <h1>Workflow 6: Release Operations Without A Board Story</h1>
        <p>Not every workflow revolves around Board approval. Sometimes Release Operations just needs a practical, low-drama process for checking a release package, its supporting ProtoML records, and the generated artifacts before publication.</p>
        <h2>The scenario</h2>
        <p>Lea is now working on the operational release checklist itself. This file may not need a board signature at all. It still needs to be structurally valid, internally reviewable, and consistent with the generated release artifacts.</p>
        <h2>Validate the release record</h2>
        <pre><code>protoparser validate "./governance/release-checklist.pml" -trust=warn</code></pre>
        <p>Here the goal is not necessarily strict signature enforcement. The goal is to catch structural problems before publishing.</p>
        <h2>Inspect the release-related document set</h2>
        <pre><code>protoparser register "./governance" statistics</code></pre>
        <p>This gives Lea confidence that the current release record sits inside a healthy governance set.</p>
        <h2>Check the release artifacts themselves</h2>
        <pre><code>npm run build:web
npm run build:chm
npm run build:exe</code></pre>
        <p>And before publishing:</p>
        <pre><code>npm run bump</code></pre>
        <h2>Why this workflow is different</h2>
        <ul>
          <li>it is about release readiness, not primarily signer identity</li>
          <li>trust checks may still matter, but they are only one part of the release checklist</li>
          <li>artifact consistency, CHM behavior, and checksum correctness are equally important</li>
        </ul>
        <h2>When the registry story comes back</h2>
        <p>If the release record uses external macros, or if trust lookups come from more than one place, Lea may need to combine an internal author registry with a separate macro registry.</p>
        <h2>Continue with</h2>
        <p>That combined case is covered in <a href="15g_split_registry_workflow.html">Workflow 7: Internal Author Trust Plus External Macro Registry</a>.</p>
        <h2>Related guides</h2>
        <ul>
          <li><a href="16_release_and_packaging.html">Release And Packaging</a></li>
          <li><a href="14_validation_and_analysis_workflows.html">Validation And Analysis Workflows</a></li>
          <li><a href="08_macro_registry_guide.html">Own Macro Registry Guide</a></li>
          <li><a href="13_macro_security_trust_model.html">Macro Security And Trust Model</a></li>
        </ul>
      `,
    },*/
    {
      file: "15g_split_registry_workflow.html",
      title: "Workflow 7: Internal Author Trust Plus External Macro Registry",
      group: "Workflow Guides",
      keywords: ["workflow", "split registry", "author registry", "macro registry", "internal trust", "external packages"],
      body: `
        <h1>Workflow 7: Internal Author Trust Plus External Macro Registry</h1>
        <p>This workflow handles the realistic mixed case: the company trusts its own internal signer registry, but macro delivery comes from a different registry maintained by another team or even an external source.</p>
        <h2>The scenario</h2>
        <p>Acme Inc. keeps trusted employees and board members in an internal author-only registry. At the same time, the document uses a reviewed macro pack from a separate macro registry. Lea needs both worlds in one validation flow.</p>
        <h2>Two different sources, two different jobs</h2>
        <ul>
          <li>the internal registry answers: which authors are trusted signers?</li>
          <li>the macro registry answers: where do the reusable macro packages come from?</li>
        </ul>
        <h2>One-company alternative</h2>
        <p>If one company owns both concerns, it can also publish one mixed registry with both <code>authors</code> and <code>packages</code>. That mixed company registry can still live on a simple internal web server or on a shared network path.</p>
        <pre><code>protoparser macro_install add_registry "https://intra.acme.local/protoml/protoml.registry.json"
protoparser macro_install add_registry "Z:\\protoml-registry"</code></pre>
        <p>The split-registry model is useful when security ownership and package ownership are different. A mixed company registry is useful when one team reviews both.</p>
        <h2>Validate with both sources</h2>
        <pre><code>protoparser validate "./governance/release-checklist.pml" -trust=strict</code></pre>
        <p>If both registry sources are already listed in the nearest project <code>protoml.macros.json</code>, ProtoML merges them automatically for author lookup. Registries without matching <code>authors</code> entries simply do not contribute to that part of the result.</p>
        <h2>Inspect trust explicitly</h2>
        <pre><code>protoparser trust "./governance/release-checklist.pml"</code></pre>
        <p>This gives Lea the clearest report when something resolves to <code>unknown</code> or <code>untrusted</code>.</p>
        <h2>Why this workflow matters</h2>
        <ul>
          <li>security ownership and package ownership can stay separate</li>
          <li>teams do not have to force every concern into one giant registry</li>
          <li>the validation command stays simple because project registries can be auto-discovered, while ad hoc flags still work for temporary sources</li>
        </ul>
        <h2>Decision heuristic</h2>
        <ul>
          <li>use one registry if one team owns both signer trust and macro delivery</li>
          <li>split them when organizational responsibility is clearly different</li>
          <li>prefer <code>trust</code> for investigation, <code>validate</code> for enforcement, and <code>verify</code> for direct signature checks</li>
        </ul>
        <h2>Related guides</h2>
        <ul>
          <li><a href="08_macro_registry_guide.html">Own Macro Registry Guide</a></li>
          <li><a href="13_macro_security_trust_model.html">Macro Security And Trust Model</a></li>
          <li><a href="14_validation_and_analysis_workflows.html">Validation And Analysis Workflows</a></li>
          <li><a href="15f_release_ops_workflow.html">Workflow 6: Release Operations Without A Board Story</a></li>
        </ul>
      `,
    },
    {
      file: "16_release_and_packaging.html",
      title: "Release And Packaging",
      group: "Guides",
      keywords: ["release", "packaging", "dist", "checksums", "build artifacts"],
      body: `
        <h1>Release And Packaging</h1>
        <p>ProtoML releases are more than a single npm publish. The repository already supports collecting CLI binaries, CHM help, and checksums into a release-style <code>dist/</code> directory.</p>
        <h2>What a release set contains</h2>
        <ul>
          <li>Standalone Windows and Linux executables</li>
          <li>The compiled <code>protoml-help.chm</code> file</li>
          <li>A <code>SHA256SUMS.txt</code> file for integrity checks</li>
        </ul>
        <h2>Build the web and CHM artifacts when needed</h2>
        <pre><code>npm run build:web
npm run build:chm:project
npm run build:chm</code></pre>
        <p>The web build produces the browser-side parser bundle used by the independent viewer in <code>web/index.html</code>.</p>
        <h2>Executable packaging</h2>
        <pre><code>npm run build:exe</code></pre>
        <p>This produces standalone binaries from the Node-based CLI using the package configuration in <code>package.json</code>.</p>
        <h2>Release preparation workflow</h2>
        <pre><code>npm run bump</code></pre>
        <p>The bump workflow updates the build number, rebuilds the executables, compiles the CHM, copies the CHM into <code>dist/</code>, and regenerates the checksum file.</p>
        <h2>Checksums</h2>
        <p><code>SHA256SUMS.txt</code> contains the generated release checksums and now also records the UTC timestamp when the checksum file was generated.</p>
        <h2>What to verify before publishing</h2>
        <ul>
          <li>The CLI binaries actually start on the target platforms</li>
          <li>The CHM help opens on Windows</li>
          <li>The web bundle and independent viewer still render correctly</li>
          <li>The checksum file matches the final release artifacts</li>
          <li>The version and build number are consistent across outputs</li>
        </ul>
        <h2>Why this guide matters</h2>
        <p>As ProtoML grows, release quality becomes a workflow of its own. Packaging, checksums, offline help, and platform-specific binaries all need to stay in sync.</p>
        <h2>Related guides</h2>
        <ul>
          <li><a href="05_windows_help_and_dev.html">Windows Help And Development</a></li>
          <li><a href="14_validation_and_analysis_workflows.html">Validation And Analysis Workflows</a></li>
          <li><a href="03_cli_workflows.html">CLI Reference</a></li>
        </ul>
      `,
    },
  ];
}

function buildReferencePages() {
  const docFiles = fs.readdirSync(docsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".pml"))
    .map((entry) => entry.name)
    .sort();

  return docFiles.map((fileName) => {
    const fullPath = path.join(docsDir, fileName);
    const raw = fs.readFileSync(fullPath, "utf8");
    const topicName = (raw.match(/^=name:(.+)$/m)?.[1] || path.basename(fileName, ".pml")).trim();
    const docs = extractSection(raw, "docs");
    const examples = extractSection(raw, "examples");
    const title = titleCaseFromName(topicName);
    const bodyParts = [
      `<h1>${escapeHtml(title)}</h1>`,
      `<div class="topic-meta">Topic: <code>${escapeHtml(topicName)}</code></div>`,
    ];

    if (docs) {
      bodyParts.push("<h2>Explanation</h2>");
      bodyParts.push(renderMarkdownish(docs, { macroCache: bundledMacroCache }));
    }

    if (examples) {
      bodyParts.push("<h2>Examples</h2>");
      bodyParts.push(`<pre><code>${escapeHtml(examples)}</code></pre>`);
    }

    return {
      file: `ref_${slugify(topicName)}.html`,
      title,
      group: groupForTopic(topicName),
      keywords: [
        topicName,
        fileName,
        slugify(topicName).replace(/_/g, " "),
      ],
      body: bodyParts.join("\n"),
    };
  });
}

function groupForTopic(topicName) {
  const name = String(topicName || "").toLowerCase();
  const syntaxTopics = new Set([
    "participants", "subjects", "tasks", "notes", "meeting", "protocol", "title",
    "meta", "date", "author", "version", "status", "record_id", "confidentiality",
    "effective_date", "valid_until", "review_date", "ref", "toc", "signature",
    "signatures", "approval", "approvals", "references", "attachments",
    "tags", "tags_import", "tag_sources", "participants_import", "import", "output",
  ]);
  const macroTopics = new Set([
    "macro", "macros", "macro_dir", "new_macro", "macro_install", "macro_registry",
  ]);
  const cliTopics = new Set([
    "analyze", "graph", "validate", "register", "bundle", "scaffold", "init",
    "markdown", "text", "protoml-parser", "protoml-help", "protoml-listhelp",
    "protoml-listmacros", "protoml-listmacrosjson", "protoml-macrohelp",
    "protoml-chm", "protoml-webviewer", "trust", "sign", "verify",
    "protoml-viewer",
  ]);

  if (syntaxTopics.has(name)) return "Reference: Syntax And Documents";
  if (macroTopics.has(name)) return "Reference: Macros And Registries";
  if (cliTopics.has(name)) return "Reference: CLI And Tooling";
  return "Reference: Miscellaneous";
}

const guidePages = buildGuidePages();
const bundledMacroCache = loadBundledMacroCache();
const referencePages = buildReferencePages();
const pages = [...guidePages, ...referencePages];

const tocGroups = [];
for (const page of pages) {
  let group = tocGroups.find((entry) => entry.name === page.group);
  if (!group) {
    group = { name: page.group, pages: [] };
    tocGroups.push(group);
  }
  group.pages.push(page);
}

const indexEntries = [
  { keyword: "ProtoML", local: "toc.html" },
  ...pages.flatMap((page) => [
    { keyword: page.title, local: `html_docs/${page.file}` },
    ...page.keywords.map((keyword) => ({ keyword, local: `html_docs/${page.file}` })),
  ]),
];

function buildStyles() {
  return `body {
  font-family: "Segoe UI", Tahoma, sans-serif;
  background: #ffffff;
  color: #222222;
  margin: 0;
}

.topnav {
  background: #0f4c81;
  color: #ffffff;
  padding: 0.7rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topnav a {
  color: #ffffff;
  text-decoration: none;
  font-weight: 600;
}

.version {
  font-size: 0.92rem;
  opacity: 0.95;
}

.page {
  padding: 1.4rem 1.8rem 2rem;
  max-width: 980px;
}

h1 {
  font-size: 1.95rem;
  border-bottom: 2px solid #d9d9d9;
  padding-bottom: 0.4rem;
}

h2 {
  font-size: 1.25rem;
  margin-top: 1.6rem;
  color: #0f4c81;
}

p, li {
  line-height: 1.55;
}

pre {
  background: #f3f6f9;
  border: 1px solid #dbe3ea;
  border-radius: 6px;
  padding: 0.9rem;
  overflow: auto;
}

code {
  font-family: Consolas, "Courier New", monospace;
}

.topic-meta {
  color: #4f5b66;
  margin-bottom: 1rem;
}

.toc-group {
  margin-bottom: 1.3rem;
}

.toc-group h2 {
  margin-bottom: 0.5rem;
}

ul li, ol li {
  margin-bottom: 0.35rem;
}
`;
}

function buildTocHtml(linkTarget = null) {
  const groupsHtml = tocGroups.map((group) => {
    const items = group.pages
      .map((page) => {
        const targetAttr = linkTarget ? ` target="${escapeAttribute(linkTarget)}"` : "";
        return `<li><a href="html_docs/${page.file}"${targetAttr}>${escapeHtml(page.title)}</a></li>`;
      })
      .join("\n");
    return `<section class="toc-group">
  <h2>${escapeHtml(group.name)}</h2>
  <ul>
    ${items}
  </ul>
</section>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>ProtoML Help Contents - ProtoML ${escapeHtml(protoVersion)}</title>
  <style>
    body { font-family: "Segoe UI", Tahoma, sans-serif; padding: 1.2rem 1.4rem; line-height: 1.5; }
    h1 { font-size: 1.7rem; }
    h2 { color: #0f4c81; margin-top: 1.3rem; }
    .version { color: #555; margin-bottom: 1rem; font-size: 0.95rem; }
    ul li { margin-bottom: 0.45rem; }
    a { color: #0f4c81; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>ProtoML Help Contents</h1>
  <div class="version">Version: ${escapeHtml(protoVersion)}</div>
  ${groupsHtml}
</body>
</html>
`;
}

function buildHelpViewerHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ProtoML Help Viewer - ProtoML ${escapeHtml(protoVersion)}</title>
  <style>
    :root {
      --bg: #eef3f9;
      --panel: #ffffff;
      --panel-2: #f7fafc;
      --line: #d7e0ea;
      --ink: #1f2933;
      --muted: #617082;
      --accent: #0f4c81;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, sans-serif;
      background: linear-gradient(180deg, #f7fbff 0%, #e9eff7 100%);
      color: var(--ink);
    }
    .shell {
      height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
    }
    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 14px 18px;
      background: #103b63;
      color: #fff;
    }
    .topbar a {
      color: #fff;
      text-decoration: none;
    }
    .workspace {
      display: grid;
      grid-template-columns: minmax(280px, 360px) 1fr;
      gap: 14px;
      padding: 14px;
      min-height: 0;
    }
    .panel {
      min-height: 0;
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      background: var(--panel);
      box-shadow: 0 18px 36px rgba(16, 34, 58, 0.08);
    }
    .panel-head {
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      background: var(--panel-2);
      color: var(--muted);
      font-size: 0.92rem;
    }
    iframe {
      width: 100%;
      height: calc(100% - 45px);
      border: 0;
      background: #fff;
    }
    @media (max-width: 960px) {
      .workspace {
        grid-template-columns: 1fr;
        grid-template-rows: minmax(220px, 36vh) 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <div>
        <strong>ProtoML Help Viewer</strong>
        <span style="opacity:.85;"> Version ${escapeHtml(protoVersion)}</span>
      </div>
      <a href="toc.html" target="_blank" rel="noreferrer">Open Contents Page</a>
    </header>
    <main class="workspace">
      <section class="panel">
        <div class="panel-head">Contents</div>
        <iframe id="tocFrame" name="tocFrame" src="toc.embedded.html" title="ProtoML help contents"></iframe>
      </section>
      <section class="panel">
        <div class="panel-head" id="topicLabel">Topic</div>
        <iframe id="contentFrame" name="contentFrame" src="html_docs/00_overview.html" title="ProtoML help content"></iframe>
      </section>
    </main>
  </div>
  <script>
    const tocFrame = document.getElementById("tocFrame");
    const contentFrame = document.getElementById("contentFrame");
    const topicLabel = document.getElementById("topicLabel");
    const defaultTopic = "html_docs/00_overview.html";

    function normalizeTarget(href) {
      if (!href) return null;
      if (href.startsWith("http://") || href.startsWith("https://")) return href;
      if (href.startsWith("html_docs/") || href === "toc.html") return href;
      if (href.startsWith("../html_docs/")) return href.slice(3);
      if (href.startsWith("../toc.html")) return "toc.html";
      return href;
    }

    function openTopic(target) {
      const normalized = normalizeTarget(target) || defaultTopic;
      if (normalized === "toc.html") {
        contentFrame.src = defaultTopic;
        return;
      }
      contentFrame.src = normalized;
      topicLabel.textContent = normalized.replace(/^html_docs\\//, "");
      history.replaceState(null, "", "?topic=" + encodeURIComponent(normalized));
    }

    function wireFrame(frame) {
      frame.addEventListener("load", () => {
        try {
          const doc = frame.contentDocument;
          if (!doc) return;
          for (const link of doc.querySelectorAll("a[href]")) {
            link.addEventListener("click", (event) => {
              const href = link.getAttribute("href");
              const target = normalizeTarget(href);
              if (!target || target.startsWith("http://") || target.startsWith("https://")) {
                return;
              }
              event.preventDefault();
              openTopic(target);
            });
          }
        } catch (error) {
          console.warn("Failed to wire help navigation", error);
        }
      });
    }

    wireFrame(tocFrame);
    wireFrame(contentFrame);

    const initialTopic = new URLSearchParams(location.search).get("topic");
    if (initialTopic) {
      openTopic(initialTopic);
    } else {
      openTopic(defaultTopic);
    }
  </script>
</body>
</html>
`;
}

function buildHhc() {
  const groupBlocks = tocGroups.map((group) => {
    const items = group.pages.map((page) => `\t\t<LI> <OBJECT type="text/sitemap">
\t\t\t<param name="Name" value="${escapeAttribute(page.title)}">
\t\t\t<param name="Local" value="html_docs/${escapeAttribute(page.file)}">
\t\t\t</OBJECT>`).join("\n");

    return `\t<LI> <OBJECT type="text/sitemap">
\t\t<param name="Name" value="${escapeAttribute(group.name)}">
\t\t</OBJECT>
\t<UL>
${items}
\t</UL>`;
  }).join("\n");

  return `<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML//EN">
<HTML>
<HEAD>
<meta name="GENERATOR" content="Microsoft&reg; HTML Help Workshop 4.1">
<!-- Sitemap 1.0 -->
</HEAD><BODY>
<OBJECT type="text/site properties">
\t<param name="ImageType" value="Folder">
</OBJECT>
<UL>
\t<LI> <OBJECT type="text/sitemap">
\t\t<param name="Name" value="ProtoML Help">
\t\t<param name="Local" value="toc.html">
\t\t</OBJECT>
\t<UL>
${groupBlocks}
\t</UL>
</UL>
</BODY></HTML>
`;
}

function buildHhk() {
  const items = indexEntries.map((entry) => `\t<LI> <OBJECT type="text/sitemap">
\t\t<param name="Name" value="${escapeAttribute(entry.keyword)}">
\t\t<param name="Local" value="${escapeAttribute(entry.local)}">
\t\t</OBJECT>`).join("\n");

  return `<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML//EN">
<HTML>
<HEAD>
<meta name="GENERATOR" content="Microsoft&reg; HTML Help Workshop 4.1">
<!-- Sitemap 1.0 -->
</HEAD><BODY>
<UL>
${items}
</UL>
</BODY></HTML>
`;
}

function buildHhp() {
  const fileList = [
    "toc.html",
    "toc.embedded.html",
    "help-viewer.html",
    "TOC.hhc",
    "Index.hhk",
    "html_docs/help.css",
    ...pages.map((page) => `html_docs/${page.file}`),
  ].join("\n");

  return `[OPTIONS]
Compatibility=1.1 or later
Compiled file=protoml-help.chm
Contents file=TOC.hhc
Default topic=toc.html
Display compile progress=No
Full-text search=Yes
Index file=Index.hhk
Language=0x409 English (United States)
Title=ProtoML Help
Version=${protoVersion}

[FILES]
${fileList}
`;
}

function generateChmDocs() {
  ensureDir(htmlDocsDir);
  for (const entry of fs.readdirSync(htmlDocsDir, { withFileTypes: true })) {
    if (entry.isFile()) {
      fs.unlinkSync(path.join(htmlDocsDir, entry.name));
    }
  }

  writeFile(stylesFile, buildStyles());
  writeFile(tocHtmlFile, buildTocHtml());
  writeFile(embeddedTocHtmlFile, buildTocHtml("contentFrame"));
  writeFile(helpViewerFile, buildHelpViewerHtml());
  writeFile(tocFile, buildHhc());
  writeFile(indexFile, buildHhk());
  writeFile(projectFile, buildHhp());

  for (const page of pages) {
    writeFile(path.join(htmlDocsDir, page.file), htmlTemplate(page.title, page.body));
  }
}

function compileChm() {
  const compiler = compilerCandidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (!compiler) {
    console.log("CHM project files generated, but HTML Help Workshop compiler was not found.");
    return;
  }

  const outputFile = path.join(chmDir, "protoml-help.chm");

  try {
    const stdout = execFileSync(compiler, [projectFile], { cwd: chmDir, stdio: "pipe" });
    if (stdout?.length) {
      process.stdout.write(stdout.toString());
    }
    console.log(`CHM compiled with ${compiler}`);
  } catch (error) {
    if (error.stdout?.length) {
      process.stdout.write(error.stdout.toString());
    }
    if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 0) {
      console.log(`CHM compiled with ${compiler}`);
      return;
    }
    throw error;
  }
}

generateChmDocs();

if (process.argv.includes("--compile")) {
  compileChm();
}
