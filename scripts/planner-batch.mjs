#!/usr/bin/env node
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const QA_DIR = path.join(ROOT, '.qa')
const LOG = path.join(QA_DIR, 'planner-last.log')
fs.mkdirSync(QA_DIR, { recursive: true })
fs.writeFileSync(LOG, '')

function log(line) {
  const s = String(line) + (String(line).endsWith('\n') ? '' : '\n')
  process.stdout.write(s)
  try { fs.appendFileSync(LOG, s) } catch {}
}

function run(cmd, args, opts={}) {
  return new Promise(async (resolve) => {
    const p = spawn(cmd, args, { stdio: ['ignore','pipe','pipe'], cwd: opts.cwd || ROOT, env: { ...process.env, ...(opts.env||{}) } })
    p.stdout.on('data', (d)=> log(d.toString()))
    p.stderr.on('data', (d)=> log(d.toString()))
    p.on('exit', (code) => resolve(code === 0))
  })
}

function flag(name) { return process.argv.includes(`--${name}`) }

const golden = flag('golden')
const mockOnly = flag('mock-only')
const visual = flag('visual')

log(`[planner-batch] golden=${golden} mockOnly=${mockOnly} visual=${visual}`)

// 1) Prep DB best-effort
log('[planner-batch] Preparing local DB (reset + seed)…')
await run('supabase', ['db', 'reset', '--local', '--yes'])

// 2) Run quickcheck with planner grep
log('[planner-batch] QA quickcheck (scoped @planner) …')
const okQC = await run('node', ['scripts/qa-pipeline.mjs', '--once'], { env: { ...process.env, PW_GREP: '@planner' } })
if (!okQC) process.exit(1)

// 3) Optional golden prompts (unit integration already run in quickcheck)
if (golden) {
  log('[planner-batch] Golden prompts (unit) …')
  await run('npm', ['test', '--', '--', '-t', 'plan|confirm|generate'])
}

log('CHECKPOINT READY FOR VISUAL')
log('- /agent')
log('- Testing tab → Show chat → type a goal → Generate → Preview changes visible')
log('- Click Apply to write FlowDoc; canvas updates; Inspector shows fields from DSL')
log(`- Log: ${LOG}`)


