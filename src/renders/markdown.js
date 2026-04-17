const {
  convertHtmlToMarkdown,
  isProbablyHtml,
  renderStructuredReference,
  renderTemplate,
  stripHtml,
} = require("./renderUtils");

function formatKeyValueList(items) {
  return items.map(([key, value]) => `- **${key}:** ${stripHtml(value)}`).join("\n");
}

function renderObjectSection(lines, title) {
  if (!lines.length) return [];
  return [`## ${title}`, ...lines, ""];
}

function renderMeetingLine(line) {
  const source = String(line || "");
  if (!source.trim()) return "";
  return isProbablyHtml(source) ? convertHtmlToMarkdown(source) : stripHtml(source);
}

function renderMarkdown(ast) {
  const lines = [];
  const title = renderTemplate(
    ast.meta?.protocol || "Protocol - {{date}}",
    { ...(ast.meta || {}), date: ast.meta?.date || "Untitled" }
  );
  const meetingTitle = renderTemplate(
    ast.meta?.meeting_title || "Rendered Meeting",
    ast.meta || {}
  );

  lines.push(`# ${stripHtml(title)}`);
  lines.push("");

  const metaEntries = Object.entries(ast.meta || {}).filter(([key]) =>
    !["protocol", "meeting_title", "title"].includes(key)
  );

  if (metaEntries.length) {
    lines.push("## Meta");
    lines.push(formatKeyValueList(metaEntries));
    lines.push("");
  }

  if (ast.participants && Object.keys(ast.participants).length) {
    lines.push("## Participants");
    for (const [, participant] of Object.entries(ast.participants)) {
      const alias = participant.alias ? ` (${participant.alias})` : "";
      const email = participant.email ? ` - ${participant.email}` : "";
      lines.push(`- ${participant.name}${alias}${email}`);
    }
    lines.push("");
  }

  if (ast.subjects && Object.keys(ast.subjects).length) {
    lines.push("## Subjects");
    for (const [id, subject] of Object.entries(ast.subjects)) {
      lines.push(`- ${id}: ${stripHtml(subject)}`);
    }
    lines.push("");
  }

  if (ast.tag_stats && Object.keys(ast.tag_stats).length) {
    lines.push("## Tags");
    for (const [id, stat] of Object.entries(ast.tag_stats)) {
      lines.push(`- ${id}: ${stripHtml(stat.label)} (total=${stat.total}, open=${stat.open}, done=${stat.done})`);
    }
    lines.push("");
  }

  if (ast.signatures && Object.keys(ast.signatures).length) {
    lines.push(...renderObjectSection(
      Object.entries(ast.signatures).map(([id, signature]) => {
        const parts = [signature.name, signature.role, signature.date].filter(Boolean);
        const notes = signature.note ? ` - ${stripHtml(signature.note)}` : "";
        return `- ${id}: ${parts.join(" | ")}${notes}`;
      }),
      "Signatures"
    ));
  }

  if (ast.approvals && Object.keys(ast.approvals).length) {
    lines.push(...renderObjectSection(
      Object.entries(ast.approvals).map(([id, approval]) => {
        const parts = [approval.label, approval.status, approval.by, approval.date].filter(Boolean);
        const notes = approval.notes ? ` - ${stripHtml(approval.notes)}` : "";
        return `- ${id}: ${parts.join(" | ")}${notes}`;
      }),
      "Approvals"
    ));
  }

  if (Array.isArray(ast.tasks) && ast.tasks.length) {
    lines.push("## Tasks");
    for (const task of ast.tasks) {
      const marker = task.done ? "[x]" : "[ ]";
      const meta = [];

      if (task.assigned_to?.name) meta.push(`assigned=${task.assigned_to.name}`);
      if (task.subject?.label) meta.push(`subject=${stripHtml(task.subject.label)}`);
      if (task.tag?.label) meta.push(`tag=${stripHtml(task.tag.label)}`);

      lines.push(`- ${marker} ${stripHtml(task.text)}`);
      if (meta.length) {
        lines.push(`  - ${meta.join(" | ")}`);
      }
    }
    lines.push("");
  }

  if (Array.isArray(ast.notes) && ast.notes.length) {
    lines.push("## Notes");
    for (const note of ast.notes) {
      lines.push(`- ${stripHtml(note)}`);
    }
    lines.push("");
  }

  if (Array.isArray(ast.references) && ast.references.length) {
    lines.push("## References");
    for (const entry of ast.references) {
      lines.push(`- ${renderStructuredReference(entry, true)}`);
    }
    lines.push("");
  }

  if (Array.isArray(ast.attachments) && ast.attachments.length) {
    lines.push("## Attachments");
    for (const entry of ast.attachments) {
      lines.push(`- ${renderStructuredReference(entry, true)}`);
    }
    lines.push("");
  }

  if (Array.isArray(ast.meeting) && ast.meeting.length) {
    lines.push(`## ${stripHtml(meetingTitle)}`);
    lines.push("");
    for (const line of ast.meeting) {
      const text = renderMeetingLine(line);
      if (!text) {
        lines.push("");
        continue;
      }
      lines.push(text);
      if (!text.startsWith("#") && !text.startsWith("- ") && !text.startsWith("> ")) {
        lines.push("");
      }
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

module.exports = renderMarkdown;
