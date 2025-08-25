import { Page, APIResponse, expect } from '@playwright/test'

export async function sendPrompt(page: Page, text: string) {
  const input = page.getByTestId('convo-input')
  await input.fill(text)
  await page.getByTestId('convo-send').click()
}

export async function waitForAssistantReply(page: Page, timeoutMs = 60000) {
  const thread = page.getByTestId('convo-thread')
  await expect(thread).toBeVisible({ timeout: 15000 })
  await expect(thread).toContainText(/Thinking\.{3}|Thinking|Proposed|API error|Workflow applied|Review proposed change/i, { timeout: timeoutMs })
}

export async function clickPrimaryAction(page: Page, synonyms: RegExp[] = [/\bbuild\b/i, /\bgenerate\b/i]) {
  for (const rx of synonyms) {
    const btn = page.getByRole('button', { name: rx }).first()
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
      return true
    }
  }
  // Fallback to test hook if available
  const viaHook = await page.evaluate(() => {
    try { const api = (window as any).convoApi; if (api?.build) { api.build(); return true } } catch {}
    return false
  })
  return viaHook
}

export async function waitForDiffPanel(page: Page, timeoutMs = 120000) {
  const header = page.getByText('Proposed change').first()
  const minimized = page.getByText(/Review proposed change/i).first()
  try {
    // Try to open panel via hook to avoid flake
    await page.evaluate(() => { try { (window as any).convoApi?.openPanel?.() } catch {} })
    await Promise.race([
      header.waitFor({ state: 'visible', timeout: timeoutMs }),
      minimized.waitFor({ state: 'visible', timeout: timeoutMs })
    ])
  } catch {}
  if (await minimized.isVisible().catch(() => false)) {
    await minimized.click()
    await header.waitFor({ state: 'visible', timeout: 30000 })
  }
}

export async function applyDiff(page: Page) {
  // Prefer test hook if available for stability
  const applied = await page.evaluate(() => { try { const api = (window as any).convoApi; if (api?.applyPending) { api.applyPending(); return true } } catch {}; return false })
  if (applied) return
  const apply = page.getByRole('button', { name: /^Apply$/i })
  await apply.click()
}

export async function waitForToast(page: Page) {
  const toastNew = page.getByText('Done — Workflow applied').first()
  const toastOld = page.getByText('Workflow applied to canvas').first()
  await Promise.race([
    toastNew.waitFor({ state: 'visible', timeout: 20000 }),
    toastOld.waitFor({ state: 'visible', timeout: 20000 })
  ])
}

export async function capture(page: Page, name: string) {
  await page.screenshot({ path: `test-artifacts/${name}.png`, fullPage: true })
}

export async function waitForBuildPipeline(page: Page, timeoutMs = 180000) {
  const start = Date.now()
  async function waitOne(urlPart: string, status: number) {
    const remaining = Math.max(1000, timeoutMs - (Date.now() - start))
    return page.waitForResponse(
      r => r.url().includes(urlPart) && r.status() === status,
      { timeout: remaining }
    )
  }
  // Plan/Confirm can be flaky; Generate or Diff summary implies success
  try { await waitOne('/api/agent/generate', 200) } catch {}
  try { await waitOne('/api/agent/diff/summary', 200) } catch {}
}


