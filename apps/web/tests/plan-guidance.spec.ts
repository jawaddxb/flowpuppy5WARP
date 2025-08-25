import { test, expect } from '@playwright/test'

test.describe('@plan-guidance', () => {
  test('Quick Setup shows questions and pipelines when applicable', async ({ page }) => {
    await page.goto('/agent')
    const quickBtn = page.getByTestId('mode-quick')
    if (await quickBtn.isVisible()) await quickBtn.click()

    await page.getByRole('button', { name: 'Tweet daily AI trends' }).click()

    // Questions block
    await expect(page.getByText('A couple of quick choices')).toBeVisible({ timeout: 10000 })
    // Pipelines block
    await expect(page.getByText('Suggested Pipelines')).toBeVisible({ timeout: 10000 })
  })
})


