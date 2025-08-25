import { test, expect } from '@playwright/test'

test.describe('@providers-admin', () => {
  test('admin providers page renders and basic actions work (mock-first)', async ({ page }) => {
    await page.goto('/admin/providers')
    await expect(page.getByText('Admin • AI Providers')).toBeVisible()
    // Validate routing section and default purpose
    await expect(page.getByText('Routing Policies')).toBeVisible()
    const purposeBox = page.locator('div').filter({ hasText: /^Purpose/ }).getByRole('combobox')
    await expect(purposeBox).toBeVisible()
    // Add provider form present
    const addSection = page.locator('div').filter({ hasText: /^Add Provider/ }).first()
    await expect(addSection).toBeVisible()
  })

  test('credentials modal end-to-end save and test (mock)', async ({ page }) => {
    await page.goto('/admin/providers')
    // If redirected to login (edge runtime sign-in), bypass by setting a session cookie flag
    const needsLogin = await page.getByText('Sign in').first().isVisible().catch(()=>false)
    if (needsLogin) {
      await page.context().addCookies([{ name: 'fp-dev-auth', value: '1', url: page.url() }])
      await page.goto('/admin/providers')
    }
    await expect(page.getByText('Workflow Integrations')).toBeVisible()
    const quick = page.getByTestId('edit-credentials-quick')
    await quick.waitFor({ state: 'visible', timeout: 15000 })
    await quick.click({ timeout: 10000 })

    const modal = page.getByTestId('credentials-modal')
    await expect(modal).toBeVisible()

    const anyInput = modal.locator('input, textarea, select').first()
    if (await anyInput.count().then(c=>c>0)) {
      await anyInput.fill('test-value')
    }

    page.on('dialog', d => d.accept())
    await modal.getByRole('button', { name: 'Test connection' }).click({ timeout: 10000, force: true })
    await modal.getByRole('button', { name: 'Save' }).click({ timeout: 10000 })
  })

  test('openapi importer returns node templates scaffold', async ({ request }) => {
    const res = await request.post('/api/admin/providers/openapi/nodes', { data: { spec: { servers:[{url:'https://api.example.com'}], paths: { '/v1/items': { get: {} }, '/v1/users': { post: {} } } } } })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(Array.isArray(json.nodes)).toBeTruthy()
  })

  test('mcp tool discovery scaffold', async ({ request }) => {
    const res = await request.post('/api/admin/providers/mcp/tools', { data: { url: 'https://mcp.example.com/manifest.json' } })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(Array.isArray(json.tools)).toBeTruthy()
  })
})


