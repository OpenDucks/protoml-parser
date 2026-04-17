const fs = require("fs");
const path = require("path");

function loadTheme(themeName, skip = 0) {
  if (skip) {
    return "";
  }
  const themePath = path.join(
    __dirname,
    "./themes",
    `${themeName || "default"}.css`
  );
  try {
    return fs.readFileSync(themePath, "utf8");
  } catch (err) {
    console.warn(`Theme "${themeName}" not found. Using default.`);
    return fs.readFileSync(
      path.join(__dirname, "./themes/default.css"),
      "utf8"
    );
  }
}

function escape(text) {
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

function renderTemplate(template, context = {}) {
  return String(template).replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const normalizedKey = String(key).trim();
    return context[normalizedKey] ?? "";
  });
}

function toCssIdentifier(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function renderHTML(ast, options = {}) {
  const css = loadTheme(options.theme, options.skipTheme);
  const protocolTitle = renderTemplate(
    ast.meta?.protocol || "Protocol - {{date}}",
    {
      ...(ast.meta || {}),
      date: ast.meta?.date || "Untitled",
    }
  );
  const meetingTitle = renderTemplate(
    ast.meta?.meeting_title || "Rendered Meeting",
    ast.meta || {}
  );

  const html = [];

  html.push(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escape(protocolTitle)}</title>
  <style>${css}</style>
</head>
<body>`);

  html.push(`<h1>${escape(protocolTitle)}</h1>`);

  if (ast.participants) {
    html.push(`<section><h2>Participants</h2><ul>`);
    for (const id in ast.participants) {
      const p = ast.participants[id];
      html.push(`<li>${escape(p.name)} (${escape(p.alias || id)})</li>`);
    }
    html.push(`</ul></section>`);
  }

  if (ast.subjects) {
    html.push(`<section><h2>Subjects</h2><ul>`);
    for (const id in ast.subjects) {
      html.push(`<li><b>${id}:</b> ${ast.subjects[id]}</li>`);
    }
    html.push(`</ul></section>`);
  }

  if (ast.tag_stats && Object.keys(ast.tag_stats).length) {
    html.push(`<section><h2>Tags</h2><div class="tag-summary">`);
    for (const id in ast.tag_stats) {
      const stat = ast.tag_stats[id];
      const tagClass = toCssIdentifier(id);
      html.push(
        `<article class="tag-card tag-${tagClass}">` +
        `<div class="tag-card-head"><span class="tag">${escape(stat.label)}</span><code>@tag=${escape(id)}</code></div>` +
        `<div class="tag-card-stats">` +
        `<span>Total: ${stat.total}</span>` +
        `<span>Open: ${stat.open}</span>` +
        `<span>Done: ${stat.done}</span>` +
        `</div>` +
        `</article>`
      );
    }
    html.push(`</div></section>`);
  }

  if (ast.tasks?.length) {
    html.push(`<section><h2>Tasks</h2><ul>`);
    for (const task of ast.tasks) {
      const cls = [
        task.done ? "done" : "",
        task.meta?.tag ? `task-tag-${toCssIdentifier(task.meta.tag)}` : "",
      ].filter(Boolean).join(" ");
      let extra = [];

      if (task.meta?.ptp && ast.participants?.[task.meta.ptp]) {
        const p = ast.participants[task.meta.ptp];
        extra.push(`Assigned to: ${escape(p.name)}`);
      }

      if (task.meta?.subject && ast.subjects?.[task.meta.subject]) {
        extra.push(
          `Subject: ${escape(ast.subjects[task.meta.subject])}`
        );
      }

      if (task.meta?.tag && ast.tags?.[task.meta.tag]) {
        extra.push(
          `Tag: <span class="tag">${escape(ast.tags[task.meta.tag])}</span>`
        );
      }

      const metaInfo = extra.length
        ? `<div class="meta">${extra.join(" • ")}</div>`
        : "";

      html.push(`<li class="${cls}">${task.text}${metaInfo}</li>`);
    }
    html.push(`</ul></section>`);
  }

  if (ast.notes?.length) {
    html.push(`<section><h2>Notes</h2><ul>`);
    for (const note of ast.notes) {
      html.push(`<li>${note}</li>`);
    }
    html.push(`</ul></section>`);
  }

  if (ast.meeting?.length) {
    html.push(`<section><h2>${escape(meetingTitle)}</h2>`);
    for (const line of ast.meeting) {
      const trimmed = String(line).trim();
      if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
        html.push(line);
      } else {
        html.push(`<p>${line}</p>`);
      }
    }
    html.push(`</section>`);
  }

  html.push(`</body></html>`);
  return html.join("\n");
}

module.exports = renderHTML;
