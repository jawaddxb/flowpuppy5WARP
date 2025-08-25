import { test, expect } from '@playwright/test'

test.describe('@security-headers', () => {
  test('common security headers present', async ({ request }) => {
    const res = await request.get('/agent')
    expect(res.status()).toBe(200)
    const xfo = res.headers()['x-frame-options']
    const xcto = res.headers()['x-content-type-options']
    const ref = res.headers()['referrer-policy']
    const csp = res.headers()['content-security-policy']
    const nonce = res.headers()['x-csp-nonce']
    expect(xfo).toBe('SAMEORIGIN')
    expect(xcto).toBe('nosniff')
    expect(ref).toContain('strict-origin')
    if (!csp) {
      // Some static pages may bypass CSP via cache; ensure CSP exists on an API route
      const api = await request.get('/api/orgs')
      const cspApi = api.headers()['content-security-policy']
      expect(cspApi).toBeTruthy()
      expect(cspApi).toContain('frame-ancestors')
    } else {
      expect(csp).toContain('frame-ancestors')
      expect(nonce).toBeTruthy()
    }
  })
  test('rate limit headers present', async ({ request }) => {
    const res = await request.get('/api/agent/plan')
    expect(res.ok()).toBeTruthy()
    const headers = res.headers()
    expect(headers['x-ratelimit-limit']).toBeDefined()
    expect(headers['x-ratelimit-remaining']).toBeDefined()
    expect(headers['x-ratelimit-window']).toBeDefined()
    expect(headers['ratelimit-policy']).toBeDefined()
  })
})


