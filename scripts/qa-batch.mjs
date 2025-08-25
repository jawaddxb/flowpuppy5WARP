#!/usr/bin/env node
import { execa } from "execa";
import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import stripAnsi from "strip-ansi";

const ROOT = process.cwd();
const OUTDIR = path.join(ROOT, ".qa");
const OUTFILE = path.join(OUTDIR, "last.json");

// Groups to exercise core DoD slices
const GROUPS = [
	{ name: "e2e:core", grep: "@lanes|@anchor-node|@decision-chips|@event-pills|@palette-templates|@smoke" },
	{ name: "e2e:planner", grep: "@planner" },
	{ name: "e2e:providers", grep: "@providers-registry" },
	{ name: "e2e:conversational", grep: "@conversational-flow|@conversational-layout|@conversational-styling" },
];

const SKIP_E2E = /^(1|true|yes)$/i.test(String(process.env.SKIP_E2E || "0"));

async function run(cmd, args, cwd) {
	const t0 = Date.now();
	const { stdout = "", stderr = "", exitCode = 0 } = await execa(cmd, args, { cwd, reject: false });
	const out = stripAnsi(`${stdout}\n${stderr}`);
	return { exitCode, durationMs: Date.now() - t0, output: out.slice(-20000) };
}

async function runAll() {
	const startedAt = new Date().toISOString();
	const results = [];
	let ok = true;

	// typecheck
	{
		const r = await run("npm", ["run", "typecheck"], ROOT);
		results.push({ name: "typecheck", passed: r.exitCode === 0, exitCode: r.exitCode, durationMs: r.durationMs, output: r.output });
		ok = ok && r.exitCode === 0;
	}

	// unit tests
	{
		const r = await run("npm", ["run", "test"], ROOT);
		results.push({ name: "unit", passed: r.exitCode === 0, exitCode: r.exitCode, durationMs: r.durationMs, output: r.output });
		ok = ok && r.exitCode === 0;
	}

	// e2e groups
	if (!SKIP_E2E) {
		for (const g of GROUPS) {
			const r = await run("npx", [
				"playwright",
				"test",
				"-c",
				"apps/web/playwright.config.ts",
				"--grep",
				g.grep,
				"--reporter",
				"list",
			], ROOT);
			results.push({ name: g.name, passed: r.exitCode === 0, exitCode: r.exitCode, durationMs: r.durationMs, output: r.output });
			ok = ok && r.exitCode === 0;
		}
	}

	fs.mkdirSync(OUTDIR, { recursive: true });
	fs.writeFileSync(OUTFILE, JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), ok, results }, null, 2));
	console.log(`[qa-batch] ${ok ? "GREEN" : "FAIL"} → ${OUTFILE}`);
	return ok;
}

const once = process.argv.includes("--once") || process.argv.includes("--once=true");
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
	chokidar.watch([
		"apps/**/**",
		"packages/**/**",
		"docs/**/**",
		"!**/.qa/**",
		"!**/node_modules/**",
		"!**/.next/**",
		"!**/.out/**",
	]).on("all", trigger);
	console.log("[qa-batch] watching… initial run starting");
	trigger();
} else {
	runAll().then(ok => process.exit(ok ? 0 : 1));
}



