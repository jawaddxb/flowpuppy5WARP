#!/usr/bin/env node
import { execa } from 'execa'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function killPorts(ports = [3000, 3001]) {
  for (const p of ports) {
    try {
      await execa('bash', ['-lc', `lsof -ti tcp:${p} -sTCP:LISTEN -n -P | xargs -r kill -9`], { stdio: 'inherit' })
    } catch {}
  }
  try { await execa('bash', ['-lc', 'pkill -f "next dev -p 3000" || true; pkill -f "next dev -p 3001" || true'], { stdio: 'inherit' }) } catch {}
}

async function waitForReady(url, timeoutMs = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const { stdout } = await execa('bash', ['-lc', `curl -s -o /dev/null -w "%{http_code}\n" ${url}`])
      if (stdout.trim() === '200') return true
    } catch {}
    await sleep(1000)
  }
  throw new Error(`Timeout waiting for ${url}`)
}

async function main() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001'
  const hooks = process.env.NEXT_PUBLIC_E2E_HOOKS || '1'

  await killPorts()

  // Start Next dev in apps/web on port 3001 via script (avoids root-start mistakes)
  const server = execa('bash', ['-lc', 'cd apps/web && NEXT_PUBLIC_E2E_HOOKS=' + hooks + ' npm run dev:3001 --silent'], { stdio: 'inherit' })

  // Wait for readiness
  await waitForReady(baseURL.replace(/\/$/, ''))

  // Pre-warm critical routes to avoid cold compile delays
  try {
    await execa('bash', ['-lc', `curl -s -o /dev/null ${baseURL}/agent`])
    await execa('bash', ['-lc', `curl -s -o /dev/null -w "%{http_code}\n" -H 'content-type: application/json' -d '{"prompt":"Warm up plan"}' ${baseURL}/api/agent/plan`])
    await execa('bash', ['-lc', `curl -s -o /dev/null -w "%{http_code}\n" -H 'content-type: application/json' -d '{"selections":{}}' ${baseURL}/api/agent/confirm`])
    await execa('bash', ['-lc', `curl -s -o /dev/null -w "%{http_code}\n" -H 'content-type: application/json' -d '{"agentSpec":{"name":"Warm"}}' ${baseURL}/api/agent/generate`])
    await execa('bash', ['-lc', `curl -s -o /dev/null -w "%{http_code}\n" -H 'content-type: application/json' -d '{}' ${baseURL}/api/agent/diff/summary`]).catch(()=>{})
  } catch {}

  // Ensure artifacts dir exists
  try { await execa('bash', ['-lc', 'mkdir -p apps/web/test-artifacts']) } catch {}

  // Run Playwright tests in apps/web
  try {
    const tests = process.env.E2E_TEST_FILES ? String(process.env.E2E_TEST_FILES) : ''
    const cmd = `cd apps/web && PLAYWRIGHT_BASE_URL=${baseURL} NEXT_PUBLIC_E2E_HOOKS=${hooks} npx --yes playwright test ${tests} --reporter=list`
    await execa('bash', ['-lc', cmd], { stdio: 'inherit' })
  } finally {
    // Cleanup server
    try { server.kill('SIGKILL', { forceKillAfterTimeout: 2000 }) } catch {}
    await killPorts()
  }
}

main().catch(async (err) => {
  console.error(err?.message || err)
  process.exit(1)
})


