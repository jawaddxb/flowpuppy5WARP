import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const flows: Array<{ id: string; prompt: string }> = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data/ai-flows.json'), 'utf-8')
)

test.describe('@ai-interactive-quick', () => {
  test.setTimeout(240_000)

  for (const flow of flows as Array<{ id: string; prompt: string }>) {
    test(`quick: ${flow.id}`, async ({ page }) => {
      await page.goto('/agent')
      await page.evaluate(() => { try { localStorage.clear() } catch {} })
      await page.waitForLoadState('networkidle')
      // Reset canvas via test hook if available
      await page.evaluate(() => (window as any).quickApi?.resetCanvas?.())
      await page.waitForTimeout(300)

      // Switch to Quick
      const quickBtn = page.getByTestId('mode-quick')
      if (await quickBtn.isVisible()) await quickBtn.click()

      // Fill prompt and Send to plan
      const composer = page.getByPlaceholder('Tell me what you want to create!')
      await composer.fill(flow.prompt)
      await page.getByRole('button', { name: 'Send' }).click()
      await page.waitForLoadState('networkidle')

      // Handle connection gating by skipping via hook to avoid tile intercepts
      await page.evaluate(() => { try { (window as any).inspectorApi?.openTesting?.(); (window as any).inspectorApi?.skip?.('twitter'); (window as any).inspectorApi?.skip?.('email_provider'); (window as any).inspectorApi?.skip?.('weather_api') } catch {} })

      // Drive pipeline via hook deterministically (plan → confirm → generate)
      await page.evaluate((p) => (window as any).quickApi?.generate?.(p), flow.prompt)

      // Wait for generated FlowDoc to be staged in localStorage or hook variable, then apply via hook
      await page.waitForFunction(() => { try { return Boolean(localStorage.getItem('fp-next-flowdoc') || (window as any).__qaNextFlow) } catch { return false } }, undefined, { timeout: 120_000 })
      await page.evaluate(() => { try { (window as any).quickApi?.applyPending?.() } catch {} })

      // Try to apply via hook first for stability
      const applied = await page.evaluate(() => { const api = (window as any).quickApi; if (api?.applyPending) { api.applyPending(); return true } return false })
      if (!applied) {
        // Fallback: wait for visible header or inline preview then click Apply
        const floatingHeader = page.getByText('Proposed change').first()
        const inlineHeader = page.getByText('Diff Preview').first()
        const inlineQuick = page.locator('[data-quick-diff]')
        await Promise.race([
          floatingHeader.waitFor({ state: 'visible', timeout: 120_000 }),
          inlineHeader.waitFor({ state: 'visible', timeout: 120_000 }),
          inlineQuick.waitFor({ state: 'visible', timeout: 120_000 }),
        ])
        const applyBtn = page.getByRole('button', { name: /^Apply$/i }).first()
        await applyBtn.click().catch(()=>{})
      }

      // Wait for state to update (flow nodes > 0) or toast
      await page.waitForFunction(() => {
        try { const f = (window as any).quickApi?.getFlowDoc?.(); return Array.isArray(f?.nodes) && f.nodes.length > 0 } catch { return false }
      }, undefined, { timeout: 20000 }).catch(()=>{})

      // Toast assertion or state fallback
      const toastNew = page.getByText('Done — Workflow applied').first()
      const toastOld = page.getByText('Workflow applied to canvas').first()
      const sawToast = await Promise.race([
        toastNew.waitFor({ state: 'visible', timeout: 20000 }).then(()=>true).catch(()=>false),
        toastOld.waitFor({ state: 'visible', timeout: 20000 }).then(()=>true).catch(()=>false)
      ])
      if (!sawToast) {
        // Fallback: verify canvas has at least one node after apply
        const nodeCount = await page.evaluate(() => { try { const f = (window as any).quickApi?.getFlowDoc?.(); return Array.isArray(f?.nodes) ? f.nodes.length : 0 } catch { return 0 } })
        expect(nodeCount).toBeGreaterThan(0)
      } else {
        await expect(page.getByText(/Done — Workflow applied|Workflow applied to canvas/i)).toBeVisible()
      }
    })
  }
})


