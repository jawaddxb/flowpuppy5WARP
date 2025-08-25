import { test, expect } from '@playwright/test'

test.describe('@providers-registry', () => {
  test('status endpoint returns registry-derived map (mock ok without keys)', async ({ request }) => {
    const res = await request.get('/api/providers/status')
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json).toHaveProperty('status')
    expect(typeof json.status).toBe('object')
    // openweather and gmail may be present depending on fixture-derived requirements
  })
})


