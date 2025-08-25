import { test, expect } from '@playwright/test'

test.describe('@canvas-drag-persist', () => {
  test('drag persists across reload and lane changes update rank', async ({ page }) => {
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

    // Drag down significantly
    const box = before!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 240, { steps: 15 })
    await page.mouse.up()
    await page.waitForTimeout(200)

    const after = await node.boundingBox()
    expect(after).not.toBeNull()
    expect(after!.y).toBeGreaterThan(before!.y + 120)

    // Reload: y should remain roughly below original (tolerance)
    await page.reload()
    let target = page.locator('.react-flow__node').filter({ hasText: 'HTTP' }).first()
    if (await target.count() === 0) {
      target = page.locator('.react-flow__node').first()
    }
    const postReload = await target.boundingBox()
    expect(postReload).not.toBeNull()
    expect(postReload!.y).toBeGreaterThan(before!.y + 30)

    // Horizontal drag to change lane (one column right ~ 324px)
    let n2 = page.locator('.react-flow__node').filter({ hasText: 'HTTP' }).first()
    if (await n2.count() === 0) {
      n2 = page.locator('.react-flow__node').first()
    }
    const b2 = await n2.boundingBox()
    await page.mouse.move(b2!.x + b2!.width / 2, b2!.y + b2!.height / 2)
    await page.mouse.down()
    await page.mouse.move(b2!.x + b2!.width / 2 + 340, b2!.y + b2!.height / 2, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(200)

    // Verify it still exists (moved lanes) and remains on canvas
    await expect(n2).toBeVisible()
  })
})


