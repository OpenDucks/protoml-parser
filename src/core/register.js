const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const deasync = require("deasync");

const { parseFile } = require("./parser");

function walkPmlFiles(rootDir) {
  const found = [];
  const ignoredDirs = new Set(["node_modules", ".git", "html", "markdown", "text", "json", "pdf"]);

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name)) continue;
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".pml")) {
        found.push(full);
      }
    }
  }

  walk(rootDir);
  return found.sort();
}

function parseDateValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const dotMatch = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotMatch) {
    const [, dd, mm, yyyy] = dotMatch;
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(`${raw}T00:00:00Z`);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function diffDays(fromDate, toDate) {
  const ms = toDate.getTime() - fromDate.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function getDocumentTitle(ast, filePath) {
  const meta = ast.meta || {};
  return String(meta.protocol || meta.title || meta.meeting_title || path.basename(filePath));
}

function analyzeDocument(filePath, today = new Date()) {
  const ast = parseFile(filePath);
  const meta = ast.meta || {};
  const tasks = Array.isArray(ast.tasks) ? ast.tasks : [];
  const openTasks = tasks.filter((task) => !task.done).length;
  const doneTasks = tasks.filter((task) => task.done).length;
  const contentImports = Object.keys(ast.imports || {}).length;
  const tagImports = Array.isArray(ast.tags_import) ? ast.tags_import.length : 0;

  const reviewDate = parseDateValue(meta.review_date);
  const validUntil = parseDateValue(meta.valid_until);

  const missing = [];
  for (const key of ["author", "version", "record_id", "status"]) {
    if (!meta[key]) missing.push(key);
  }

  return {
    path: filePath,
    file: path.basename(filePath),
    title: getDocumentTitle(ast, filePath),
    meta: {
      date: meta.date || null,
      author: meta.author || null,
      version: meta.version || null,
      status: meta.status || "unspecified",
      record_id: meta.record_id || null,
      confidentiality: meta.confidentiality || null,
      effective_date: meta.effective_date || null,
      valid_until: meta.valid_until || null,
      review_date: meta.review_date || null,
    },
    stats: {
      participants: ast.participants ? Object.keys(ast.participants).length : 0,
      subjects: ast.subjects ? Object.keys(ast.subjects).length : 0,
      tags: ast.tags ? Object.keys(ast.tags).length : 0,
      tasks_total: tasks.length,
      tasks_open: openTasks,
      tasks_done: doneTasks,
      notes: Array.isArray(ast.notes) ? ast.notes.length : 0,
      meeting_lines: Array.isArray(ast.meeting) ? ast.meeting.length : 0,
      imports: contentImports,
      tag_imports: tagImports,
    },
    governance: {
      missing,
      expired: Boolean(validUntil && validUntil < today),
      review_due_days: reviewDate ? diffDays(today, reviewDate) : null,
      has_open_tasks: openTasks > 0,
    },
  };
}

function isRegisterRelevant(doc) {
  return Boolean(
    doc.stats.tasks_total ||
    doc.stats.meeting_lines ||
    doc.stats.participants ||
    doc.stats.subjects ||
    doc.stats.notes ||
    doc.stats.imports ||
    doc.meta.record_id ||
    doc.meta.author ||
    doc.meta.version ||
    (doc.meta.status && doc.meta.status !== "unspecified") ||
    doc.meta.review_date ||
    doc.meta.valid_until ||
    doc.meta.confidentiality
  );
}

function summarizeRegister(documents) {
  const statusSummary = {};
  let missingRecordId = 0;
  let missingVersion = 0;
  let missingAuthor = 0;
  let missingStatus = 0;
  let pastValidUntil = 0;
  let reviewDueSoon = 0;
  let withOpenTasks = 0;

  for (const doc of documents) {
    const status = doc.meta.status || "unspecified";
    statusSummary[status] = (statusSummary[status] || 0) + 1;

    if (!doc.meta.record_id) missingRecordId += 1;
    if (!doc.meta.version) missingVersion += 1;
    if (!doc.meta.author) missingAuthor += 1;
    if (!doc.meta.status || doc.meta.status === "unspecified") missingStatus += 1;
    if (doc.governance.expired) pastValidUntil += 1;
    if (doc.governance.review_due_days != null && doc.governance.review_due_days >= 0 && doc.governance.review_due_days <= 30) {
      reviewDueSoon += 1;
    }
    if (doc.governance.has_open_tasks) withOpenTasks += 1;
  }

  return {
    total_files: documents.length,
    status_summary: statusSummary,
    attention: {
      missing_record_id: missingRecordId,
      missing_version: missingVersion,
      missing_author: missingAuthor,
      missing_status: missingStatus,
      expired_documents: pastValidUntil,
      review_due_soon: reviewDueSoon,
      documents_with_open_tasks: withOpenTasks,
    },
  };
}

function analyzeRegister(dirPath) {
  const fullPath = path.resolve(dirPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Directory not found: ${fullPath}`);
  }

  const files = walkPmlFiles(fullPath);
  const today = new Date();
  const documents = files
    .map((file) => analyzeDocument(file, today))
    .filter(isRegisterRelevant);
  const summary = summarizeRegister(documents);

  return {
    path: fullPath,
    title: `ProtoML Register - ${path.basename(fullPath)}`,
    generated_at: new Date().toISOString(),
    summary,
    documents,
  };
}

function formatDocumentLine(doc, indent = "") {
  const id = doc.meta.record_id || "(no record_id)";
  const bits = [
    `status=${doc.meta.status || "unspecified"}`,
    doc.meta.author ? `author=${doc.meta.author}` : "author=(missing)",
    doc.meta.version ? `version=${doc.meta.version}` : "version=(missing)",
  ];
  if (doc.meta.review_date) bits.push(`review_date=${doc.meta.review_date}`);
  if (doc.meta.valid_until) bits.push(`valid_until=${doc.meta.valid_until}`);
  if (doc.stats.tasks_open) bits.push(`open_tasks=${doc.stats.tasks_open}`);

  return [
    `${indent}- ${id} | ${doc.title}`,
    `${indent}  ${bits.join(" | ")}`,
    `${indent}  path=${doc.path}`,
  ].join("\n");
}

function formatRegister(report, verbosity = 0) {
  const lines = [];
  lines.push(`Register: ${report.path}`);
  lines.push(`Files scanned: ${report.summary.total_files}`);
  lines.push("");
  lines.push("Attention:");
  lines.push(`- ${report.summary.attention.missing_record_id} documents without record_id`);
  lines.push(`- ${report.summary.attention.missing_version} documents without version`);
  lines.push(`- ${report.summary.attention.missing_author} documents without author`);
  lines.push(`- ${report.summary.attention.missing_status} documents without status`);
  lines.push(`- ${report.summary.attention.expired_documents} documents past valid_until`);
  lines.push(`- ${report.summary.attention.review_due_soon} documents due for review in the next 30 days`);
  lines.push(`- ${report.summary.attention.documents_with_open_tasks} documents with open tasks`);
  lines.push("");
  lines.push("Status summary:");
  for (const [status, count] of Object.entries(report.summary.status_summary)) {
    lines.push(`- ${status}: ${count}`);
  }

  const dueSoon = report.documents.filter((doc) =>
    doc.governance.review_due_days != null &&
    doc.governance.review_due_days >= 0 &&
    doc.governance.review_due_days <= 30
  );
  if (dueSoon.length) {
    lines.push("");
    lines.push("Review due soon:");
    for (const doc of dueSoon) {
      lines.push(`- ${(doc.meta.record_id || doc.file)} | ${doc.title} | review_date=${doc.meta.review_date}`);
    }
  }

  const expired = report.documents.filter((doc) => doc.governance.expired);
  if (expired.length) {
    lines.push("");
    lines.push("Expired:");
    for (const doc of expired) {
      lines.push(`- ${(doc.meta.record_id || doc.file)} | ${doc.title} | valid_until=${doc.meta.valid_until}`);
    }
  }

  const incomplete = report.documents.filter((doc) => doc.governance.missing.length);
  if (incomplete.length) {
    lines.push("");
    lines.push("Incomplete metadata:");
    for (const doc of incomplete) {
      lines.push(`- ${doc.file} | missing: ${doc.governance.missing.join(", ")}`);
    }
  }

  if (verbosity >= 1) {
    lines.push("");
    lines.push("Documents:");
    for (const doc of report.documents) {
      lines.push(formatDocumentLine(doc));
    }
  }

  if (verbosity >= 2) {
    const openTaskDocs = report.documents.filter((doc) => doc.stats.tasks_open > 0);
    if (openTaskDocs.length) {
      lines.push("");
      lines.push("Open task summary:");
      for (const doc of openTaskDocs) {
        lines.push(`- ${doc.file} | open_tasks=${doc.stats.tasks_open}`);
      }
    }
  }

  if (verbosity >= 3) {
    lines.push("");
    lines.push("Detailed stats:");
    for (const doc of report.documents) {
      lines.push(`- ${doc.file}: participants=${doc.stats.participants}, subjects=${doc.stats.subjects}, tags=${doc.stats.tags}, tasks_total=${doc.stats.tasks_total}, notes=${doc.stats.notes}, imports=${doc.stats.imports}, tag_imports=${doc.stats.tag_imports}`);
    }
  }

  return lines.join("\n");
}

function renderRegisterJSON(report) {
  return JSON.stringify(report, null, 2);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

function renderRegisterHTML(report) {
  const attention = report.summary.attention;
  const statusCards = Object.entries(report.summary.status_summary).map(([status, count]) =>
    `<article class="card"><strong>${escapeHtml(status)}</strong><span>${count}</span></article>`
  ).join("");

  const docs = report.documents.map((doc) => {
    const missing = doc.governance.missing.length
      ? `<div class="meta missing">missing: ${escapeHtml(doc.governance.missing.join(", "))}</div>`
      : "";
    const flags = [
      doc.governance.expired ? "expired" : null,
      doc.governance.review_due_days != null && doc.governance.review_due_days >= 0 && doc.governance.review_due_days <= 30 ? "review due soon" : null,
      doc.stats.tasks_open ? `open tasks: ${doc.stats.tasks_open}` : null,
    ].filter(Boolean).join(" • ");

    return `<article class="doc-card">
      <h3>${escapeHtml(doc.title)}</h3>
      <div class="meta"><code>${escapeHtml(doc.meta.record_id || "(no record_id)")}</code></div>
      <div class="meta">status=${escapeHtml(doc.meta.status || "unspecified")} • author=${escapeHtml(doc.meta.author || "(missing)")} • version=${escapeHtml(doc.meta.version || "(missing)")}</div>
      <div class="meta">review_date=${escapeHtml(doc.meta.review_date || "-")} • valid_until=${escapeHtml(doc.meta.valid_until || "-")}</div>
      ${flags ? `<div class="meta flag">${escapeHtml(flags)}</div>` : ""}
      ${missing}
      <div class="path"><code>${escapeHtml(doc.path)}</code></div>
    </article>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(report.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #fff; color: #222; margin: 0; padding: 2rem; max-width: 1100px; margin-inline: auto; }
    h1 { font-size: 2rem; margin-bottom: 1rem; border-bottom: 2px solid #ddd; padding-bottom: 0.5rem; }
    h2 { margin-top: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; }
    .card, .doc-card { border: 1px solid #ddd; border-radius: 10px; padding: 0.9rem 1rem; background: #fafafa; }
    .card span { display: block; font-size: 1.4rem; margin-top: 0.3rem; }
    .attention li { margin-bottom: 0.35rem; }
    .meta { color: #555; font-size: 0.92rem; margin-top: 0.3rem; }
    .missing { color: #8a5a00; font-weight: 600; }
    .flag { color: #b00020; font-weight: 600; }
    .path { margin-top: 0.6rem; }
    code { background: #f0f0f0; padding: 0.12rem 0.28rem; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(report.title)}</h1>
  <p><code>${escapeHtml(report.path)}</code></p>
  <section>
    <h2>Attention</h2>
    <ul class="attention">
      <li>${attention.missing_record_id} documents without record_id</li>
      <li>${attention.missing_version} documents without version</li>
      <li>${attention.missing_author} documents without author</li>
      <li>${attention.missing_status} documents without status</li>
      <li>${attention.expired_documents} documents past valid_until</li>
      <li>${attention.review_due_soon} documents due for review in the next 30 days</li>
      <li>${attention.documents_with_open_tasks} documents with open tasks</li>
    </ul>
  </section>
  <section>
    <h2>Status Summary</h2>
    <div class="grid">${statusCards}</div>
  </section>
  <section>
    <h2>Documents</h2>
    <div class="grid">${docs}</div>
  </section>
</body>
</html>`;
}

function renderRegisterPDF(report) {
  const html = renderRegisterHTML(report);
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
  analyzeRegister,
  formatRegister,
  renderRegisterJSON,
  renderRegisterHTML,
  renderRegisterPDF,
};
