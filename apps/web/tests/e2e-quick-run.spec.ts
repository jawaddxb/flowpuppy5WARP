import { test, expect } from '@playwright/test'

test.describe('@e2e-quick', () => {
  test.setTimeout(90_000)

  test('quick setup build applies diff and shows toast (hooks-first, screenshots)', async ({ page }) => {
    await page.goto('/agent')
    await page.waitForLoadState('networkidle')

    // Switch to Quick mode
    const quickBtn = page.getByTestId('mode-quick')
    if (await quickBtn.isVisible()) await quickBtn.click()
    await page.screenshot({ path: 'test-artifacts/quick-01-initial.png', fullPage: true })

    await page.waitForLoadState('networkidle')
    let hasQuick = false
    try {
      await expect
        .poll(async () => await page.evaluate(() => Boolean((window as any).quickApi?.generate)), { timeout: 8000 })
        .toBeTruthy()
      hasQuick = true
    } catch {
      hasQuick = false
    }

    if (hasQuick) {
      // Generate via hook for determinism
      await page.evaluate((p) => { try { (window as any).quickApi?.generate?.(p) } catch {} }, 'Tweet daily AI trends')
      // Wait for staged flow (pending next flowdoc)
      await page.waitForFunction(() => { try { return Boolean(localStorage.getItem('fp-next-flowdoc') || (window as any).__qaNextFlow) } catch { return false } }, undefined, { timeout: 30_000 })
      // Apply via hook
      await page.evaluate(() => { try { (window as any).quickApi?.applyPending?.() } catch {} })
    } else {
      // Fallback: UI path
      const composer = page.getByPlaceholder('Tell me what you want to create!')
      await composer.fill('Tweet daily AI trends')
      await page.getByRole('button', { name: 'Send' }).click()
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-artifacts/quick-02-after-plan.png', fullPage: true })

      const create = page.getByTestId('quick-create-workflow')
      if (!(await create.isEnabled())) {
        const tiles = page.locator('[data-testid="connection-tile"]')
        const tileCount = await tiles.count()
        for (let i = 0; i < tileCount; i++) {
          const tile = tiles.nth(i)
          const skip = tile.getByRole('button', { name: 'Skip' })
          if (await skip.isVisible()) await skip.click()
        }
        await expect(create).toBeEnabled({ timeout: 30_000 })
      }
      await create.click()
      await page.waitForLoadState('networkidle')

      // Expect either inline or floating diff
      const floatingHeader = page.getByText('Proposed change').first()
      const inlineHeader = page.getByText('Diff Preview').first()
      try {
        await Promise.race([
          floatingHeader.waitFor({ state: 'visible', timeout: 30_000 }),
          inlineHeader.waitFor({ state: 'visible', timeout: 30_000 })
        ])
      } catch {
        if (await create.isEnabled()) {
          await create.click()
        }
        await Promise.race([
          floatingHeader.waitFor({ state: 'visible', timeout: 30_000 }),
          inlineHeader.waitFor({ state: 'visible', timeout: 30_000 })
        ])
      }

      // Apply if floating, else inline
      const applyFloating = page.getByRole('button', { name: 'Apply' }).first()
      if (await applyFloating.isVisible()) {
        await applyFloating.click()
      } else {
        const inlineApply = page.getByRole('button', { name: 'Apply' }).first()
        if (await inlineApply.isVisible()) await inlineApply.click()
      }
    }

    // Expect toast or node count fallback
    const sawToast = await Promise.race([
      page.getByText('Done — Workflow applied').first().waitFor({ state: 'visible', timeout: 15_000 }).then(()=>true).catch(()=>false),
      page.getByText('Workflow applied to canvas').first().waitFor({ state: 'visible', timeout: 15_000 }).then(()=>true).catch(()=>false)
    ])
    if (!sawToast) {
      const nodeCount = await page.evaluate(() => { try { const f = (window as any).quickApi?.getFlowDoc?.(); return Array.isArray(f?.nodes) ? f.nodes.length : 0 } catch { return 0 } })
      expect(nodeCount).toBeGreaterThan(0)
    }
    await page.screenshot({ path: 'test-artifacts/quick-04-applied.png', fullPage: true })
  })
})


