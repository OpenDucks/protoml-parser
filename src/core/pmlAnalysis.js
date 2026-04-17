const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const deasync = require("deasync");

const { tokenize } = require("./tokenizer");
const { parseBlocks } = require("./blockParser");
const { parseFile } = require("./parser");

function normalizeFileRef(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function countKeys(value) {
  return value && typeof value === "object" ? Object.keys(value).length : 0;
}

function countItems(value) {
  return Array.isArray(value) ? value.length : 0;
}

function countTaskStates(tasks = []) {
  let open = 0;
  let done = 0;

  for (const task of tasks) {
    if (task?.done) done += 1;
    else open += 1;
  }

  return { open, done };
}

function getDisplayName(filename, localAst, resolvedAst) {
  const protocolTitle = String(resolvedAst?.meta?.protocol || "").replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const normalizedKey = String(key).trim();
    return resolvedAst?.meta?.[normalizedKey] ?? "";
  });

  return (
    localAst?.meta?.title ||
    protocolTitle ||
    resolvedAst?.meta?.meeting_title ||
    path.basename(filename)
  );
}

function getLocalStats(ast) {
  const taskState = countTaskStates(ast.tasks || []);
  return {
    participants: countKeys(ast.participants),
    subjects: countKeys(ast.subjects),
    tags: countKeys(ast.tags),
    tasks_total: countItems(ast.tasks),
    tasks_open: taskState.open,
    tasks_done: taskState.done,
    notes: countItems(ast.notes),
    meeting_lines: countItems(ast.meeting),
    macros: countKeys(ast.macros),
    content_imports: countKeys(ast.imports),
    tag_imports: countItems(ast.tags_import),
  };
}

function getResolvedStats(ast) {
  const taskState = countTaskStates(ast.tasks || []);
  return {
    participants: countKeys(ast.participants),
    subjects: countKeys(ast.subjects),
    tags: countKeys(ast.tags),
    tasks_total: countItems(ast.tasks),
    tasks_open: taskState.open,
    tasks_done: taskState.done,
    notes: countItems(ast.notes),
    meeting_lines: countItems(ast.meeting),
    macros: countKeys(ast._macroCache),
    content_imports: countKeys(ast.imports),
    tag_stats: countKeys(ast.tag_stats),
  };
}

function loadPmlAnalysisTree(filename, ancestors = new Set()) {
  const fullPath = path.resolve(filename);
  if (ancestors.has(fullPath)) {
    return {
      path: fullPath,
      title: path.basename(fullPath),
      cycle: true,
    };
  }

  if (!fs.existsSync(fullPath)) {
    throw new Error(`PML file not found: ${fullPath}`);
  }

  const raw = fs.readFileSync(fullPath, "utf8");
  const localAst = parseBlocks(tokenize(raw));
  const resolvedAst = parseFile(fullPath);
  const baseDir = path.dirname(fullPath);
  const nextAncestors = new Set(ancestors);
  nextAncestors.add(fullPath);
  const isSharedTagFile =
    Boolean(localAst.tags && Object.keys(localAst.tags).length) &&
    !countKeys(localAst.participants) &&
    !countKeys(localAst.subjects) &&
    !countKeys(localAst.macros) &&
    !countKeys(localAst.imports) &&
    !countItems(localAst.tasks) &&
    !countItems(localAst.notes) &&
    !countItems(localAst.meeting);

  const tagImports = (Array.isArray(localAst.tags_import) ? localAst.tags_import : [])
    .map((ref) => {
      const childPath = path.resolve(baseDir, normalizeFileRef(ref));
      return loadPmlAnalysisTree(childPath, nextAncestors);
    })
    .filter(Boolean);

  const contentImports = Object.entries(localAst.imports || {}).map(([name, entry]) => {
    const importPath = path.resolve(baseDir, normalizeFileRef(entry.file));
    const format = String(entry.format || "text").toLowerCase();

    if (format === "pml") {
      return {
        name,
        format,
        path: importPath,
        analysis: loadPmlAnalysisTree(importPath, nextAncestors),
      };
    }

    const exists = fs.existsSync(importPath);
    const htmlRaw = exists ? fs.readFileSync(importPath, "utf8") : "";
    return {
      name,
      format,
      path: importPath,
      exists,
      stats: {
        bytes: exists ? Buffer.byteLength(htmlRaw, "utf8") : 0,
        lines: exists ? htmlRaw.split(/\r?\n/).length : 0,
      },
    };
  });

  return {
    path: fullPath,
    title: getDisplayName(fullPath, localAst, resolvedAst),
    kind: isSharedTagFile ? "tags" : "pml",
    cycle: false,
    meta: resolvedAst.meta || {},
    local_stats: getLocalStats(localAst),
    resolved_stats: getResolvedStats(resolvedAst),
    macros: Object.keys(localAst.macros || {}).map((name) => ({
      name,
      file: localAst.macros[name],
    })),
    tag_imports: tagImports,
    content_imports: contentImports,
  };
}

function analyzePmlFile(filename) {
  return loadPmlAnalysisTree(filename);
}

function formatStats(stats, indent = "") {
  return [
    `${indent}participants=${stats.participants}`,
    `${indent}subjects=${stats.subjects}`,
    `${indent}tags=${stats.tags}`,
    `${indent}tasks_total=${stats.tasks_total}`,
    `${indent}tasks_open=${stats.tasks_open}`,
    `${indent}tasks_done=${stats.tasks_done}`,
    `${indent}notes=${stats.notes}`,
    `${indent}meeting_lines=${stats.meeting_lines}`,
    `${indent}macros=${stats.macros}`,
    `${indent}content_imports=${stats.content_imports}`,
    ...(stats.tag_imports != null ? [`${indent}tag_imports=${stats.tag_imports}`] : []),
    ...(stats.tag_stats != null ? [`${indent}tag_stats=${stats.tag_stats}`] : []),
  ].join(", ");
}

function formatPmlAnalysis(report, indent = "", verbosity = 0) {
  if (report.cycle) {
    return `${indent}PML file: ${report.title}\n${indent}Path: ${report.path}\n${indent}(cycle detected)`;
  }

  const lines = [];
  lines.push(`${indent}PML file: ${report.title}`);
  lines.push(`${indent}Path: ${report.path}`);
  lines.push(`${indent}Local stats: ${formatStats(report.local_stats)}`);
  lines.push(`${indent}Resolved stats: ${formatStats(report.resolved_stats)}`);

  if (verbosity >= 1 && report.macros.length) {
    lines.push(`${indent}Macros:`);
    for (const macro of report.macros) {
      lines.push(`${indent}- ${macro.name}: ${macro.file}`);
    }
  }

  if (report.content_imports.length) {
    lines.push(`${indent}Content imports:`);
    for (const entry of report.content_imports) {
      if (entry.format === "pml" && entry.analysis) {
        lines.push(`${indent}- ${entry.name} (${entry.format}) -> ${entry.path}`);
        if (verbosity >= 2) {
          lines.push(formatPmlAnalysis(entry.analysis, `${indent}  `, verbosity));
        }
      } else if (verbosity >= 1) {
        lines.push(
          `${indent}- ${entry.name} (${entry.format}) -> ${entry.path} (lines=${entry.stats.lines}, bytes=${entry.stats.bytes})`
        );
      } else {
        lines.push(`${indent}- ${entry.name} (${entry.format}) -> ${entry.path}`);
      }
    }
  }

  if (report.tag_imports.length) {
    lines.push(`${indent}Tag imports:`);
    for (const child of report.tag_imports) {
      if (verbosity >= 2) {
        lines.push(formatPmlAnalysis(child, `${indent}  `, verbosity));
      } else {
        lines.push(`${indent}  ${child.title}`);
      }
    }
  }

  if (verbosity >= 3 && Object.keys(report.meta || {}).length) {
    lines.push(`${indent}Resolved meta:`);
    for (const [key, value] of Object.entries(report.meta)) {
      lines.push(`${indent}- ${key}: ${value}`);
    }
  }

  return lines.join("\n");
}

function renderPmlAnalysisJSON(report) {
  return JSON.stringify(report, null, 2);
}

function escapeHtml(text) {
  return String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[c])
  );
}

function renderStatsTable(title, stats) {
  const rows = Object.entries(stats).map(([key, value]) => {
    return `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`;
  }).join("");

  return `<section class="stats-block"><h3>${escapeHtml(title)}</h3><table>${rows}</table></section>`;
}

function renderPmlAnalysisSection(report) {
  if (report.cycle) {
    return `<section class="report-block"><h2>${escapeHtml(report.title)}</h2><p class="report-path"><code>${escapeHtml(report.path)}</code></p><p class="muted">(cycle detected)</p></section>`;
  }

  const macros = report.macros.length
    ? `<section><h3>Macros</h3><ul>${report.macros.map((macro) => `<li><code>${escapeHtml(macro.name)}</code> -> ${escapeHtml(macro.file)}</li>`).join("")}</ul></section>`
    : "";

  const contentImports = report.content_imports.length
    ? `<section><h3>Content Imports</h3>${report.content_imports.map((entry) => {
        if (entry.format === "pml" && entry.analysis) {
          return `<section class="import-card"><h4>${escapeHtml(entry.name)} <code>${escapeHtml(entry.format)}</code></h4><p><code>${escapeHtml(entry.path)}</code></p>${renderPmlAnalysisSection(entry.analysis)}</section>`;
        }

        return `<section class="import-card"><h4>${escapeHtml(entry.name)} <code>${escapeHtml(entry.format)}</code></h4><p><code>${escapeHtml(entry.path)}</code></p><p class="muted">lines=${entry.stats.lines}, bytes=${entry.stats.bytes}</p></section>`;
      }).join("")}</section>`
    : "";

  const tagImports = report.tag_imports.length
    ? `<section><h3>Tag Imports</h3>${report.tag_imports.map((child) => renderPmlAnalysisSection(child)).join("")}</section>`
    : "";

  return `<section class="report-block">` +
    `<h2>${escapeHtml(report.title)}</h2>` +
    `<p class="report-path"><code>${escapeHtml(report.path)}</code></p>` +
    `${renderStatsTable("Local Stats", report.local_stats)}` +
    `${renderStatsTable("Resolved Stats", report.resolved_stats)}` +
    `${macros}` +
    `${contentImports}` +
    `${tagImports}` +
    `</section>`;
}

function renderPmlAnalysisHTML(report) {
  const pageTitle = report.title || "PML Analysis";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(pageTitle)}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #fff; color: #222; margin: 0; padding: 2rem; max-width: 1100px; margin-inline: auto; }
    h1 { font-size: 2rem; margin-bottom: 1.5rem; border-bottom: 2px solid #ddd; padding-bottom: 0.5rem; }
    h2 { font-size: 1.35rem; margin-top: 2rem; }
    h3 { font-size: 1rem; margin-top: 1.25rem; color: #444; }
    h4 { font-size: 0.95rem; margin-bottom: 0.4rem; }
    code { background: #f3f3f3; padding: 0.1rem 0.3rem; border-radius: 4px; }
    table { border-collapse: collapse; width: 100%; margin-top: 0.5rem; }
    th, td { border: 1px solid #e0e0e0; padding: 0.45rem 0.6rem; text-align: left; }
    th { width: 220px; background: #fafafa; }
    .report-block { border: 1px solid #e5e5e5; border-radius: 10px; padding: 1rem 1.1rem; margin-bottom: 1rem; background: #fcfcfc; }
    .report-path { margin-top: -0.5rem; color: #666; }
    .stats-block { margin-bottom: 1rem; }
    .import-card { border-left: 3px solid #4a90e2; padding-left: 0.9rem; margin: 0.75rem 0; }
    .muted { color: #777; font-style: italic; }
    ul { padding-left: 1.25rem; }
  </style>
</head>
<body>
  <h1>${escapeHtml(pageTitle)}</h1>
  ${renderPmlAnalysisSection(report)}
</body>
</html>`;
}

function renderPmlAnalysisPDF(report) {
  const html = renderPmlAnalysisHTML(report);

  let done = false;
  let result = null;
  let error = null;

  ;(async () => {
    try {
      const browser = await puppeteer.launch({ headless: "new" });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      result = await page.pdf({ format: "A4" });
      await browser.close();
    } catch (err) {
      error = err;
    } finally {
      done = true;
    }
  })();

  deasync.loopWhile(() => !done);

  if (error) throw error;
  return result;
}

function renderPmlAnalysisGraph(report, options = {}) {
  const direction = ["TD", "LR", "RL", "BT"].includes(String(options.graphDirection || "").toUpperCase())
    ? String(options.graphDirection).toUpperCase()
    : "TD";
  const graphView = String(options.graphView || "compact").toLowerCase();
  const lines = [`graph ${direction}`];
  const seen = new Set();
  const ids = new Map();
  let counter = 0;

  function sanitizeLabel(text) {
    return String(text).replace(/"/g, '\\"');
  }

  function shortFileName(filePath) {
    return path.basename(String(filePath || ""));
  }

  function nodeLabel(node) {
    if (!node) return "Unknown";

    const fileName = shortFileName(node.path);
    if (node.kind === "tags") {
      return `${fileName}\\n${node.title}`;
    }

    if (node.title && node.title !== fileName) {
      return `${fileName}\\n${node.title}`;
    }

    return fileName;
  }

  function pushNode(nodeId, label, kind, isRoot = false) {
    lines.push(`${nodeId}["${sanitizeLabel(label)}"]`);
    if (isRoot) {
      lines.push(`class ${nodeId} graphRoot;`);
    } else if (kind === "tags") {
      lines.push(`class ${nodeId} graphTags;`);
    } else if (kind === "html") {
      lines.push(`class ${nodeId} graphHtml;`);
    } else {
      lines.push(`class ${nodeId} graphPml;`);
    }
  }

  function visit(node, isRoot = false) {
    if (!node) return;
    if (!ids.has(node.path)) {
      counter += 1;
      ids.set(node.path, `n${counter}`);
    }

    const nodeId = ids.get(node.path);
    if (seen.has(node.path)) {
      return nodeId;
    }
    seen.add(node.path);
    pushNode(nodeId, nodeLabel(node), node.kind, isRoot);

    if (graphView === "compact" || graphView === "full" || graphView === "imports") {
      for (const entry of node.content_imports || []) {
        if (entry.format === "pml" && entry.analysis && !entry.analysis.cycle) {
          const childId = visit(entry.analysis);
          lines.push(`${nodeId} -->|import\\n${sanitizeLabel(entry.name)}| ${childId}`);
        } else if (graphView === "full") {
          const htmlNodeKey = `${node.path}::${entry.name}`;
          if (!ids.has(htmlNodeKey)) {
            counter += 1;
            ids.set(htmlNodeKey, `n${counter}`);
            const htmlId = ids.get(htmlNodeKey);
            pushNode(
              htmlId,
              `${entry.name}.${entry.format}\\n${shortFileName(entry.path)}`,
              "html"
            );
          }
          lines.push(`${nodeId} -->|import\\n${sanitizeLabel(entry.name)}| ${ids.get(htmlNodeKey)}`);
        }
      }
    }

    if (graphView === "compact" || graphView === "full" || graphView === "tags") {
      for (const child of node.tag_imports || []) {
        if (!child.cycle) {
          const childId = visit(child);
          lines.push(`${nodeId} -.->|tags| ${childId}`);
        }
      }
    }

    return nodeId;
  }

  visit(report, true);
  lines.push("classDef graphRoot fill:#1f6feb,stroke:#0b3d91,color:#ffffff,stroke-width:2px;");
  lines.push("classDef graphPml fill:#eef6ff,stroke:#4a90e2,color:#12324a,stroke-width:1.5px;");
  lines.push("classDef graphTags fill:#fff4e5,stroke:#d38b00,color:#5c3b00,stroke-width:1.5px;");
  lines.push("classDef graphHtml fill:#f4f4f4,stroke:#8a8a8a,color:#333333,stroke-width:1.5px;");
  return lines.join("\n");
}

module.exports = {
  analyzePmlFile,
  formatPmlAnalysis,
  renderPmlAnalysisJSON,
  renderPmlAnalysisHTML,
  renderPmlAnalysisPDF,
  renderPmlAnalysisGraph,
};
