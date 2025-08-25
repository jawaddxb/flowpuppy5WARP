import { test, expect } from '@playwright/test'

test.describe('@perf', () => {
  test('time-to-preview under 2000ms', async ({ page }) => {
    const t0 = Date.now()
    await page.goto('/agent')
    // Consider preview ready when canvas exists
    await expect(page.locator('.react-flow').first()).toBeVisible()
    const elapsed = Date.now() - t0
    expect(elapsed).toBeLessThan(2000)
  })

  test('add-node latency under 250ms', async ({ page }) => {
    await page.goto('/agent')
    // Use quickAdd hook exposed on window.flowCanvasApi
    await page.waitForFunction(() => Boolean((window as any).flowCanvasApi))
    // Sample count before triggering add
    const nodes = page.locator('.react-flow__node')
    const initialCount = await nodes.count()
    const t0 = await page.evaluate(async () => {
      const start = performance.now()
      ;(window as any).flowCanvasApi.quickAdd({ type: 'http', label: 'HTTP' })
      return start
    })
    await page.waitForFunction((c) => document.querySelectorAll('.react-flow__node').length > (c as number), initialCount)
    const elapsed = await page.evaluate((start) => performance.now() - (start as number), t0)
    expect(elapsed).toBeLessThan(250)
  })

  test('bundle-size budgets (transfer): JS <= 1600KB, CSS <= 500KB, total <= 3500KB', async ({ page }) => {
    await page.goto('/agent')
    await expect(page.locator('.react-flow').first()).toBeVisible()
    const metrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const sizeOf = (e: PerformanceResourceTiming) => (e.transferSize || e.encodedBodySize || 0)
      let js = 0, css = 0, total = 0
      for (const e of entries) {
        const url = e.name || ''
        const s = sizeOf(e)
        total += s
        // heuristics: initiatorType script or js file
        if ((e as any).initiatorType === 'script' || /\.js($|\?)/.test(url)) js += s
        if ((e as any).initiatorType === 'link' || /\.css($|\?)/.test(url)) css += s
      }
      return { js, css, total }
    })
    const kb = (b: number) => Math.round(b / 1024)
    // Soft logging for diagnostics
    console.log('Bundle sizes (KB):', { js: kb(metrics.js), css: kb(metrics.css), total: kb(metrics.total) })
    expect(kb(metrics.js)).toBeLessThanOrEqual(1600)
    expect(kb(metrics.css)).toBeLessThanOrEqual(500)
    expect(kb(metrics.total)).toBeLessThanOrEqual(3500)
  })
})


