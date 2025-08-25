#!/usr/bin/env node
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SPEC = path.join(ROOT, "docs", "agent-build-master.md");
const BACKLOG = path.join(ROOT, "docs", "LOCKED_BACKLOG.md");
const MATRIX_DIR = path.join(ROOT, "qa");
const MATRIX = path.join(MATRIX_DIR, "matrix.json");

const spec = fs.readFileSync(SPEC, "utf8");

const lines = spec.split("\n");
const anchors = [];
let currentSection = "Unsectioned";

for (let i = 0; i < lines.length; i++) {
  const L = lines[i];
  const h = L.match(/^#{2,3}\s+(.+?)\s*(<!--.*)?$/);
  if (h) currentSection = h[1].trim();

  const m = L.match(/<!--\s*([^>]+)\s*-->/);
  if (!m) continue;
  const tokens = m[1].trim().split(/\s+/);
  const ids = tokens.filter(t => /^AB-\d{3}$/.test(t));
  const tags = tokens.filter(t => /^@/.test(t));
  ids.forEach(id => anchors.push({ id, tags, section: currentSection }));
}

const matrix = {};
anchors.forEach(a => { matrix[a.id] = Array.from(new Set([...(matrix[a.id]||[]), ...a.tags])); });

fs.mkdirSync(MATRIX_DIR, { recursive: true });
fs.writeFileSync(MATRIX, JSON.stringify(matrix, null, 2));
console.log(`[sync] wrote ${MATRIX}`);

let backlog = fs.existsSync(BACKLOG) ? fs.readFileSync(BACKLOG, "utf8") : "# Backlog (LOCKED)\n\n";
const begin = "<!-- AUTO:AB_INDEX:BEGIN -->";
const end   = "<!-- AUTO:AB_INDEX:END -->";

const grouped = anchors.reduce((acc, a) => {
  acc[a.section] = acc[a.section] || [];
  acc[a.section].push(a);
  return acc;
}, {});

let indexMd = "### Auto-generated Index\n\n";
Object.keys(grouped).forEach(section => {
  indexMd += `- **${section}**\n`;
  grouped[section].forEach(a => {
    const tagStr = (a.tags && a.tags.length) ? ` — tags: ${a.tags.join(" ")}` : "";
    indexMd += `  - ${a.id}${tagStr}\n`;
  });
});
const block = `${begin}\n${indexMd}\n${end}`;

if (backlog.includes(begin) && backlog.includes(end)) {
  backlog = backlog.replace(new RegExp(`${begin}[\\s\\S]*?${end}`), block);
} else {
  backlog += `\n${block}\n`;
}
fs.writeFileSync(BACKLOG, backlog);
console.log(`[sync] updated ${BACKLOG}`);
console.log("[sync] done");
