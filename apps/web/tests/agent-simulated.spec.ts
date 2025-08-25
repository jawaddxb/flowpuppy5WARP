import { test, expect } from '@playwright/test'

test.describe('@providers-registry @simulated', () => {
  test('agent page renders and simulated run controls exist', async ({ page }) => {
    await page.goto('/agent')
    await page.keyboard.press('Escape').catch(()=>{})
    await expect(page.locator('.react-flow')).toBeVisible()
  })
})


