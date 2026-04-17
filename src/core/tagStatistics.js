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

function getReportDisplayName(ast, filename) {
  const explicitTitle = ast?.meta?.title;
  if (explicitTitle) {
    return explicitTitle;
  }

  return path.basename(filename);
}

function loadTagFileTree(filename, visited = new Set()) {
  const fullPath = path.resolve(filename);
  if (visited.has(fullPath)) {
    return null;
  }
  visited.add(fullPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Tag file not found: ${fullPath}`);
  }

  const raw = fs.readFileSync(fullPath, "utf8");
  const tokens = tokenize(raw);
  const ast = parseBlocks(tokens);

  const imports = Array.isArray(ast.tags_import) ? ast.tags_import : [];
  const imported = imports
    .map((ref) => loadTagFileTree(path.resolve(path.dirname(fullPath), normalizeFileRef(ref)), visited))
    .filter(Boolean);

  return {
    path: fullPath,
    title: getReportDisplayName(ast, fullPath),
    ast,
    imported,
  };
}

function buildEffectiveTags(node) {
  const importedTags = node.imported.reduce((merged, child) => {
    return { ...merged, ...buildEffectiveTags(child) };
  }, {});

  return {
    ...importedTags,
    ...(node.ast.tags || {}),
  };
}

function analyzeSourceFile(sourceFile, reportTags) {
  const ast = parseFile(sourceFile);
  const tasks = Array.isArray(ast.tasks) ? ast.tasks : [];
  const sourceTags = ast.tags || {};

  return tasks
    .filter((task) => task.meta?.tag && reportTags[task.meta.tag])
    .map((task) => ({
      text: task.text,
      raw: task.raw,
      done: task.done,
      tag: {
        id: task.meta.tag,
        label: reportTags[task.meta.tag],
        source_label: sourceTags[task.meta.tag] || reportTags[task.meta.tag],
        overridden: Boolean(
          sourceTags[task.meta.tag] && sourceTags[task.meta.tag] !== reportTags[task.meta.tag]
        ),
      },
      subject: task.subject?.label || null,
      assigned_to: task.assigned_to?.name || null,
    }));
}

function analyzeTagTree(node) {
  const localTags = node.ast.tags || {};
  const effectiveTags = buildEffectiveTags(node);
  const sourceRefs = Array.isArray(node.ast.tag_sources) ? node.ast.tag_sources : [];
  const sources = sourceRefs.map((ref) => {
    const fullPath = path.resolve(path.dirname(node.path), normalizeFileRef(ref));
    return {
      path: fullPath,
      tasks: analyzeSourceFile(fullPath, effectiveTags),
    };
  });

  const tagStats = {};
  for (const id in effectiveTags) {
    tagStats[id] = {
      id,
      label: effectiveTags[id],
      total: 0,
      open: 0,
      done: 0,
    };
  }

  for (const source of sources) {
    for (const task of source.tasks) {
      const stat = tagStats[task.tag.id];
      if (!stat) continue;
      stat.total += 1;
      if (task.done) stat.done += 1;
      else stat.open += 1;
    }
  }

  return {
    path: node.path,
    title: node.title,
    tags: effectiveTags,
    local_tags: localTags,
    tag_sources: sources,
    tag_stats: tagStats,
    imported: node.imported.map(analyzeTagTree),
  };
}

function analyzeTagStatistics(filename) {
  const tree = loadTagFileTree(filename);
  return analyzeTagTree(tree);
}

function formatTask(task) {
  const parts = [`[${task.done ? "done" : "open"}] ${task.text}`, `@tag=${task.tag.id}`];
  if (task.tag.source_label && task.tag.source_label !== task.tag.label) {
    parts.push(`source-tag=${task.tag.source_label}`);
  }
  if (task.assigned_to) parts.push(`assigned=${task.assigned_to}`);
  if (task.subject) parts.push(`subject=${task.subject}`);
  return parts.join(" | ");
}

function formatTagStatistics(report, indent = "", verbosity = 0) {
  const lines = [];
  lines.push(`${indent}Tag file: ${report.title}`);
  if (verbosity >= 1 || report.title !== report.path) {
    lines.push(`${indent}Path: ${report.path}`);
  }

  const tagIds = Object.keys(report.tags);
  if (tagIds.length) {
    lines.push(`${indent}Tags:`);
    for (const id of tagIds) {
      const stat = report.tag_stats[id];
      const baseLine = `${indent}- ${id}: ${report.tags[id]} (total=${stat.total}, open=${stat.open}, done=${stat.done})`;
      if (verbosity >= 2 && report.local_tags?.[id] && report.local_tags[id] === report.tags[id]) {
        lines.push(`${baseLine} [local]`);
      } else {
        lines.push(baseLine);
      }
    }
  }

  if (report.tag_sources.length) {
    lines.push(`${indent}Sources:`);
    for (const source of report.tag_sources) {
      lines.push(`${indent}- ${source.path}`);
      if (verbosity >= 1 && source.tasks.length) {
        for (const task of source.tasks) {
          lines.push(`${indent}  ${formatTask(task)}`);
        }
      } else if (verbosity >= 1) {
        lines.push(`${indent}  (no matching tasks)`);
      }
    }
  }

  if (verbosity >= 2 && report.imported.length) {
    lines.push(`${indent}Imported tag files:`);
    for (const child of report.imported) {
      lines.push(formatTagStatistics(child, `${indent}  `, verbosity));
    }
  }

  if (verbosity >= 3 && Object.keys(report.local_tags || {}).length) {
    lines.push(`${indent}Local tags:`);
    for (const [id, label] of Object.entries(report.local_tags)) {
      lines.push(`${indent}- ${id}: ${label}`);
    }
  }

  return lines.join("\n");
}

function renderTagStatisticsJSON(report) {
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

function renderSourceTasks(source) {
  if (!source.tasks.length) {
    return `<p class="muted">(no matching tasks)</p>`;
  }

  const items = source.tasks.map((task) => {
    const meta = [
      `@tag=${escapeHtml(task.tag.id)}`,
      task.tag.source_label && task.tag.source_label !== task.tag.label
        ? `source-tag=${escapeHtml(task.tag.source_label)}`
        : null,
      task.assigned_to ? `assigned=${escapeHtml(task.assigned_to)}` : null,
      task.subject ? `subject=${escapeHtml(task.subject)}` : null,
      task.done ? "done" : "open",
    ].filter(Boolean).join(" • ");

    return `<li class="${task.done ? "done" : "open"}">` +
      `<div class="task-text">${escapeHtml(task.text)}</div>` +
      `<div class="task-meta">${meta}</div>` +
      `</li>`;
  }).join("\n");

  return `<ul class="task-list">${items}</ul>`;
}

function renderTagStatisticsSection(report) {
  const tagCards = Object.keys(report.tags).map((id) => {
    const stat = report.tag_stats[id];
    return `<article class="tag-card">` +
      `<div class="tag-head"><strong>${escapeHtml(report.tags[id])}</strong><code>@tag=${escapeHtml(id)}</code></div>` +
      `<div class="tag-stats">` +
      `<span>Total: ${stat.total}</span>` +
      `<span>Open: ${stat.open}</span>` +
      `<span>Done: ${stat.done}</span>` +
      `</div>` +
      `</article>`;
  }).join("\n");

  const sources = report.tag_sources.map((source) => {
    return `<section class="source-block">` +
      `<h4>${escapeHtml(source.path)}</h4>` +
      `${renderSourceTasks(source)}` +
      `</section>`;
  }).join("\n");

  const imported = report.imported.map((child) => {
    return `<section class="imported-block">${renderTagStatisticsSection(child)}</section>`;
  }).join("\n");

  return `<section class="report-block">` +
    `<h2>${escapeHtml(report.title)}</h2>` +
    `<p class="report-path"><code>${escapeHtml(report.path)}</code></p>` +
    `<div class="tag-grid">${tagCards}</div>` +
    `<section class="sources"><h3>Sources</h3>${sources || `<p class="muted">(no sources)</p>`}</section>` +
    `${imported ? `<section class="imports"><h3>Imported tag files</h3>${imported}</section>` : ""}` +
    `</section>`;
}

function renderTagStatisticsHTML(report) {
  const pageTitle = report.title || "Tag Statistics";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(pageTitle)}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #fff; color: #222; margin: 0; padding: 2rem; max-width: 1000px; margin-inline: auto; }
    h1 { font-size: 2rem; margin-bottom: 1.5rem; border-bottom: 2px solid #ddd; padding-bottom: 0.5rem; }
    h2 { font-size: 1.4rem; margin-top: 2rem; }
    h3 { font-size: 1.1rem; margin-top: 1.5rem; color: #444; }
    h4 { font-size: 1rem; margin-bottom: 0.5rem; }
    code { background: #f3f3f3; padding: 0.1rem 0.3rem; border-radius: 4px; }
    .tag-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; margin: 1rem 0 1.5rem; }
    .tag-card { border: 1px solid #ddd; border-left: 4px solid #4a90e2; border-radius: 8px; padding: 0.9rem; background: #fafafa; }
    .tag-head { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 0.5rem; }
    .tag-stats { display: flex; gap: 0.75rem; flex-wrap: wrap; font-size: 0.92rem; color: #444; }
    .source-block { margin-bottom: 1.25rem; padding: 0.85rem 1rem; border: 1px solid #e5e5e5; border-radius: 8px; background: #fcfcfc; }
    .task-list { margin: 0; padding-left: 1.25rem; }
    .task-list li { margin-bottom: 0.65rem; }
    .task-text { font-weight: 600; }
    .task-meta { font-size: 0.88rem; color: #666; margin-top: 0.15rem; }
    .done .task-text { text-decoration: line-through; color: #888; }
    .muted { color: #777; font-style: italic; }
    .imported-block { margin-top: 1rem; padding-left: 1rem; border-left: 3px solid #ddd; }
    .report-path { margin-top: -0.75rem; color: #666; }
  </style>
</head>
<body>
  <h1>${escapeHtml(pageTitle)}</h1>
  ${renderTagStatisticsSection(report)}
</body>
</html>`;
}

function renderTagStatisticsPDF(report) {
  const html = renderTagStatisticsHTML(report);

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

module.exports = {
  analyzeTagStatistics,
  formatTagStatistics,
  renderTagStatisticsJSON,
  renderTagStatisticsHTML,
  renderTagStatisticsPDF,
};
