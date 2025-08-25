import { describe, it, expect } from 'vitest'
import { executeWorkflow } from './executor'

describe('executor transform sandbox', () => {
  it('propagates thrown error from transform', async () => {
    const dsl: any = { version: '2.1', nodes: [
      { id: 'in', type: 'input', config: {} },
      { id: 'tx', type: 'transform', config: { script: 'throw new Error("bad")' } },
    ], edges: [ { id: 'e', source: 'in', target: 'tx' } ] }
    const events: any[] = []
    for await (const ev of executeWorkflow(dsl, {}, {})) events.push(ev)
    const tx = events.find(e=> e.nodeId==='tx')
    expect(tx.status).toBe('error')
    expect(String(tx.error).toLowerCase()).toContain('bad')
  })
})


