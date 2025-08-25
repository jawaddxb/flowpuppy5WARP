import { test, expect } from '@playwright/test'

test.describe('@keyboard', () => {
  test('navigate chips/pills via keyboard', async ({ page }) => {
    await page.goto('/agent')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    // If a modal/panel opened, page remains interactive
    await expect(page.getByRole('main').first()).toBeVisible()
  })
})


