import { test, expect } from '@playwright/test'

test.describe('@palette-templates', () => {
  test('provider templates appear in Add-Action search', async ({ page }) => {
    await page.goto('/agent')
    await page.waitForSelector('.react-flow')
    // Use exposed helper to open Add Action directly to avoid overlay interference
    await page.waitForFunction(() => typeof (window as any).__openAdd === 'function')
    await page.evaluate(() => { (window as any).__openAdd({ kind: 'node', nodeId: 'n-trigger' }) })
    await expect(page.getByText('Add Action')).toBeVisible()
    // Search for provider template and assert Gmail appears
    await page.getByPlaceholder(/Search actions/i).fill('Gmail')
    await expect(page.getByText('Gmail: Send Email')).toBeVisible()
  })
})


