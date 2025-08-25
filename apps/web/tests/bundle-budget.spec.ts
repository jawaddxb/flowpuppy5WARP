import { test, expect } from '@playwright/test'

test.describe('@bundle', () => {
  test('agent page time-to-interactive under 2500ms (soft)', async ({ page }) => {
    const t0 = Date.now()
    await page.goto('/agent')
    await page.getByText(/Agent|Create|Tasks/).first().waitFor({ timeout: 10000 })
    const tti = Date.now() - t0
    expect(tti).toBeLessThan(2500)
  })
})


