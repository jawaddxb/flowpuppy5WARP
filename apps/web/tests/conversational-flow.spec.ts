import { test, expect } from '@playwright/test'

test.describe('@conversational-flow', () => {
  test('user message appears after sending (hooks-first)', async ({ page }) => {
    await page.goto('/agent')
    const convBtn = page.getByTestId('mode-conversational')
    if (await convBtn.isVisible()) await convBtn.click()

    // Prefer deterministic hooks when available
    await page.waitForLoadState('networkidle')
    let hasHooks = false
    try {
      await expect
        .poll(async () => await page.evaluate(() => Boolean((window as any).convoApi?.send)), { timeout: 8000 })
        .toBeTruthy()
      hasHooks = true
    } catch {
      hasHooks = false
    }

    if (hasHooks) {
      await page.evaluate(() => { try { (window as any).convoApi?.setInput?.('hello world') } catch {} })
      await page.evaluate(() => { try { (window as any).convoApi?.send?.() } catch {} })
    } else {
      const input = page.getByTestId('convo-input')
      const sendBtn = page.getByTestId('convo-send')
      await input.fill('hello world')
      await sendBtn.click()
    }

    const thread = page.getByTestId('convo-thread')
    await expect(thread).toContainText('hello world', { timeout: 8000 })
  })

  test('quick mode also shows user message when sending (hooks-first)', async ({ page }) => {
    await page.goto('/agent')
    const quickBtn = page.getByTestId('mode-quick')
    if (await quickBtn.isVisible()) await quickBtn.click()

    await page.waitForLoadState('networkidle')
    let hasQuick = false
    try {
      await expect
        .poll(async () => await page.evaluate(() => Boolean((window as any).quickApi?.send)), { timeout: 8000 })
        .toBeTruthy()
      hasQuick = true
    } catch {
      hasQuick = false
    }

    if (hasQuick) {
      await page.evaluate(() => { try { (window as any).quickApi?.setInput?.('hello quick') } catch {} })
      await page.evaluate(() => { try { (window as any).quickApi?.send?.() } catch {} })
    } else {
      const composer = page.getByPlaceholder('Tell me what you want to create!')
      await composer.fill('hello quick')
      await page.getByRole('button', { name: 'Send' }).click()
    }

    const thread = page.getByTestId('convo-thread')
    await expect(thread).toContainText('hello quick', { timeout: 8000 })
  })
})


