import { test, expect } from '@playwright/test'

test.describe('@quick-setup', () => {
  test('suggestion pill shows user bubble and proposed workflow', async ({ page }) => {
    await page.goto('/agent')

    // Switch to Quick mode
    const quickBtn = page.getByTestId('mode-quick')
    if (await quickBtn.isVisible()) await quickBtn.click()

    // Click the first suggestion pill
    await page.getByRole('button', { name: 'Tweet daily AI trends' }).click()

    // User bubble appears
    await expect(page.getByTestId('quick-user-bubble').first()).toBeVisible({ timeout: 8000 })

    // Proposed workflow section appears
    const proposed = page.getByTestId('quick-proposed')
    await proposed.scrollIntoViewIfNeeded()
    await expect(proposed).toBeVisible({ timeout: 8000 })

    // Connections tiles render when applicable
    await expect.poll(async () => await page.locator('[data-testid="connection-tile"]').count(), { timeout: 10000 }).toBeGreaterThan(0)
  })
})


