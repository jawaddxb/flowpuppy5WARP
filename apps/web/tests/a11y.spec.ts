import { test, expect } from '@playwright/test'

test.describe('@a11y', () => {
  test('agent page keyboard send and basic roles present', async ({ page }) => {
    await page.goto('/agent')
    await expect(page.mainFrame().getByRole('main').first()).toBeVisible()
    const composer = page.locator('textarea').first()
    await composer.focus()
    await composer.fill('hello')
    await page.keyboard.press('Enter')
    await expect(page.getByText(/hello/i).first()).toBeVisible({ timeout: 8000 })
  })
})


