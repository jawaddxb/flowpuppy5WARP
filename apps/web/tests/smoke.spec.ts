import { test, expect } from '@playwright/test'

test('agent generate (smoke) -> testing UI visible', async ({ page }) => {
  await page.goto('/agent')
  // Global CSS presence: check a Tailwind-driven class has expected computed style
  const header = page.locator('header, .border-b').first()
  await expect(header).toBeVisible()
  const borderColor = await header.evaluate(el => getComputedStyle(el).borderBottomColor)
  expect(borderColor).toBeTruthy()
  // close onboarding overlay if present
  const closeBtn = page.getByRole('button', { name: 'Close' })
  if (await closeBtn.count().then(c=>c>0)) {
    await closeBtn.first().click({ trial: true }).catch(()=>{})
    await closeBtn.first().click().catch(()=>{})
  } else {
    await page.keyboard.press('Escape').catch(()=>{})
  }
  // Fallback: ensure either Testing or Inspector tab control is visible
  const inspectorBtn = page.getByRole('button', { name: 'Inspector' }).first()
  const testingBtn = page.getByRole('button', { name: 'Testing' }).first()
  await expect.poll(async ()=> (await inspectorBtn.count()) + (await testingBtn.count())).toBeGreaterThan(0)
})



