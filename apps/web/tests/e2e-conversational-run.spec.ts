import { test, expect } from '@playwright/test'

test.describe('@e2e-conversational', () => {
  test.setTimeout(120_000)

  test('conversational build applies diff and updates canvas (screenshots)', async ({ page }) => {
    await page.goto('/agent')
    await page.waitForLoadState('networkidle')

    // Switch to Conversational mode
    const convBtn = page.getByTestId('mode-conversational')
    if (await convBtn.isVisible()) await convBtn.click()
    await page.screenshot({ path: 'test-artifacts/convo-01-initial.png', fullPage: true })

    // Send a suggested prompt
    const suggestion = page.getByRole('button', { name: 'Tweet daily AI trends' }).first()
    await suggestion.click({ trial: true }).catch(() => {})
    await suggestion.click().catch(() => {})
    await page.screenshot({ path: 'test-artifacts/convo-02-after-send.png', fullPage: true })

    // Trigger build via exposed test hook to avoid timing flakiness, then wait for pending diff
    await page.evaluate(() => (window as any).convoApi?.build?.())
    await page.waitForFunction(() => (window as any).convoApi?.hasPending?.(), null, { timeout: 120_000 })
    await page.screenshot({ path: 'test-artifacts/convo-03-assistant-reply.png', fullPage: true })

    // As a fallback, click the first quick action chip in the thread if present
    const thread = page.getByTestId('convo-thread')
    const quickButtons = thread.locator('button')
    const quickCount = await quickButtons.count()
    if (quickCount > 0) {
      await quickButtons.first().click().catch(()=>{})
    }

    // Wait for pending diff via hook, then ensure panel is open
    await page.waitForFunction(() => (window as any).convoApi?.hasPending?.(), null, { timeout: 120_000 })
    await page.evaluate(() => (window as any).convoApi?.openPanel?.())
    await page.screenshot({ path: 'test-artifacts/convo-04-proposed-change.png', fullPage: true })

    // Apply the diff
    // Prefer applying via hook to avoid selector flakiness
    await page.evaluate(() => (window as any).convoApi?.applyPending?.())

    // Expect the done toast to appear (new or legacy text)
    const toastNew = page.getByText('Done — Workflow applied').first()
    const toastOld = page.getByText('Workflow applied to canvas').first()
    await Promise.race([
      toastNew.waitFor({ state: 'visible', timeout: 20_000 }),
      toastOld.waitFor({ state: 'visible', timeout: 20_000 })
    ])
    await page.screenshot({ path: 'test-artifacts/convo-05-applied.png', fullPage: true })
  })
})


