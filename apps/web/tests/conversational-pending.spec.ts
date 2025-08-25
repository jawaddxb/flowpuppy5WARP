import { test, expect } from '@playwright/test'

test.describe('@convo-pending', () => {
  test('assistant pending bubble is replaced by API response', async ({ page }) => {
    await page.goto('/agent')
    const convBtn = page.getByTestId('mode-conversational')
    if (await convBtn.isVisible()) await convBtn.click()

    const input = page.getByTestId('convo-input')
    await input.fill('test pending')
    await page.getByTestId('convo-send').click()

    const thread = page.getByTestId('convo-thread')
    // See placeholder
    await expect(thread).toContainText('…', { timeout: 3000 })
    // Then eventually replaced by non-ellipsis text
    await expect.poll(async () => {
      const txt = await thread.textContent()
      return txt && txt.includes('…') ? 'pending' : 'ready'
    }, { timeout: 8000 }).toBe('ready')
  })
})


