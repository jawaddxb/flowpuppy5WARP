import { test, expect } from '@playwright/test'

// Basic layout tests for Conversational mode

test.describe('@conversational-layout', () => {
  test('thread is scrollable and composer remains visible', async ({ page }) => {
    await page.goto('/agent')

    // Switch to Conversational mode
    const convBtn = page.getByTestId('mode-conversational')
    if (await convBtn.isVisible()) await convBtn.click()

    const thread = page.getByTestId('convo-thread')
    const composer = page.getByTestId('convo-composer')

    await expect(thread).toBeVisible()
    await expect(composer).toBeVisible()

    // Post multiple messages to force overflow
    const textarea = composer.locator('textarea')
    const sendBtn = composer.getByRole('button', { name: 'Send', exact: true })
    for (let i = 0; i < 20; i++) {
      await textarea.fill(`Message ${i+1}`)
      await sendBtn.click()
      await page.waitForTimeout(50)
    }

    // Composer should still be visible
    await expect(composer).toBeVisible()

    // Verify thread is scrollable by checking scrollHeight > clientHeight
    const scrollData = await thread.evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }))
    expect(scrollData.scrollHeight).toBeGreaterThan(scrollData.clientHeight)
  })
})
