function slugifyHeading(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z0-9#]+;/gi, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

function collectMeetingHeadings(lines, maxLevel = 6) {
  const headings = [];
  const seenIds = new Map();

  for (const line of lines || []) {
    const match = String(line).match(/^(#{1,6})\s+(.*)$/);
    if (!match) continue;

    const level = match[1].length;
    if (level > maxLevel) continue;

    const text = match[2].trim();
    const baseId = slugifyHeading(text);
    const count = seenIds.get(baseId) || 0;
    seenIds.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

    headings.push({ level, text, id });
  }

  return headings;
}

module.exports = {
  slugifyHeading,
  collectMeetingHeadings,
};
