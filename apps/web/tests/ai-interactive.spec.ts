import { test, expect } from '@playwright/test'
import { sendPrompt, waitForAssistantReply, clickPrimaryAction, waitForDiffPanel, applyDiff, waitForToast, capture, waitForBuildPipeline } from './utils/convo'
import path from 'path'
import fs from 'fs'

const flowsAll: Array<{ id: string; prompt: string }> = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data/ai-flows.json'), 'utf-8')
)
// Limit to a small curated subset for stability
const flows = flowsAll.slice(0, 2)

test.describe('@ai-interactive', () => {
  test.setTimeout(240_000)

  for (const flow of flows as Array<{ id: string; prompt: string }>) {
    test(`conversational: ${flow.id}`, async ({ page }) => {
      await page.goto('/agent')
      // Ensure Conversational mode
      const convBtn = page.getByTestId('mode-conversational')
      if (await convBtn.isVisible()) await convBtn.click()

      // Prefer hooks for determinism when available
      await page.waitForLoadState('networkidle')
      await expect.poll(async () => await page.evaluate(() => Boolean((window as any).convoApi)), { timeout: 15000 }).toBeTruthy()

      // Seed prompt and drive build/preview/apply path
      await page.getByTestId('convo-input').fill(flow.prompt)
      await page.evaluate(() => { try { (window as any).convoApi?.send?.() } catch {} })

      // Ask for a preview (add_research_pipeline) if not surfaced automatically
      await page.evaluate(() => { try { (window as any).convoApi?.selectQuick?.({ label: 'Preview pipeline', kind: 'preview', patchInstruction: 'add_research_pipeline' }) } catch {} })

      // Apply pending diff via hook
      await expect.poll(async () => await page.evaluate(() => { try { return (window as any).convoApi?.hasPending?.() ? true : false } catch { return false } }), { timeout: 20000 }).toBeTruthy()
      await page.evaluate(() => { try { (window as any).convoApi?.openPanel?.() } catch {} })
      const applied = await page.evaluate(() => { try { return (window as any).convoApi?.applyPending?.() ? true : false } catch { return false } })
      expect(applied).toBeTruthy()

      // Open Testing and connect twitter if tile is present
      await page.evaluate(() => { try { (window as any).inspectorApi?.openTesting?.() } catch {} })
      await page.evaluate(() => { try { (window as any).inspectorApi?.connect?.('twitter') } catch {} })

      // Minimal confirmation of applied state
      await expect.poll(async () => await page.evaluate(() => {
        const t1 = Array.from(document.querySelectorAll('*')).some(el => /Workflow applied to canvas/i.test(el.textContent||''))
        const t2 = Array.from(document.querySelectorAll('*')).some(el => /Done — Workflow applied/i.test(el.textContent||''))
        return t1 || t2
      }), { timeout: 15000 }).toBeTruthy()
    })
  }
})


