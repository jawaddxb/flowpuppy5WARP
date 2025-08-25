#!/usr/bin/env node
import fs from "fs";
import path from "path";
import chokidar from "chokidar";
import { execa } from "execa";
import stripAnsi from "strip-ansi";

const ROOT = process.cwd();
const BACKLOG = path.join(ROOT, "docs", "LOCKED_BACKLOG.md");
const QA_DIR = path.join(ROOT, ".qa");
const OUTFILE = path.join(QA_DIR, "last.json");

const args = process.argv.slice(2);
const NEXT_N = parseInt((args.find(a => a.startsWith("--next=")) || "--next=6").split("=")[1], 10) || 6;
const LOOP = args.includes("--loop") || args.includes("--loop=true") || args.includes("--watch") || args.includes("--watch=true");
const ONLY_ARG = (args.find(a => a.startsWith("--only=")) || "--only=").split("=")[1];
const ONLY = ONLY_ARG ? ONLY_ARG.split(",").map(s=>s.trim()).filter(Boolean) : [];
const ONLY_SET = new Set(ONLY);

const GROUPS = [
  { name: "e2e:core", grep: "@lanes|@anchor-node|@decision-chips|@event-pills|@palette-templates|@smoke" },
  { name: "e2e:planner", grep: "@planner" },
  { name: "e2e:providers", grep: "@providers-registry" },
  { name: "e2e:conversational", grep: "@conversational-flow|@conversational-layout|@conversational-styling" },
];

const read = (p) => fs.readFileSync(p, "utf8");
const writeJSON = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2));

const pickIdsFromBacklog = (md) => {
  const ids = [];
  const re = /\bAB-\d{3}\b/g;
  let m;
  while ((m = re.exec(md))) ids.push(m[0]);
  const seen = new Set();
  return ids.filter(id => (seen.has(id) ? false : (seen.add(id), true)));
};

async function run(cmd, args, env = {}) {
  const t0 = Date.now();
  const { stdout = "", stderr = "", exitCode = 0 } = await execa(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, reject: false });
  const output = stripAnsi(`${stdout}\n${stderr}`);
  return { exitCode, durationMs: Date.now() - t0, output: output.slice(-20000) };
}

async function impactGrep(id) {
  try {
    const { stdout } = await execa("npm", ["run", "-s", "backlog:impact", id], { cwd: ROOT, reject: false });
    const s = (stdout || "").trim();
    return s || "@builder|@lanes|@edges|@inspector|@diff-apply|@test-gate|@tasks";
  } catch {
    return "@builder|@lanes|@edges|@inspector|@diff-apply|@test-gate|@tasks";
  }
}

function needsVisualOrPerf(id) {
  const n = parseInt(id.slice(3), 10);
  if (n >= 301 && n < 400) return false; // Connections
  if ([4, 10, 601, 602, 603].includes(n)) return true; // Storybook/QA/perf/a11y
  return false;
}

async function runPerId(id) {
  const startedAt = new Date().toISOString();
  const results = [];
  let ok = true;

  const grep = await impactGrep(id);

  // 1) Typecheck
  {
    const r = await run("npm", ["run", "typecheck"]);
    results.push({ name: `typecheck:${id}`, passed: r.exitCode === 0, exitCode: r.exitCode, durationMs: r.durationMs, output: r.output });
    ok = ok && r.exitCode === 0;
    if (!ok) return { ok, results, startedAt };
  }

  // 2) Unit
  {
    const r = await run("npm", ["run", "test"]);
    results.push({ name: `unit:${id}`, passed: r.exitCode === 0, exitCode: r.exitCode, durationMs: r.durationMs, output: r.output });
    ok = ok && r.exitCode === 0;
    if (!ok) return { ok, results, startedAt };
  }

  // 3) Targeted Playwright for the ID
  {
    const r = await run("npx", ["playwright","test","-c","apps/web/playwright.config.ts","--grep", grep, "--reporter","list"]);
    results.push({ name: `e2e:targeted:${id}`, passed: r.exitCode === 0, exitCode: r.exitCode, durationMs: r.durationMs, output: r.output });
    ok = ok && r.exitCode === 0;
    if (!ok) return { ok, results, startedAt };
  }

  // 4) Full Playwright groups
  for (const g of GROUPS) {
    const r = await run("npx", ["playwright","test","-c","apps/web/playwright.config.ts","--grep", g.grep, "--reporter","list"]);
    results.push({ name: g.name, passed: r.exitCode === 0, exitCode: r.exitCode, durationMs: r.durationMs, output: r.output });
    ok = ok && r.exitCode === 0;
    if (!ok) return { ok, results, startedAt };
  }

  // 5) Optional visual/perf/a11y gates
  if (needsVisualOrPerf(id)) {
    // Visual snapshots (if scripts exist)
    const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    if (pkgJson.scripts && pkgJson.scripts["storybook:build"]) {
      const r1 = await run("npm", ["run","storybook:build"]);
      results.push({ name: `visual:build:${id}`, passed: r1.exitCode === 0, exitCode: r1.exitCode, durationMs: r1.durationMs, output: r1.output });
      ok = ok && r1.exitCode === 0; if (!ok) return { ok, results, startedAt };
    }
    if (pkgJson.scripts && pkgJson.scripts["test:visual:snapshots"]) {
      const r2 = await run("npm", ["run","test:visual:snapshots"]);
      results.push({ name: `visual:snapshots:${id}`, passed: r2.exitCode === 0, exitCode: r2.exitCode, durationMs: r2.durationMs, output: r2.output });
      ok = ok && r2.exitCode === 0; if (!ok) return { ok, results, startedAt };
    }
    if (pkgJson.scripts && pkgJson.scripts["axe"]) {
      const r3 = await run("npm", ["run","axe"]);
      results.push({ name: `a11y:axe:${id}`, passed: r3.exitCode === 0, exitCode: r3.exitCode, durationMs: r3.durationMs, output: r3.output });
      ok = ok && r3.exitCode === 0; if (!ok) return { ok, results, startedAt };
    }
    if (pkgJson.scripts && pkgJson.scripts["perf:check"]) {
      const r4 = await run("npm", ["run","perf:check"]);
      results.push({ name: `perf:budgets:${id}`, passed: r4.exitCode === 0, exitCode: r4.exitCode, durationMs: r4.durationMs, output: r4.output });
      ok = ok && r4.exitCode === 0; if (!ok) return { ok, results, startedAt };
    }
  }

  return { ok, results, startedAt };
}

function nextBatch(ids) { return ids.slice(0, NEXT_N); }

async function main() {
  const backlog = read(BACKLOG);
  const allIds = pickIdsFromBacklog(backlog);
  const ids = ONLY_SET.size ? allIds.filter(id => ONLY_SET.has(id)) : allIds;
  const batch = nextBatch(ids);
  if (!batch.length) { console.log("[ab+qa] No AB items detected."); return; }
  console.log(`[ab+qa] Processing ${batch.length} item(s): ${batch.join(', ')}`);

  for (const id of batch) {
    console.log(`[ab+qa] → ${id}`);
    const { ok, results, startedAt } = await runPerId(id);
    const payload = {
      startedAt,
      finishedAt: new Date().toISOString(),
      ok,
      ab: id,
      results
    };
    fs.mkdirSync(QA_DIR, { recursive: true });
    writeJSON(OUTFILE, payload);
    if (!ok) {
      console.log(`[ab+qa] BLOCKER on ${id}. See ${OUTFILE}`);
      return;
    }
    console.log("CHECKPOINT READY FOR VISUAL\n- Routes/pages: /agent, /tasks, /admin/providers, /a/demo\n- Canvas: zoom ~0.9 to view lane bands\n- Left Chat: anchors/chips/pills\n- Right: Test tab (run once)\n- Tasks: open newest run\n");
  }
  if (LOOP) {
    console.log("[ab+qa] Loop mode enabled; watching for changes…");
  }
}

if (LOOP) {
  let running = false, queued = false;
  const trigger = async () => {
    if (running) { queued = true; return; }
    running = true;
    try { await main(); } finally {
      running = false;
      if (queued) { queued = false; trigger(); }
    }
  };
  chokidar.watch([
    "apps/**/**","packages/**/**","docs/**/**",
    "!**/.qa/**","!**/node_modules/**","!**/.next/**","!**/.out/**"
  ], { ignoreInitial: true }).on("all", trigger);
  console.log("[ab+qa] watching… initial run starting");
  trigger();
} else {
  main().catch(e => { console.error(e); process.exit(1); });
}



