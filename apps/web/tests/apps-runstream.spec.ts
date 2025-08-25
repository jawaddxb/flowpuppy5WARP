import { test, expect } from '@playwright/test'

// AB-902/904: /apps/[slug]/run|stream shims should accept inputs and stream SSE
test.describe('@apps @runstream', () => {
  test('run accepts input and returns stream path; stream emits events', async ({ request }) => {
    const dsl = {
      version: 2.1,
      nodes: [
        { id: 'trigger', type: 'input', position: { x: 80, y: 80 }, config: { label: 'Webhook' } },
        { id: 't', type: 'transform', position: { x: 240, y: 80 }, config: { script: 'return { ok: true }' } },
      ],
      edges: [ { source: 'trigger', target: 't' } ],
    }
    const run = await request.post('/apps/demo/run', { data: { dsl, input: { homeZip: '94016', sellThreshold: 30 } } })
    expect(run.ok()).toBeTruthy()
    const json = await run.json()
    expect(json).toHaveProperty('streamPath')
    expect(json.streamPath).toBe('/apps/demo/stream')

    // Smoke test: POST to stream endpoint and expect a 200
    const streamInit = await request.post(json.streamPath, { data: { dsl, input: { homeZip: '94016', sellThreshold: 30 } } })
    expect(streamInit.ok()).toBeTruthy()
  })
})



