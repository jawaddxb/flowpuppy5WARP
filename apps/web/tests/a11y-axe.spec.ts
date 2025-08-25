import { test, expect } from '@playwright/test'

async function runAxe(page: any) {
  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js' })
  const results = await page.evaluate(async () => {
    // @ts-ignore
    return await (window as any).axe.run(document, { resultTypes: ['violations'] })
  })
  return results
}

test.describe('@axe', () => {
  test('agent has no serious a11y violations (excluding color-contrast)', async ({ page }) => {
    await page.goto('/agent')
    const res = await runAxe(page)
    const serious = (res.violations || []).filter((v: any) => (v.impact === 'serious' || v.impact === 'critical') && v.id !== 'color-contrast')
    expect(serious, JSON.stringify(serious, null, 2)).toHaveLength(0)
  })

  test('tasks has no serious a11y violations (excluding color-contrast)', async ({ page }) => {
    await page.goto('/tasks')
    const res = await runAxe(page)
    const serious = (res.violations || []).filter((v: any) => (v.impact === 'serious' || v.impact === 'critical') && v.id !== 'color-contrast')
    expect(serious, JSON.stringify(serious, null, 2)).toHaveLength(0)
  })
})


