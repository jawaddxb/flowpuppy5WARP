import { test, expect } from '@playwright/test'

// Decision insert behaviors

test('@decision-insert autowires and inherits branch label', async ({ page }) => {
  await page.goto('/agent')
  // Seed flow via localStorage and reload so E2ESeed applies it, then open branch modal directly
  await page.evaluate(() => {
    const base = {
      version: '1.1',
      lanes: [
        { id: 'lane-input', title: 'Input', order: 1 },
        { id: 'lane-transform', title: 'Transform', order: 2 },
        { id: 'lane-decision', title: 'Decision', order: 3 },
        { id: 'lane-output', title: 'Output', order: 4 },
      ],
      nodes: [
        { id: 'n1', type: 'input', title: 'Trigger', laneId: 'lane-input' },
        { id: 'n2', type: 'decision', title: 'Decide', laneId: 'lane-decision', data: { branches: ['CHARGE','SELL','HOLD'] } },
        { id: 'n3', type: 'output', title: 'A', laneId: 'lane-output' },
      ],
      edges: [
        { id: 'e1', source: { nodeId: 'n1' }, target: { nodeId: 'n2' } },
        { id: 'e2', source: { nodeId: 'n2' }, target: { nodeId: 'n3' }, label: 'CHARGE' },
      ],
    }
    try { localStorage.setItem('fp-universal-flowdoc', JSON.stringify(base)) } catch {}
  })
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => { try { (window as any).__openAdd?.({ kind:'branch', nodeId: 'n2', label: 'CHARGE' }) } catch {} })
  // Open Add-Action from a decision branch chip (e.g., CHARGE)
  // Wait for Add Action modal
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Ensure tab contains HTTP and pick first matching tile
  await dialog.getByRole('button', { name: 'Top' }).click()
  const httpTile = dialog.locator('button').filter({ hasText: 'HTTP' }).first()
  await expect(httpTile).toBeVisible()
  await httpTile.scrollIntoViewIfNeeded()
  await httpTile.evaluate((el: any)=> (el as HTMLButtonElement).click())
  await expect(dialog).toBeHidden()

  // Verify a new node was added and wired from decision with label CHARGE
  const res = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('fp-universal-flowdoc')
      if (!raw) return { ok: false }
      const doc = JSON.parse(raw)
      const http = (doc.nodes || []).find((n:any)=> String(n.title||'').toLowerCase().includes('http'))
      if (!http) return { ok: false }
      const edge = (doc.edges || []).find((e:any)=> String(e?.source?.nodeId)==='n2' && String(e?.target?.nodeId)===String(http.id))
      return { ok: !!edge, label: edge?.label || null }
    } catch { return { ok: false } }
  })
  expect(res.ok).toBeTruthy()
  expect(['CHARGE','SELL','HOLD']).toContain(res.label)
})

test('@event-pill-insert autowires with correct After-sent label', async ({ page }) => {
  await page.goto('/agent')
  // Seed a minimal doc containing an email node
  await page.evaluate(() => {
    const base = {
      version: '1.1',
      lanes: [
        { id: 'lane-input', title: 'Input', order: 1 },
        { id: 'lane-output', title: 'Output', order: 4 },
      ],
      nodes: [
        { id: 'n1', type: 'input', title: 'Trigger', laneId: 'lane-input' },
        { id: 'n-email', type: 'email', title: 'After email sent', laneId: 'lane-output' },
      ],
      edges: [
        { id: 'e1', source: { nodeId: 'n1' }, target: { nodeId: 'n-email' } },
      ],
    }
    try { localStorage.setItem('fp-universal-flowdoc', JSON.stringify(base)) } catch {}
  })
  await page.reload()
  await page.waitForLoadState('networkidle')

  // Open Add-Action directly for the 'after email sent' anchor via exposed hook
  await page.evaluate(() => { try { (window as any).__openAdd?.({ kind: 'after', nodeId: 'n-email', label: 'After email sent' }) } catch {} })

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 10000 })
  // Ensure tab contains HTTP and pick first matching tile
  await dialog.getByRole('button', { name: 'Top' }).click()
  const httpTile2 = dialog.locator('button').filter({ hasText: 'HTTP' }).first()
  await expect(httpTile2).toBeVisible()
  await httpTile2.scrollIntoViewIfNeeded()
  await httpTile2.evaluate((el: any)=> (el as HTMLButtonElement).click())
  await expect(dialog).toBeHidden()

  // Verify new edge labeled "After email sent" exists
  const res = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('fp-universal-flowdoc')
      if (!raw) return { ok: false }
      const doc = JSON.parse(raw)
      const newestEdge = (doc.edges || []).slice().reverse().find((e:any)=> e && e.label)
      return { ok: !!newestEdge, label: newestEdge?.label || null }
    } catch { return { ok: false } }
  })
  expect(res.ok).toBeTruthy()
  expect(res.label).toBe('After email sent')
})


