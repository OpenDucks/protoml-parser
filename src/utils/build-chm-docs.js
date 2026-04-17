const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const docsDir = path.join(repoRoot, "docs");
const chmDir = path.join(docsDir, "chm");
const htmlDocsDir = path.join(chmDir, "html_docs");
const projectFile = path.join(chmDir, "protoml-help.hhp");
const tocFile = path.join(chmDir, "TOC.hhc");
const indexFile = path.join(chmDir, "Index.hhk");
const tocHtmlFile = path.join(chmDir, "toc.html");
const stylesFile = path.join(htmlDocsDir, "help.css");
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const protoVersion = packageJson.version || "unknown";

const compilerCandidates = [
  process.env.HHC_EXE,
  "C:\\Program Files (x86)\\HTML Help Workshop\\hhc.exe",
  "C:\\Program Files\\HTML Help Workshop\\hhc.exe",
].filter(Boolean);

const pages = [
  {
    file: "getting_started.html",
    title: "Getting Started",
    keywords: ["getting started", "install", "quick start", "setup"],
    body: `
      <h1>Getting Started</h1>
      <p>ProtoML is a lightweight document language for meetings, protocols, reusable content, shared tags, and structured exports.</p>
      <h2>Install</h2>
      <pre><code>npm install -g protoml-parser</code></pre>
      <p>Or from source:</p>
      <pre><code>git clone https://github.com/Ente/protoml-parser.git
cd protoml-parser
npm install -g .</code></pre>
      <h2>First file</h2>
      <pre><code>@protocol "Project Protocol - {{date}}"
@date:24.05.2025

@participants
=pt1:John Doe,jdoe,jdoe@example.com

@subjects
=0:Weekly sync

@meeting "Minutes"
# Weekly Sync
@@e=0</code></pre>
      <h2>Render</h2>
      <pre><code>protoparser "test.pml" html
protoviewer "test.pml"</code></pre>
    `,
  },
  {
    file: "updates_removing.html",
    title: "Updating And Removing",
    keywords: ["update", "remove", "uninstall", "upgrade", "npm"],
    body: `
      <h1>Updating And Removing</h1>
      <h2>Update a global installation</h2>
      <pre><code>npm install -g protoml-parser</code></pre>
      <h2>Reinstall a local development version</h2>
      <pre><code>npm uninstall -g protoml-parser
npm install -g .</code></pre>
      <h2>Remove the package</h2>
      <pre><code>npm uninstall -g protoml-parser</code></pre>
      <h2>Check version</h2>
      <pre><code>protoparser --version</code></pre>
    `,
  },
  {
    file: "basic_syntax.html",
    title: "Basic Syntax",
    keywords: ["syntax", "participants", "subjects", "tasks", "meeting", "meta"],
    body: `
      <h1>Basic Syntax</h1>
      <p>ProtoML is organized into blocks, metadata, declarations, entries, and inline meeting commands.</p>
      <h2>Metadata</h2>
      <pre><code>@date:24.05.2025
@author:Jane Doe
@version:1.0
@status:review
@record_id:PROTO-2026-001
@meta=department:Platform Engineering</code></pre>
      <h2>Core blocks</h2>
      <pre><code>@participants
=pt1:Jane Doe,jane,jane@example.com

@subjects
=0:Project status

@tasks
-[ ] Prepare release notes @ptp=pt1 =0 @tag=important

@notes
- HTML export works -b very well -b-

@meeting "Minutes"
# Weekly Sync
## Participants
@@e=pt1</code></pre>
      <h2>Inline commands</h2>
      <ul>
        <li><code>@@e=id</code> for simple references</li>
        <li><code>@@ref=group:id[:field]</code> for structured references</li>
        <li><code>@@toc</code> for a table of contents</li>
        <li><code>@@signature=id</code> and <code>@@approval=id</code></li>
      </ul>
    `,
  },
  {
    file: "cli_commands.html",
    title: "CLI Commands",
    keywords: ["cli", "commands", "validate", "analyze", "register", "bundle", "macros"],
    body: `
      <h1>CLI Commands</h1>
      <h2>Main rendering</h2>
      <pre><code>protoparser "test.pml" html
protoparser "test.pml" pdf
protoparser "test.pml" markdown
protoparser "test.pml" text</code></pre>
      <h2>Validation and inspection</h2>
      <pre><code>protoparser validate "test.pml"
protoparser -v validate "test.pml"
protoparser macros "test.pml"
protoparser analyze "test.pml" statistics
protoparser analyze "test.pml" graph</code></pre>
      <h2>Tag reports</h2>
      <pre><code>protoparser tags "_tags.pml" statistics
protoparser tags "_tags.pml" html
protoparser tags "_tags.pml" validate</code></pre>
      <h2>Portfolio and archive helpers</h2>
      <pre><code>protoparser register "meetings" statistics
protoparser register "contracts" html
protoparser bundle "test.pml"</code></pre>
      <h2>Verbosity</h2>
      <ul>
        <li><code>-v</code> adds a compact overview</li>
        <li><code>-vv</code> adds deeper lists and nested detail</li>
        <li><code>-vvv</code> adds the most verbose diagnostic output</li>
      </ul>
    `,
  },
  {
    file: "macro_usage.html",
    title: "Macro Usage",
    keywords: ["macro", "usage", "template", "macro_dir"],
    body: `
      <h1>Macro Usage</h1>
      <p>Macros register external reusable templates for the <code>@meeting</code> block.</p>
      <h2>Register a macro</h2>
      <pre><code>@macro badge "{{macro_dir}}/badge.pml"
@macro quote "{{macro_dir}}/quote.pml"</code></pre>
      <h2>Use a macro</h2>
      <pre><code>@@macro=badge:text=review
@@macro=quote:text=Imported ProtoML sections keep their own meeting body.;author=Casey Example</code></pre>
      <h2>Inspect macros</h2>
      <pre><code>protoparser --listMacros "{{macro_dir}}"
protoparser --macroHelp "{{macro_dir}}/finance/f_entry.pml"
protoparser macros "test.pml"</code></pre>
      <p>Paths should be wrapped in double quotes, especially when using <code>{{macro_dir}}</code>.</p>
    `,
  },
  {
    file: "macro_development.html",
    title: "Macro Development",
    keywords: ["macro development", "new_macro", "template", "docs"],
    body: `
      <h1>Macro Development</h1>
      <p>A macro file is a ProtoML file with a declared name and template body.</p>
      <pre><code>@new_macro
=name:warningBox
=template:
&lt;div class="warn-box"&gt;&lt;strong&gt;{{title}}&lt;/strong&gt;&lt;br&gt;{{text}}&lt;/div&gt;
=docs:
Shows a warning box with a title and a text body.</code></pre>
      <h2>Usage</h2>
      <pre><code>@macro warningBox "macros/warning-box.pml"
@@macro=warningBox:title=Alert;text=Something happened</code></pre>
      <p>Macro templates can contain HTML and JavaScript. They are mainly intended for HTML and PDF rendering.</p>
    `,
  },
  {
    file: "outputs.html",
    title: "Outputs",
    keywords: ["output", "html", "pdf", "json", "markdown", "text", "bundle"],
    body: `
      <h1>Outputs</h1>
      <ul>
        <li><strong>HTML</strong> for styled document rendering</li>
        <li><strong>PDF</strong> for printable export</li>
        <li><strong>JSON</strong> for AST-level debugging and tooling</li>
        <li><strong>Markdown</strong> for readable text export as <code>.md</code></li>
        <li><strong>Text</strong> for plain report export as <code>.txt</code></li>
      </ul>
      <h2>Examples</h2>
      <pre><code>protoparser "test.pml" html
protoparser "test.pml" pdf
protoparser "test.pml" json
protoparser "test.pml" markdown
protoparser "test.pml" text</code></pre>
      <h2>Bundle output</h2>
      <pre><code>protoparser bundle "test.pml"</code></pre>
      <p>This writes a bundled <code>.pml</code> file with expanded imports.</p>
    `,
  },
  {
    file: "styles.html",
    title: "Themes And Styles",
    keywords: ["themes", "styles", "css", "dark", "cyber", "print"],
    body: `
      <h1>Themes And Styles</h1>
      <p>HTML and PDF renderers support themes via the <code>-theme=...</code> option.</p>
      <pre><code>protoparser "test.pml" html -theme=cyber
protoparser "test.pml" pdf -theme=print</code></pre>
      <h2>Examples of bundled themes</h2>
      <ul>
        <li>default</li>
        <li>dark</li>
        <li>print</li>
        <li>cyber</li>
        <li>glitch-jff</li>
        <li>gridcore</li>
        <li>terminal</li>
      </ul>
    `,
  },
  {
    file: "web_parser.html",
    title: "Web Parser",
    keywords: ["web parser", "browser", "bundle", "web"],
    body: `
      <h1>Web Parser</h1>
      <p>The repository includes a browser-oriented parser demo in the <code>web/</code> directory.</p>
      <h2>Build the browser bundle</h2>
      <pre><code>npm run build:web</code></pre>
      <h2>Start a local server</h2>
      <pre><code>npm run dev</code></pre>
      <p>Open <code>web/index.html</code> for the interactive demo.</p>
    `,
  },
  {
    file: "protoviewer.html",
    title: "Protoviewer",
    keywords: ["protoviewer", "viewer", "electron"],
    body: `
      <h1>Protoviewer</h1>
      <p><code>protoviewer</code> opens rendered ProtoML files in the bundled Electron viewer.</p>
      <pre><code>protoviewer "test.pml"
protoviewer "test.pml" dark</code></pre>
      <p>This is useful for quickly reviewing generated documents without manually opening browser files.</p>
    `,
  },
  {
    file: "local_development.html",
    title: "Local Development",
    keywords: ["development", "local", "build", "npm", "windows help"],
    body: `
      <h1>Local Development</h1>
      <pre><code>git clone https://github.com/ente/protoml-parser.git
cd protoml-parser
npm install</code></pre>
      <h2>Useful commands</h2>
      <pre><code>npm run build:web
npm run dev
npm run build:exe
npm run build:chm
npm run install:local</code></pre>
      <h2>Native Windows help</h2>
      <p>The CHM project files live in <code>docs/chm/</code>. The repository can generate and compile the Windows help project using HTML Help Workshop.</p>
    `,
  },
];

const tocEntries = pages.map((page) => ({ name: page.title, local: `html_docs/${page.file}` }));
const indexEntries = [
  ...pages.flatMap((page) => page.keywords.map((keyword) => ({ keyword, local: `html_docs/${page.file}` }))),
  { keyword: "ProtoML", local: "toc.html" },
  { keyword: "Protoparser", local: "html_docs/cli_commands.html" },
  { keyword: "Register", local: "html_docs/cli_commands.html" },
  { keyword: "Bundle", local: "html_docs/outputs.html" },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function htmlTemplate(title, body) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title} - ProtoML ${protoVersion}</title>
  <link rel="stylesheet" href="help.css">
</head>
<body>
  <nav class="topnav">
    <a href="../toc.html">Contents</a>
    <span class="version">ProtoML ${protoVersion}</span>
  </nav>
  <main class="page">
    ${body}
  </main>
</body>
</html>
`;
}

function buildStyles() {
  return `body {
  font-family: Segoe UI, Tahoma, sans-serif;
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
  max-width: 900px;
}

h1 {
  font-size: 1.9rem;
  border-bottom: 2px solid #d9d9d9;
  padding-bottom: 0.4rem;
}

h2 {
  font-size: 1.25rem;
  margin-top: 1.6rem;
  color: #0f4c81;
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

ul li {
  margin-bottom: 0.35rem;
}
`;
}

function buildTocHtml() {
  const items = pages.map((page) => `<li><a href="html_docs/${page.file}">${page.title}</a></li>`).join("\n");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>ProtoML Help Contents - ProtoML ${protoVersion}</title>
  <style>
    body { font-family: Segoe UI, Tahoma, sans-serif; padding: 1.2rem 1.4rem; }
    h1 { font-size: 1.7rem; }
    .version { color: #555; margin-bottom: 1rem; font-size: 0.95rem; }
    ol li { margin-bottom: 0.45rem; }
    a { color: #0f4c81; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>ProtoML Help Contents</h1>
  <div class="version">Version: ${protoVersion}</div>
  <ol>
    ${items}
  </ol>
</body>
</html>
`;
}

function buildHhc() {
  const items = tocEntries.map((entry) => `\t<LI> <OBJECT type="text/sitemap">
\t\t<param name="Name" value="${entry.name}">
\t\t<param name="Local" value="${entry.local}">
\t\t</OBJECT>`).join("\n");

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
${items}
\t</UL>
</UL>
</BODY></HTML>
`;
}

function buildHhk() {
  const items = indexEntries.map((entry) => `\t<LI> <OBJECT type="text/sitemap">
\t\t<param name="Name" value="${entry.keyword}">
\t\t<param name="Local" value="${entry.local}">
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

  writeFile(stylesFile, buildStyles());
  writeFile(tocHtmlFile, buildTocHtml());
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
