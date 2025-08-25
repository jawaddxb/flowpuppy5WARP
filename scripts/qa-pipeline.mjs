#!/usr/bin/env node
import { execa } from "execa";
import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import stripAnsi from "strip-ansi";

const ROOT = process.cwd();
const OUTDIR = path.join(ROOT, ".qa");
const OUTFILE = path.join(OUTDIR, "last.json");

const PW_GREP = process.env.PW_GREP || "@builder|@lanes|@edges|@inspector|@diff-apply|@test-gate|@tasks|@perf";
const SKIP_E2E = /^(1|true|yes)$/i.test(String(process.env.SKIP_E2E || "0"));

const COMMANDS = [
  { name: "typecheck", cmd: "npm", args: ["run", "typecheck"], cwd: ROOT },
  { name: "unit",      cmd: "npm", args: ["test"], cwd: ROOT },
  ...(!SKIP_E2E ? [
    { name: "e2e", cmd: "npx", args: ["playwright","test","-c","apps/web/playwright.config.ts","--grep", PW_GREP, "--reporter","list"], cwd: ROOT }
  ] : [])
];

const WATCH_GLOBS = [
  "apps/**/**","packages/**/**","docs/**/**",
  "!**/.qa/**","!**/node_modules/**","!**/.next/**","!**/.out/**"
];

const runAll = async () => {
  const startedAt = new Date().toISOString();
  const results = [];
  let ok = true;

  for (const c of COMMANDS) {
    const t0 = Date.now();
    const { stdout="", stderr="", exitCode=0 } = await execa(c.cmd, c.args, { cwd: c.cwd, reject: false });
    const out = stripAnsi(`${stdout}\n${stderr}`);
    const passed = exitCode === 0;
    ok = ok && passed;
    results.push({ name: c.name, passed, exitCode, durationMs: Date.now()-t0, output: out.slice(-20000) });
    if (!passed) break;
  }

  fs.mkdirSync(OUTDIR, { recursive: true });
  fs.writeFileSync(OUTFILE, JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), ok, results }, null, 2));
  console.log(`[qa] ${ok ? "GREEN" : "FAIL"} → ${OUTFILE}`);
  return ok;
};

const once  = process.argv.includes("--once")  || process.argv.includes("--once=true");
const watch = process.argv.includes("--watch") || process.argv.includes("--watch=true");

if (once) {
  runAll().then(ok => process.exit(ok ? 0 : 1));
} else if (watch) {
  let running = false, queued = false;
  const trigger = async () => {
    if (running) { queued = true; return; }
    running = true;
    await runAll();
    running = false;
    if (queued) { queued = false; trigger(); }
  };
  chokidar.watch(WATCH_GLOBS, { ignoreInitial: true }).on("all", trigger);
  console.log("[qa] watching… initial run starting");
  trigger();
} else {
  runAll().then(ok => process.exit(ok ? 0 : 1));
}
