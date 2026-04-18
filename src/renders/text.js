const {
  convertHtmlToText,
  getVisibleMetaEntries,
  isProbablyHtml,
  renderStructuredReference,
  renderTemplate,
  stripHtml,
} = require("./renderUtils");

function renderSection(title, lines) {
  if (!lines.length) return [];
  return [title, "-".repeat(title.length), ...lines, ""];
}

function renderMeetingLine(line) {
  const source = String(line || "");
  if (!source.trim()) return "";
  return isProbablyHtml(source) ? convertHtmlToText(source) : stripHtml(source);
}

function renderText(ast, options = {}) {
  const out = [];
  const title = stripHtml(
    renderTemplate(ast.meta?.protocol || "Protocol - {{date}}", {
      ...(ast.meta || {}),
      date: ast.meta?.date || "Untitled",
    })
  );
  const meetingTitle = stripHtml(
    renderTemplate(ast.meta?.meeting_title || "Rendered Meeting", ast.meta || {})
  );

  out.push(title);
  out.push("=".repeat(title.length));
  out.push("");

  const metaEntries = getVisibleMetaEntries(ast, options);
  out.push(...renderSection("Meta", metaEntries.map(([key, value]) => `${key}: ${stripHtml(value)}`)));

  if (ast.participants && Object.keys(ast.participants).length) {
    out.push(...renderSection(
      "Participants",
      Object.entries(ast.participants).map(([, participant]) => {
        const alias = participant.alias ? ` (${participant.alias})` : "";
        const email = participant.email ? ` - ${participant.email}` : "";
        return `${participant.name}${alias}${email}`;
      })
    ));
  }

  if (ast.subjects && Object.keys(ast.subjects).length) {
    out.push(...renderSection(
      "Subjects",
      Object.entries(ast.subjects).map(([id, subject]) => `${id}: ${stripHtml(subject)}`)
    ));
  }

  if (ast.tag_stats && Object.keys(ast.tag_stats).length) {
    out.push(...renderSection(
      "Tags",
      Object.entries(ast.tag_stats).map(([id, stat]) =>
        `${id}: ${stripHtml(stat.label)} (total=${stat.total}, open=${stat.open}, done=${stat.done})`
      )
    ));
  }

  if (ast.signatures && Object.keys(ast.signatures).length) {
    out.push(...renderSection(
      "Signatures",
      Object.entries(ast.signatures).map(([id, signature]) => {
        const parts = [signature.name, signature.role, signature.date].filter(Boolean);
        const notes = signature.note ? ` - ${stripHtml(signature.note)}` : "";
        return `${id}: ${parts.join(" | ")}${notes}`;
      })
    ));
  }

  if (ast.approvals && Object.keys(ast.approvals).length) {
    out.push(...renderSection(
      "Approvals",
      Object.entries(ast.approvals).map(([id, approval]) => {
        const parts = [approval.label, approval.status, approval.by, approval.date].filter(Boolean);
        const notes = approval.notes ? ` - ${stripHtml(approval.notes)}` : "";
        return `${id}: ${parts.join(" | ")}${notes}`;
      })
    ));
  }

  if (Array.isArray(ast.tasks) && ast.tasks.length) {
    const lines = [];
    for (const task of ast.tasks) {
      const marker = task.done ? "[x]" : "[ ]";
      lines.push(`${marker} ${stripHtml(task.text)}`);

      const meta = [];
      if (task.assigned_to?.name) meta.push(`assigned=${task.assigned_to.name}`);
      if (task.subject?.label) meta.push(`subject=${stripHtml(task.subject.label)}`);
      if (task.tag?.label) meta.push(`tag=${stripHtml(task.tag.label)}`);
      if (meta.length) lines.push(`  ${meta.join(" | ")}`);
    }
    out.push(...renderSection("Tasks", lines));
  }

  if (Array.isArray(ast.notes) && ast.notes.length) {
    out.push(...renderSection("Notes", ast.notes.map((note) => `- ${stripHtml(note)}`)));
  }

  if (Array.isArray(ast.references) && ast.references.length) {
    out.push(...renderSection(
      "References",
      ast.references.map((entry) => renderStructuredReference(entry, false))
    ));
  }

  if (Array.isArray(ast.attachments) && ast.attachments.length) {
    out.push(...renderSection(
      "Attachments",
      ast.attachments.map((entry) => renderStructuredReference(entry, false))
    ));
  }

  if (Array.isArray(ast.meeting) && ast.meeting.length) {
    const meetingLines = [`Title: ${meetingTitle}`, ""];
    for (const line of ast.meeting) {
      const rendered = renderMeetingLine(line);
      meetingLines.push(rendered);
      if (rendered) {
        meetingLines.push("");
      }
    }
    out.push(...renderSection("Meeting", meetingLines));
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

module.exports = renderText;
