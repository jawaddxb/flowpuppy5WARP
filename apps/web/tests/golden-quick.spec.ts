import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const flowsAll: Array<{ id: string; prompt: string }> = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data/golden-prompts.json'), 'utf-8')
)
// Run a smaller curated set
const flows = flowsAll.slice(0, 3)

test.describe('@golden-quick', () => {
  test.setTimeout(300_000)
  for (const flow of flows) {
    test(`quick golden: ${flow.id}`, async ({ page }) => {
      await page.goto('/agent')
      await page.waitForLoadState('networkidle')

      // Ensure Quick mode
      const quickBtn = page.getByTestId('mode-quick')
      if (await quickBtn.isVisible().catch(()=>false)) { await quickBtn.click().catch(()=>{}) }

      // Fill prompt and send plan
      const composer = page.getByPlaceholder('Tell me what you want to create!')
      await composer.fill(flow.prompt)
      await page.getByRole('button', { name: 'Send' }).click()
      await page.waitForLoadState('networkidle')

      // Drive pipeline via hook for stability
      await page.evaluate((p) => (window as any).quickApi?.generate?.(p), flow.prompt)

      // Wait for staged flow
      await page.waitForFunction(() => { try { return Boolean(localStorage.getItem('fp-next-flowdoc') || (window as any).__qaNextFlow) } catch { return false } }, undefined, { timeout: 120_000 })

      // Apply via hook
      await page.evaluate(() => { try { (window as any).quickApi?.applyPending?.() } catch {} })

      // Verify at least one node on canvas
      await page.waitForFunction(() => {
        try { const f = (window as any).quickApi?.getFlowDoc?.(); return Array.isArray(f?.nodes) && f.nodes.length > 0 } catch { return false }
      }, undefined, { timeout: 20000 })

      // Toast or fallback
      const toastNew = page.getByText('Done — Workflow applied').first()
      const toastOld = page.getByText('Workflow applied to canvas').first()
      const sawToast = await Promise.race([
        toastNew.waitFor({ state: 'visible', timeout: 10000 }).then(()=>true).catch(()=>false),
        toastOld.waitFor({ state: 'visible', timeout: 10000 }).then(()=>true).catch(()=>false)
      ])
      if (!sawToast) {
        const nodeCount = await page.evaluate(() => { try { const f = (window as any).quickApi?.getFlowDoc?.(); return Array.isArray(f?.nodes) ? f.nodes.length : 0 } catch { return 0 } })
        expect(nodeCount).toBeGreaterThan(0)
      }
    })
  }
})
