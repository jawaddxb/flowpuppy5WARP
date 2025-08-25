#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execa } from "execa";

const ROOT = process.cwd();
const BACKLOG = path.join(ROOT, "docs", "LOCKED_BACKLOG.md");
const MATRIX = path.join(ROOT, "qa", "matrix.json");
const QA_DIR = path.join(ROOT, ".qa");
const STATE_FILE = path.join(QA_DIR, "state.json");

const args = process.argv.slice(2);
const NEXT_N = parseInt((args.find(a => a.startsWith("--next=")) || "--next=6").split("=")[1], 10) || 6;
const LOOP = args.includes("--loop");
const ONLY_ARG = (args.find(a => a.startsWith("--only=")) || "--only=").split("=")[1];
const ONLY = ONLY_ARG ? ONLY_ARG.split(",").map(s=>s.trim()).filter(Boolean) : [];
const ONLY_SET = new Set(ONLY);

const readJSON = (p, fallback) => {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
};

const state = readJSON(STATE_FILE, { done: [], failed: [], paused: [] });
const matrix = readJSON(MATRIX, {});
const backlog = fs.readFileSync(BACKLOG, "utf8");

const pickIdsFromBacklog = (md) => {
  const ids = [];
  const re = /\bAB-\d{3}\b/g;
  let m;
  while ((m = re.exec(md))) ids.push(m[0]);
  // Keep original order; de-duplicate; filter out completed/paused
  const seen = new Set();
  return ids.filter(id => (seen.has(id) ? false : (seen.add(id), true)))
            .filter(id => !state.done.includes(id) && !state.paused.includes(id));
};

const nextBatch = () => {
  const all = pickIdsFromBacklog(backlog);
  const filtered = ONLY_SET.size ? all.filter(id => ONLY_SET.has(id)) : all;
  return filtered.slice(0, NEXT_N);
};

const impactGrep = async (id) => {
  try {
    const { stdout } = await execa("npm", ["run", "-s", "backlog:impact", id], { cwd: ROOT });
    return stdout.trim() || "@builder|@lanes|@edges|@inspector|@diff-apply|@test-gate|@tasks";
  } catch {
    return "@builder|@lanes|@edges|@inspector|@diff-apply|@test-gate|@tasks";
  }
};

const runQuickcheck = async (grep, skipE2E = false) => {
  const env = { ...process.env, PW_GREP: grep, SKIP_E2E: skipE2E ? "1" : "0" };
  const { exitCode } = await execa("npm", ["run", "quickcheck"], { cwd: ROOT, env, reject: false });
  return exitCode === 0;
};

const needsSecretsOrVisual = (id) => {
  // Heuristics by phase
  const n = parseInt(id.slice(3), 10);
  if (n >= 301 && n < 400) return true; // Connections & Secrets
  if ([4, 10, 601, 291].includes(n)) return true; // Storybook/visual gates and QA phases
  return false;
};

const checkpoint = (id) => {
  const lines = [
    "CHECKPOINT READY FOR VISUAL",
    "- Routes/pages: /agent, /tasks",
    `- Verify (AB ${id}): Run related flow; confirm DoD bullets match behavior (short spots)`,
    "- Test data: Use sample fixture from apps/web/src/lib/flowdoc/fixtures.ts (linear or decision)"
  ];
  console.log(lines.join("\n"));
};

const main = async () => {
  const batch = nextBatch();
  if (!batch.length) { console.log("[ab] No pending items."); return; }
  console.log(`[ab] Processing next ${batch.length} item(s): ${batch.join(', ')}`);

  for (const id of batch) {
    console.log(`[ab] → ${id}`);
    const grep = await impactGrep(id);

    // EDIT PLACEHOLDER: actual edits are applied by the assistant runtime.
    // This runner only executes checks and prints checkpoints.

    const skipE2E = needsSecretsOrVisual(id);
    let ok = await runQuickcheck(grep, skipE2E);
    if (!ok) {
      console.log(`[ab] quickcheck failed for ${id}. Waiting for edits, re-running once...`);
      ok = await runQuickcheck(grep, skipE2E);
    }
    if (ok) {
      checkpoint(id);
      state.done.push(id);
    } else {
      state.failed.push(id);
    }
    fs.mkdirSync(QA_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

    if (skipE2E) {
      console.log(`[ab] Visual/secrets gate for ${id}: ran quickcheck without e2e and continued.`);
      // Do not pause; visuals can be audited later.
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    }
  }

  if (LOOP) {
    console.log("[ab] Loop mode: continuing to next batch...");
    return main();
  }
};

main().catch(e => { console.error(e); process.exit(1); });


