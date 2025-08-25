import { test, expect } from '@playwright/test'

test.describe('@chat-chips', () => {
  test('chat shows provider suggestion chips and inserts node', async ({ page }) => {
    await page.goto('/agent')
    const testing = page.getByRole('button', { name: 'Testing' })
    if (await testing.isVisible().catch(()=>false)) await testing.click({ force: true })
    const toggles = page.getByTestId('testing-chat-toggle')
    const count = await toggles.count()
    if (count > 0) await toggles.first().click()
    const input = (await page.getByPlaceholder('Describe the workflow you want').count())
      ? page.getByPlaceholder('Describe the workflow you want')
      : page.getByPlaceholder('Tell me what you want to create!')
    await input.fill('send email')
    // Wait for suggestion chip containing Gmail (or a generic mail chip)
    const chipBase = (await page.getByRole('button', { name: /Gmail/i }).count())
      ? page.getByRole('button', { name: /Gmail/i })
      : page.getByRole('button', { name: /mail|email/i })
    const chip = chipBase.first()
    await expect(chip).toBeVisible({ timeout: 10000 })
    const canvasNodes = page.locator('.react-flow .react-flow__node')
    const before = await canvasNodes.count()
    await chip.click()

    // Accept either: a node gets added, or connection gating tiles appear
    await expect
      .poll(async () => {
        const count = await canvasNodes.count()
        if (count > before) return 'added'
        const gating = await page.locator('[data-testid="connection-tile"]').count()
        if (gating > 0) return 'gating'
        return 'pending'
      }, { timeout: 10000 })
      .toMatch(/^(added|gating)$/)
  })
})


