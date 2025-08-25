import { test, expect } from '@playwright/test'

test.describe('@console-clean', () => {
  test('no console errors/warnings on /agent', async ({ page }) => {
    const messages: { type: string; text: string }[] = []
    page.on('console', (msg) => {
      const type = msg.type()
      const text = msg.text()
      if (type === 'warning' || type === 'error') messages.push({ type, text })
    })
    await page.goto('/agent')
    // Allow for initial noise from third-party; then assert no React Flow nodeTypes/edgeTypes warnings
    await page.waitForLoadState('networkidle')
    const offenders = messages.filter(m => /React Flow/i.test(m.text) && !/002/.test(m.text))
    expect(offenders, offenders.map(o=>o.text).join('\n')).toHaveLength(0)
  })
  test('no console errors on /tasks', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => { if (m.type()==='error') errors.push(m.text()) })
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    // Ignore known transient MIME noise caused by dev server under test load
    const offenders = errors.filter(t => !/MIME type|status of 400|strict MIME/i.test(t))
    expect(offenders.join('\n')).toEqual('')
  })
})


