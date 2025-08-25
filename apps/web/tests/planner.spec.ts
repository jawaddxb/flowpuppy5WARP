import { test, expect } from '@playwright/test'

test.describe('@planner', () => {
  test('plan endpoint returns structured options (mock-first)', async ({ request }) => {
    const res = await request.post('/api/agent/plan', { data: { prompt: 'Send me weather then email a summary' } })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json).toHaveProperty('options')
    expect(json).toHaveProperty('defaults')
  })

  test('generate endpoint returns valid DSL (mock-first)', async ({ request }) => {
    const spec = { name: 'Email weather summary', actions: { notification: { type: 'email', to: 'user@example.com' } } }
    const res = await request.post('/api/agent/generate', { data: { agentSpec: spec } })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json).toHaveProperty('flowDoc')
    expect(json.flowDoc).toHaveProperty('nodes')
    expect(Array.isArray(json.flowDoc.nodes)).toBeTruthy()
  })
})


