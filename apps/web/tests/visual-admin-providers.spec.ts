import { test, expect } from '@playwright/test'

// Visual snapshot coverage for Admin Providers
// Captures both Connected/Not connected badges and Live/Mock toggle states

test.describe('@visual admin-providers', () => {
  test('Admin Providers list snapshot (mock, disconnected)', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 })
    await page.goto('/admin/providers')
    await page.waitForLoadState('networkidle')
    // Ensure heading present
    await expect(page.getByText('Admin • AI Providers')).toBeVisible({ timeout: 10000 })
    const region = page.getByRole('region', { name: 'Workflow Integrations' })
    await expect(region).toBeVisible({ timeout: 10000 })
    expect(await region.screenshot()).toMatchSnapshot('admin-providers-list.png')
  })

  test('Admin Providers item states (connected + mock/live)', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 })
    await page.goto('/admin/providers')
    await page.waitForLoadState('networkidle')
    const region = page.getByRole('region', { name: 'Workflow Integrations' })
    await expect(region).toBeVisible({ timeout: 10000 })

    // Try to connect first visible item (mock flow)
    const connect = region.getByRole('button', { name: /Connect .* via OAuth/ }).first()
    if (await connect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connect.click().catch(()=>{})
      // Let the UI update
      await page.waitForTimeout(500)
    }

    // Snapshot a single provider row to catch Connected badge and Live/Mock toggle
    const firstRow = region.locator('div').filter({ hasText: /global/ }).first()
    await expect(firstRow).toBeVisible({ timeout: 10000 })
    expect(await firstRow.screenshot()).toMatchSnapshot('admin-providers-row.png')
  })
})

