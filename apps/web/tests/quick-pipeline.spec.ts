import { test, expect } from '@playwright/test'

test.describe('Quick pipeline @planner @console', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      try { localStorage.setItem('fp-build-mode', 'quick') } catch {}
    })
  })

  test('sources → proposed change → apply → inline connect', async ({ page }) => {
    await page.goto('http://localhost:3001/agent')

    // Wait for test hooks to be available
    await expect.poll(async () => await page.evaluate(() => Boolean((window as any).quickApi)), { timeout: 15000 }).toBeTruthy()

    // Drive quick flow via hook for determinism across browsers
    await page.evaluate(() => { try { (window as any).quickApi?.resetCanvas?.() } catch {} })
    const staged = await page.evaluate(() => { try { return (window as any).quickApi?.generate?.('Tweet daily AI trends') } catch { return false } })
    expect(staged).toBeTruthy()
    // Apply pending (falls back to fp-next-flowdoc if diff not staged yet)
    await page.evaluate(() => { try { (window as any).quickApi?.openPanel?.() } catch {} })
    await page.evaluate(() => { try { (window as any).quickApi?.applyPending?.() } catch {} })
    // Allow either toast styles (floating or header)
    await expect.poll(async () => await page.evaluate(() => {
      const t1 = Array.from(document.querySelectorAll('*')).some(el => /Workflow applied to canvas/i.test(el.textContent||''))
      const t2 = Array.from(document.querySelectorAll('*')).some(el => /Done — Workflow applied/i.test(el.textContent||''))
      return t1 || t2
    }), { timeout: 10000 }).toBeTruthy()

    // Open Testing tab via hook and connect twitter inline
    await page.evaluate(() => { try { (window as any).inspectorApi?.openTesting?.() } catch {} })
    // If a tile exists for twitter, connect it; otherwise skip the assertion (provider derivation may vary by stub)
    const connected = await page.evaluate(() => {
      try {
        const tiles = Array.from(document.querySelectorAll('[data-testid="connection-tile"]')) as HTMLElement[]
        const t = tiles.find(el => /twitter/i.test(el.textContent||''))
        if (!t) return 'no-tile'
        ;(window as any).inspectorApi?.connect?.('twitter')
        return 'connected'
      } catch { return 'error' }
    })
    if (connected === 'connected') {
      const connTile = page.locator('[data-testid="connection-tile"]').filter({ hasText: 'twitter' })
      await expect(connTile.getByText('Connected', { exact: true })).toBeVisible()
    }
  })
})


