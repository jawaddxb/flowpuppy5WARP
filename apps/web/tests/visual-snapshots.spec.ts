import { test, expect } from '@playwright/test'

// Basic visual snapshot for token sheet
test('@visual tokens', async ({ page }) => {
  await page.goto('/tokens')
  await page.waitForLoadState('networkidle')
  // Ensure tokens content rendered
  await expect(page.getByText('Design Tokens')).toBeVisible()
  expect(await page.screenshot({ fullPage: true })).toMatchSnapshot('tokens.png')
})

// Minimal canvas snapshot: open /agent and capture canvas root
test('@visual canvas blank', async ({ page }) => {
  await page.goto('/agent')
  await page.waitForLoadState('networkidle')
  // Ensure canvas exists
  const canvas = page.locator('[data-testid="canvas-root"], .react-flow')
  await expect(canvas.first()).toBeVisible()
  expect(await page.screenshot()).toMatchSnapshot('canvas-blank.png')
})
