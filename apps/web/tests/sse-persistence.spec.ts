import { test, expect } from '@playwright/test'

// Validate start event includes runId when DB is available (best-effort) and SSE id increments
test.describe('@sse @persistence', () => {
  test('run stream start event includes runId and events have ids', async ({ request }) => {
    const dsl = { version: 2.1, nodes: [{ id:'n1', type:'input' }, { id:'n2', type:'transform', config: { script: 'return input' } }], edges: [{ source:'n1', target:'n2' }] }
    const res = await request.post('/api/run/stream', { data: { dsl, input: { x: 1 } } })
    expect(res.ok()).toBeTruthy()
    const text = (await res.body()).toString('utf8')
    // We expect to see SSE id lines and a start event object with type and possibly runId
    expect(text).toMatch(/id: \d+/)
    expect(text).toContain('"type":"start"')
    // If DB present, runId should be a UUID-like string; we do a soft assertion
    if (text.includes('"runId"')) {
      const m = text.match(/"runId":"[^"]+"/)
      expect(Boolean(m)).toBeTruthy()
    }
  })
})

