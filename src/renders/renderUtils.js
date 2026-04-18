function decodeEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&hellip;/gi, "...")
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "-")
    .replace(/&euro;/gi, "EUR")
    .replace(/&uuml;/gi, "ü")
    .replace(/&Uuml;/gi, "Ü")
    .replace(/&ouml;/gi, "ö")
    .replace(/&Ouml;/gi, "Ö")
    .replace(/&auml;/gi, "ä")
    .replace(/&Auml;/gi, "Ä")
    .replace(/&szlig;/gi, "ß");
}

function renderTemplate(template, context = {}) {
  return String(template || "").replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const normalizedKey = String(key).trim();
    return context[normalizedKey] ?? "";
  });
}

function isTruthySetting(value) {
  const normalized = String(value == null ? "" : value).trim().toLowerCase();
  return ["1", "true", "yes", "on", "hide", "hidden"].includes(normalized);
}

function shouldHideMeta(ast, options = {}) {
  if (options.hideMeta) {
    return true;
  }

  const meta = ast?.meta || {};
  if (isTruthySetting(meta.hide_meta) || isTruthySetting(meta.hideMeta)) {
    return true;
  }

  const outputMeta = String(meta.output_meta == null ? "" : meta.output_meta).trim().toLowerCase();
  return ["hide", "hidden", "false", "none", "off"].includes(outputMeta);
}

function getVisibleMetaEntries(ast, options = {}) {
  if (shouldHideMeta(ast, options)) {
    return [];
  }

  return Object.entries(ast?.meta || {}).filter(([key]) =>
    !["protocol", "meeting_title", "title", "theme", "hide_meta", "hideMeta", "output_meta"].includes(key)
  );
}

function normalizeWhitespace(text) {
  return String(text || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function stripHtml(text) {
  return normalizeWhitespace(
    decodeEntities(
      String(text || "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/section>/gi, "\n")
        .replace(/<[^>]+>/g, "")
    )
  );
}

function convertHtmlToMarkdown(text) {
  let output = String(text || "");

  output = output
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<hr\s*\/?>/gi, "\n\n---\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, content) => {
      const clean = stripHtml(content);
      return clean ? `\n\n${"#".repeat(Number(level))} ${clean}\n\n` : "\n";
    })
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
      const cleanLabel = stripHtml(label);
      return cleanLabel ? `[${cleanLabel}](${href})` : href;
    })
    .replace(/<(b|strong)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, content) => `**${stripHtml(content)}**`)
    .replace(/<(i|em)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, content) => `*${stripHtml(content)}*`)
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
      const clean = stripHtml(content);
      if (!clean) return "";
      return `\n\n> ${clean.split("\n").join("\n> ")}\n\n`;
    })
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => {
      const clean = stripHtml(content);
      return clean ? `- ${clean}\n` : "";
    })
    .replace(/<\/?(ul|ol|nav|section|article|div|p|table|thead|tbody|tr)[^>]*>/gi, "\n")
    .replace(/<\/?(td|th)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "");

  return normalizeWhitespace(decodeEntities(output));
}

function convertHtmlToText(text) {
  let output = String(text || "");

  output = output
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<hr\s*\/?>/gi, "\n\n--------------------\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, _level, content) => {
      const clean = stripHtml(content);
      return clean ? `\n\n${clean}\n\n` : "\n";
    })
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
      const cleanLabel = stripHtml(label);
      return cleanLabel ? `${cleanLabel} -> ${href}` : href;
    })
    .replace(/<(b|strong|i|em)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, content) => stripHtml(content))
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
      const clean = stripHtml(content);
      if (!clean) return "";
      return `\n\n> ${clean.split("\n").join("\n> ")}\n\n`;
    })
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => {
      const clean = stripHtml(content);
      return clean ? `- ${clean}\n` : "";
    })
    .replace(/<\/?(ul|ol|nav|section|article|div|p|table|thead|tbody|tr)[^>]*>/gi, "\n")
    .replace(/<\/?(td|th)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "");

  return normalizeWhitespace(decodeEntities(output));
}

function isProbablyHtml(text) {
  return /<([a-z][a-z0-9-]*)(\s|>|\/)/i.test(String(text || ""));
}

function renderStructuredReference(entry, markdown = false) {
  const match = String(entry || "").match(/^(.+?)\|(.+)$/);
  if (!match) {
    return stripHtml(entry);
  }

  const label = stripHtml(match[1].trim());
  const target = match[2].trim();
  return markdown ? `[${label}](${target})` : `${label} -> ${target}`;
}

module.exports = {
  convertHtmlToMarkdown,
  convertHtmlToText,
  decodeEntities,
  isProbablyHtml,
  normalizeWhitespace,
  renderStructuredReference,
  renderTemplate,
  getVisibleMetaEntries,
  shouldHideMeta,
  stripHtml,
};
