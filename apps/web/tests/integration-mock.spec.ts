import { test, expect } from '@playwright/test'

// Integration tests run with mock mode enabled via org=org-demo and E2E hooks
// These verify that planner endpoints return structurally valid JSON without hitting real providers.

test.describe('@integration @providers-mock planner/generate', () => {
  test('plan returns options.plan with nodeIds (mock)', async ({ request }) => {
    const res = await request.post('/api/agent/plan?org=org-demo', {
      data: { prompt: 'daily energy optimization pipeline' }
    })
    expect(res.ok()).toBeTruthy()
    const j = await res.json()
    expect(Array.isArray(j?.options?.plan)).toBeTruthy()
    const first = j.options.plan[0]
    expect(typeof first?.text).toBe('string')
    // With mocks we include nodeIds for downstream mapping
    expect(Array.isArray(first?.nodeIds)).toBeTruthy()
  })

  test('confirm returns AgentSpec (mock)', async ({ request }) => {
    const res = await request.post('/api/agent/confirm?org=org-demo', {
      data: { selections: { schedule: { type: 'interval', value: 'hourly' } } }
    })
    expect(res.ok()).toBeTruthy()
    const j = await res.json()
    expect(typeof j?.agentSpec?.name).toBe('string')
  })

  test('generate returns FlowDoc v1.1 (mock)', async ({ request }) => {
    const spec = { name: 'Energy', inputs: { schedule: { type: 'interval', value: 'hourly' } } }
    const res = await request.post('/api/agent/generate?org=org-demo', { data: { agentSpec: spec } })
    expect(res.ok()).toBeTruthy()
    const j = await res.json()
    expect(j?.flowDoc?.version).toBe('1.1')
    expect(Array.isArray(j?.flowDoc?.nodes)).toBeTruthy()
  })
})

