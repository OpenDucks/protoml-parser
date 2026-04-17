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
        if (val.startsWith("@@e=")) {
          const id = val.slice(5);
          return ast.subjects?.[id]
            || ast.participants?.[id]?.name
            || ast.tags?.[id]
            || id;
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
    ast.meeting = ast.meeting
      .map((line) => {
        const echoMatches = [...String(line).matchAll(/@@e=([^\s]+)/g)];
        let resolved = String(line);

        for (const match of echoMatches) {
          const id = match[1];
          let replacement = id;

          if (ast.subjects?.[id]) {
            replacement = ast.subjects[id];
          } else if (ast.participants?.[id]) {
            replacement = ast.participants[id].name;
          } else if (ast.tags?.[id]) {
            replacement = ast.tags[id];
          } else if (options.strict) {
            throw new Error(`@@e=${id} not found`);
          }

          resolved = resolved.replace(match[0], replacement);
        }

        return resolved;
      });
    ast.meeting = expandMacros(ast.meeting);
  }

  computeTagStats();

  return ast;
}



module.exports = {resolveReferences};
