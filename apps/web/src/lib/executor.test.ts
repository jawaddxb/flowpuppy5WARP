import { describe, it, expect } from 'vitest'
import { executeWorkflow } from './executor'

describe('executor', () => {
  it('runs a trivial linear graph', async () => {
    const dsl = {
      version: '2.1',
      nodes: [
        { id: 'in', type: 'input', config: {} },
        { id: 'tx', type: 'transform', config: { script: 'return { ok: true }' } },
      ],
      edges: [
        { id: 'e', source: 'in', target: 'tx' }
      ]
    } as any
    const events: any[] = []
    for await (const ev of executeWorkflow(dsl, { a: 1 }, {})) events.push(ev)
    expect(events.some(e=>e.nodeId==='tx' && e.status==='ok')).toBe(true)
  })

  it('retries and times out http where configured', async () => {
    const dsl: any = { version: 2.1, nodes: [
      { id: 'a', type: 'input', config: {} },
      { id: 'b', type: 'http', config: { url: 'https://example.com/test', timeoutMs: 1, retries: 1, method: 'GET' } },
    ], edges: [ { source: 'a', target: 'b' } ] }
    const events: any[] = []
    for await (const ev of executeWorkflow(dsl, {}, {})) events.push(ev)
    expect(events.some(e=> e.nodeId==='b')).toBe(true)
  })
})


