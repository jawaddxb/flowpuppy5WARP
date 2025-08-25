import { test, expect } from '@playwright/test'

test.describe('Conversational pipeline @planner @console', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      try { localStorage.setItem('fp-build-mode', 'conversational') } catch {}
    })
  })

  test('sources → proposed change → apply → inline connect', async ({ page }) => {
    await page.goto('http://localhost:3001/agent')

    // Drive via E2E hooks to avoid mobile overlays
    await expect.poll(async () => await page.evaluate(() => Boolean((window as any).convoApi)), { timeout: 15000 }).toBeTruthy()
    // Seed a prompt and trigger plan via send(), then directly request preview via hook
    await page.getByTestId('convo-input').fill('Tweet daily AI trends')
    await page.evaluate(() => { try { (window as any).convoApi?.send?.() } catch {} })
    await page.evaluate(() => { try { (window as any).convoApi?.selectQuick?.({ label: 'Preview pipeline', kind: 'preview', patchInstruction: 'add_research_pipeline' }) } catch {} })
    // Wait until a pending diff exists, then apply via hook (more reliable)
    await expect.poll(async () => await page.evaluate(() => { try { return (window as any).convoApi?.hasPending?.() ? true : false } catch { return false } }), { timeout: 20000 }).toBeTruthy()
    await page.evaluate(() => { try { (window as any).convoApi?.openPanel?.() } catch {} })
    const applied = await page.evaluate(() => { try { return (window as any).convoApi?.applyPending?.() ? true : false } catch { return false } })
    expect(applied).toBeTruthy()

    // Confirm applied indicator shows
    await expect(page.getByText('Workflow applied to canvas.')).toBeVisible()

    // Open Testing tab via test hook (mobile reliability)
    await page.evaluate(() => { try { (window as any).inspectorApi?.openTesting?.() } catch {} })
    // Wait for at least one required connection tile to appear (or skip if none)
    await expect.poll(async () => await page.evaluate(() => {
      try {
        const tiles = Array.from(document.querySelectorAll('[data-testid="connection-tile"]')) as HTMLElement[]
        return tiles.length > 0
      } catch { return false }
    }), { timeout: 10000 }).toBeTruthy()

    // Force-connect via test hook to avoid mobile overlay/tap flakiness
    await page.evaluate(() => { try { (window as any).inspectorApi?.connect?.('twitter') } catch {} })
    const connTile = page.locator('[data-testid="connection-tile"]').filter({ hasText: 'twitter' })
    if (await connTile.count()) {
      const ok = await page.evaluate(() => {
        try {
          const tiles = Array.from(document.querySelectorAll('[data-testid="connection-tile"]')) as HTMLElement[]
          const t = tiles.find(el => /twitter/i.test(el.textContent||''))
          return t ? /Connected/i.test(t.textContent||'') : false
        } catch { return false }
      })
      expect(ok).toBeTruthy()
    }

    // Inspector tab should not show Flow Errors (no orphan nodes)
    await page.evaluate(() => { try { (window as any).inspectorApi?.openInspector?.() } catch {} })
    await expect(page.getByText('Flow Errors')).toHaveCount(0)
  })
})


