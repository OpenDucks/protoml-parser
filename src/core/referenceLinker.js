const { collectMeetingHeadings } = require("./headingUtils");

function resolveReferences(ast, options = {}) {
  const get = (group, id) => {
    if (!ast[group] || !ast[group][id]) {
      if (options.strict)
        throw new Error(`Unresolved reference @${group}=${id}`);
      return { id, unresolved: true };
    }

    const value = ast[group][id];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return { id, ...value };
    }

    return { id, label: value };
  };

  const groupAliases = {
    participant: "participants",
    participants: "participants",
    subject: "subjects",
    subjects: "subjects",
    tag: "tags",
    tags: "tags",
    meta: "meta",
    signature: "signatures",
    signatures: "signatures",
    approval: "approvals",
    approvals: "approvals",
  };

  const resolveMetaValue = (key) => {
    if (ast.meta?.[key] != null) {
      return ast.meta[key];
    }
    if (options.strict) {
      throw new Error(`@@ref=meta:${key} not found`);
    }
    return key;
  };

  const resolveStructuredReference = (expression) => {
    const parts = String(expression || "").split(":").map((part) => part.trim()).filter(Boolean);
    if (!parts.length) {
      return expression;
    }

    const group = groupAliases[parts[0]] || parts[0];

    if (group === "meta") {
      return resolveMetaValue(parts[1]);
    }

    const id = parts[1];
    const field = parts[2];

    if (!id) {
      return expression;
    }

    const target = ast[group]?.[id];
    if (target == null) {
      if (options.strict) {
        throw new Error(`@@ref=${expression} not found`);
      }
      return expression;
    }

    if (field) {
      if (target && typeof target === "object" && target[field] != null) {
        return target[field];
      }
      if (field === "id") {
        return id;
      }
      if (!field && typeof target !== "object") {
        return target;
      }
      if (options.strict) {
        throw new Error(`@@ref=${expression} field not found`);
      }
      return expression;
    }

    if (typeof target === "object") {
      return target.label || target.name || target.title || target.status || target.role || id;
    }

    return target;
  };

  const replaceInlineReferences = (line) => {
    let resolved = String(line);

    resolved = resolved.replace(/@@ref=([A-Za-z0-9_:-]+)/g, (_, expression) => {
      return resolveStructuredReference(expression);
    });

    resolved = resolved.replace(/@@e=([A-Za-z0-9_-]+)/g, (_, id) => {
      if (ast.subjects?.[id]) {
        return ast.subjects[id];
      }
      if (ast.participants?.[id]) {
        return ast.participants[id].name;
      }
      if (ast.tags?.[id]) {
        return ast.tags[id];
      }
      if (options.strict) {
        throw new Error(`@@e=${id} not found`);
      }
      return id;
    });

    return resolved;
  };

  const renderSignature = (id) => {
    const signature = ast.signatures?.[id];
    if (!signature) {
      if (options.strict) {
        throw new Error(`@@signature=${id} not found`);
      }
      return `@@signature=${id}`;
    }

    const parts = [
      signature.name ? `<strong>${signature.name}</strong>` : "",
      signature.role ? `<span class="signature-role">${signature.role}</span>` : "",
      signature.date ? `<span class="signature-date">${signature.date}</span>` : "",
      signature.note ? `<span class="signature-note">${signature.note}</span>` : "",
    ].filter(Boolean).join("<br>");

    return `<div class="signature-block"><h3>Signature</h3>${parts}</div>`;
  };

  const renderApproval = (id) => {
    const approval = ast.approvals?.[id];
    if (!approval) {
      if (options.strict) {
        throw new Error(`@@approval=${id} not found`);
      }
      return `@@approval=${id}`;
    }

    const parts = [
      approval.label ? `<strong>${approval.label}</strong>` : "",
      approval.status ? `<span class="approval-status">${approval.status}</span>` : "",
      approval.by ? `<span class="approval-by">${approval.by}</span>` : "",
      approval.date ? `<span class="approval-date">${approval.date}</span>` : "",
      approval.notes ? `<span class="approval-notes">${approval.notes}</span>` : "",
    ].filter(Boolean).join("<br>");

    return `<div class="approval-block"><h3>Approval</h3>${parts}</div>`;
  };

  const renderToc = (block, maxLevel = 3) => {
    const headings = collectMeetingHeadings(block, maxLevel);
    if (!headings.length) {
      return `<nav class="toc"><strong>Table of Contents</strong><p class="toc-empty">(no headings)</p></nav>`;
    }

    const items = headings
      .map((heading) => `<li class="toc-level-${heading.level}"><a href="#${heading.id}">${heading.text}</a></li>`)
      .join("");

    return `<nav class="toc"><strong>Table of Contents</strong><ul>${items}</ul></nav>`;
  };

  const resolveImportedContent = (name) => {
    const entry = ast._importCache?.[name];
    if (!entry) {
      if (options.strict) {
        throw new Error(`@@import=${name} not found`);
      }
      return null;
    }
    return entry.content;
  };

  const expandMacros = (block) => {
    return block.flatMap((line) => {
      const match = line.match(/@@macro=([\w-]+):(.*)/);
      if (!match || !ast._macroCache) return [line];

      const [_, macroName, rawParams] = match;
      const template = ast._macroCache[macroName];
      if (!template) return [line];

      const params = {};
      rawParams.split(";").forEach((p) => {
        const [k, v] = p.split("=");
        params[k.trim()] = v.trim();
      });

      const rendered = template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
        const val = params[key] || "";
        if (val.startsWith("@@e=") || val.startsWith("@@ref=")) {
          return replaceInlineReferences(val);
        }
        return val;
      });

      return [rendered];
    });
  };

  const expandImports = (block) => {
    return block.flatMap((line) => {
      const match = line.match(/^@@(?:import|output)=([^\s]+)$/);
      if (!match) return [line];

      const content = resolveImportedContent(match[1]);
      if (content == null) return [line];

      if (Array.isArray(content)) return content;
      return content.split(/\r?\n/);
    });
  };

  const expandMeetingCommands = (block) => {
    return block.map((line) => {
      const trimmed = String(line).trim();

      const tocMatch = trimmed.match(/^@@toc(?:=(\d+))?$/);
      if (tocMatch) {
        return renderToc(block, Number(tocMatch[1] || 3));
      }

      const signatureMatch = trimmed.match(/^@@signature=([A-Za-z0-9_-]+)$/);
      if (signatureMatch) {
        return renderSignature(signatureMatch[1]);
      }

      const approvalMatch = trimmed.match(/^@@approval=([A-Za-z0-9_-]+)$/);
      if (approvalMatch) {
        return renderApproval(approvalMatch[1]);
      }

      return replaceInlineReferences(line);
    });
  };

  const computeTagStats = () => {
    if (!ast.tags) return;

    const stats = {};
    for (const id in ast.tags) {
      stats[id] = {
        id,
        label: ast.tags[id],
        total: 0,
        open: 0,
        done: 0,
      };
    }

    if (Array.isArray(ast.tasks)) {
      for (const task of ast.tasks) {
        const tagId = task.meta?.tag;
        if (!tagId) continue;

        if (!stats[tagId]) {
          stats[tagId] = {
            id: tagId,
            label: ast.tags?.[tagId] || tagId,
            total: 0,
            open: 0,
            done: 0,
          };
        }

        stats[tagId].total += 1;
        if (task.done) stats[tagId].done += 1;
        else stats[tagId].open += 1;
      }
    }

    ast.tag_stats = stats;
  };

  if (Array.isArray(ast.tasks)) {
    ast.tasks = ast.tasks.map((task) => {
      const out = { ...task };

      const ptpMatch = task.raw.match(/@ptp=([^\s]+)/);
      const subjMatch = [...task.raw.matchAll(/(?:\s|^)=([^\s]+)/g)].pop();
      const tagMatch = task.raw.match(/@tag=([^\s]+)/);

      if (ptpMatch) out.assigned_to = get("participants", ptpMatch[1]);
      if (subjMatch) out.subject = get("subjects", subjMatch[1]);
      if (tagMatch) out.tag = get("tags", tagMatch[1]);

      return out;
    });
  }

  if (Array.isArray(ast.meeting)) {
    ast.meeting = expandImports(ast.meeting);
    ast.meeting = expandMeetingCommands(ast.meeting);
    ast.meeting = expandMacros(ast.meeting);
  }

  computeTagStats();

  return ast;
}



module.exports = {resolveReferences};
