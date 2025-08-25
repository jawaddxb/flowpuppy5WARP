import { test, expect } from '@playwright/test'

test.describe('@canvas-drag', () => {
  test('nodes are draggable on /agent', async ({ page }) => {
    await page.goto('/agent')

    // Pre-seed a node deterministically if hook exists; otherwise fall back to any node
    await page.evaluate(() => { try { (window as any).flowCanvasApi?.quickAdd?.({ type: 'http', label: 'HTTP' }) } catch {} })
    let node = page.locator('.react-flow__node').filter({ hasText: 'HTTP' }).first()
    if (await node.count() === 0) {
      node = page.locator('.react-flow__node').first()
    }
    await expect(node).toBeVisible({ timeout: 10000 })

    const before = await node.boundingBox()
    expect(before).not.toBeNull()

    // Drag by 200px down to force reordering
    const box = before!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 200, { steps: 15 })
    await page.mouse.up()

    // Wait a bit for layout to settle
    await page.waitForTimeout(200)

    const after = await node.boundingBox()
    expect(after).not.toBeNull()
    expect(after!.y).toBeGreaterThan(before!.y + 90)
  })
})


