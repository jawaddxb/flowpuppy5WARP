import { test, expect } from '@playwright/test'

test('@lanes Lane bands visible at zoom ≥ 0.8 and X quantization ≈300px', async ({ page }) => {
  await page.goto('/agent')
  // Toggle lane bands on (press 'l' per Builder hotkey)
  await page.keyboard.press('l')
  // Lane headers should render after toggle
  await page.waitForSelector('text=INPUT', { timeout: 5000 })
  const headers = page.locator('text=INPUT')
  await expect(headers.first()).toBeVisible()
  // Assert inline styles for lane quantization (unscaled): width=300px, second cell margin-left=24px
  const headerRow = page.locator('[aria-hidden="true"] > div').first()
  const firstCell = headerRow.locator(':scope > div').nth(0)
  const secondCell = headerRow.locator(':scope > div').nth(1)
  const [w1, ml2] = await Promise.all([
    firstCell.evaluate((el)=> (el as HTMLElement).style.width),
    secondCell.evaluate((el)=> (el as HTMLElement).style.marginLeft),
  ])
  expect(w1).toBe('300px')
  expect(ml2).toBe('24px')
})


