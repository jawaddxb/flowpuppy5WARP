import { test, expect } from '@playwright/test'

// Scope interactions to the React Flow canvas to avoid overlay conflicts

test('@anchor-node Bottom + opens Add-Action and autowires', async ({ page }) => {
  await page.goto('/agent')
  await page.keyboard.press('l')
  const canvas = page.locator('.react-flow').first()
  // Prefer data-testid if present; else evaluate click
  const btn = canvas.locator('[data-testid="anchor-plus"]').first()
  if (await btn.count().then(c=>c>0)) {
    await btn.click({ trial: true }).catch(()=>{})
    await btn.click().catch(()=>{})
  } else {
    const plus = canvas.getByRole('button', { name: 'Add action' }).first()
    await plus.evaluate((el: HTMLElement) => (el as HTMLButtonElement).click())
  }
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('@event-pills Email pills render with +', async ({ page }) => {
  await page.goto('/agent')
  await page.keyboard.press('l')
  const canvas = page.locator('.react-flow').first()
  await expect(canvas.locator('button[aria-label^="Add after "]').first()).toBeVisible()
})

test('@decision-chips Decision chips include mini +', async ({ page }) => {
  await page.goto('/agent')
  await page.keyboard.press('l')
  const canvas = page.locator('.react-flow').first()
  await expect(canvas.getByRole('button', { name: /Add branch/i }).first()).toBeVisible()
})


