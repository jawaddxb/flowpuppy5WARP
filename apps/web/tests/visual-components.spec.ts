import { test, expect } from '@playwright/test'

test.describe('@visual components', () => {
  test('ConnectionTile snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 })
    await page.goto('/agent')
    const quickBtn = page.getByTestId('mode-quick')
    if (await quickBtn.isVisible()) await quickBtn.click()
    await page.getByTestId('quick-suggestion').first().click()
    const connHeader = page.getByText('Connections Required')
    await connHeader.scrollIntoViewIfNeeded()
    await expect(connHeader).toBeVisible({ timeout: 15000 })
    const tile = page.getByTestId('connection-tile').first()
    await tile.scrollIntoViewIfNeeded()
    await expect(tile).toBeVisible({ timeout: 15000 })
    expect(await tile.screenshot()).toMatchSnapshot('connection-tile.png')
  })

  test('NodeCard snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/agent')
    const node = page.locator('.react-flow__node').filter({ hasText: 'Get Power Prices' }).first()
    await expect(node).toBeVisible({ timeout: 10000 })
    expect(await node.screenshot()).toMatchSnapshot('nodecard.png')
  })

  test('DecisionCard snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/agent')
    const node = page.locator('.react-flow__node').filter({ hasText: 'Decision' }).first()
    await expect(node).toBeVisible({ timeout: 10000 })
    expect(await node.screenshot()).toMatchSnapshot('decisioncard.png')
  })

  test('Add-Action modal snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/agent')
    const node = page.locator('.react-flow__node').filter({ hasText: 'Get Power Prices' }).first()
    await expect(node).toBeVisible({ timeout: 10000 })
    const add = node.getByRole('button', { name: 'Add action' }).first()
    await add.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 10000 })
    expect(await dialog.screenshot()).toMatchSnapshot('add-action.png')
  })

  test('Canvas with lane bands snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/agent')
    const lanesBtn = page.getByRole('button', { name: 'Show lanes' })
    if (await lanesBtn.isVisible()) await lanesBtn.click()
    const canvas = page.locator('.react-flow').first()
    await expect(canvas).toBeVisible({ timeout: 10000 })
    expect(await canvas.screenshot()).toMatchSnapshot('canvas-lanes.png')
  })
})


