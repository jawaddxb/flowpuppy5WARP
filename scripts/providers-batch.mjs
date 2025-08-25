#!/usr/bin/env node
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const QA_DIR = path.join(ROOT, '.qa')
const LOG = path.join(QA_DIR, 'providers-last.log')
try { fs.mkdirSync(QA_DIR, { recursive: true }) } catch {}
try { fs.writeFileSync(LOG, '') } catch {}

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

function arg(name, def) {
  const m = process.argv.find(a => a.startsWith(`--${name}=`))
  return m ? m.split('=').slice(1).join('=') : def
}
function flag(name) { return process.argv.includes(`--${name}`) }

const orgId = arg('org', 'org-demo')
const quick = flag('quick')
const visual = flag('visual')
const rotate = flag('rotate')
const includeOpenApi = flag('include-openapi')
const includeMcp = flag('include-mcp')

log(`[providers-batch] org=${orgId} quick=${quick} visual=${visual} rotate=${rotate} openapi=${includeOpenApi} mcp=${includeMcp}`)

// 1) migrations/seed (best-effort)
log('[providers-batch] Preparing local DB (reset + seed)…')
await run('supabase', ['db', 'reset', '--local', '--yes'])

// 2) typecheck + unit + e2e (scoped)
log('[providers-batch] QA quickcheck (scoped) …')
const okQC = await run('node', ['scripts/qa-pipeline.mjs', '--once'], { env: { ...process.env, PW_GREP: '@providers-admin' } })
if (!okQC) process.exit(1)

// 3) optional rotation
if (rotate) {
  log('[providers-batch] Attempting secrets rotation…')
  await run('node', ['-e', `fetch('http://localhost:3000/api/admin/providers/rotate-secrets', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orgId: '${orgId}', dryRun: ${!process.env.NEW_SECRETS_KEY} }) }).then(r=>r.text()).then(console.log).catch(console.error)`])
}

// 4) optional importers smoke
if (includeOpenApi) {
  log('[providers-batch] OpenAPI→nodes smoke…')
  await run('node', ['-e', `fetch('http://localhost:3000/api/admin/providers/openapi/nodes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ spec: { servers:[{url:'https://api.example.com'}], paths: { '/v1/items': { get: {} } } } }) }).then(r=>r.text()).then(console.log).catch(console.error)`])
}
if (includeMcp) {
  log('[providers-batch] MCP tool discovery smoke…')
  await run('node', ['-e', `fetch('http://localhost:3000/api/admin/providers/mcp/tools', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: 'https://mcp.example.com/manifest.json' }) }).then(r=>r.text()).then(console.log).catch(console.error)`])
}

// 4b) DB-backed providers list sanity
await run('node', ['-e', `fetch('http://localhost:3000/api/admin/providers').then(r=>r.json()).then(j=>{ console.log('[providers-batch] providers count:', (j.providers||[]).length) }).catch(console.error)`])

// 5) visual checkpoint
log('CHECKPOINT READY FOR VISUAL')
log('- /admin/providers')
log('- System AI Routing: verify only LLMs visible in priority list; change purpose; move items')
log('- Workflow Integrations: open "Edit credentials" on openweather and gmail; Test connection')
log('- Importers: run OpenAPI→nodes and MCP tools endpoints (flags)')
log('- Sample data: OPENWEATHER_API_KEY=test-ow; GOOGLE_CLIENT_ID/SECRET=demo')
log(`- Log: ${LOG}`)


