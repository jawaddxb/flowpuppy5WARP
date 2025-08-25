import type { FullConfig } from '@playwright/test'
import { execSync } from 'node:child_process'

export default async function globalSetup(_config: FullConfig) {
  const port = Number(process.env.PORT || 3001)
  try {
    const pidsRaw = execSync(`lsof -ti tcp:${port}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
    if (!pidsRaw) return
    const pids = pidsRaw.split('\n').filter(Boolean)
    if (pids.length === 0) return
    try {
      execSync(`kill -9 ${pids.join(' ')}`, { stdio: 'ignore' })
      console.log(`[globalSetup] Killed ${pids.length} process(es) on port ${port}`)
    } catch {
      // ignore kill errors
    }
  } catch {
    // lsof returned nothing or is unavailable; nothing to do
  }
}

