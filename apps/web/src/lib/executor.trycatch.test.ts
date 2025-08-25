import { describe, it, expect } from 'vitest'
import { executeWorkflow } from './executor'

describe('executor try/catch routing', () => {
  it('routes error to catch edge', async () => {
    const dsl: any = {
      version: 2.1,
      nodes: [
        { id: 'in', type: 'input', config: {} },
        { id: 'boom', type: 'transform', config: { script: 'throw new Error("boom")' } },
        { id: 'ok', type: 'transform', config: { script: 'return { ok: true }' } },
        { id: 'caught', type: 'transform', config: { script: 'return { caught: true }' } },
      ],
      edges: [
        { id: 'e1', source: 'in', target: 'boom' },
        { id: 'e2', source: 'boom', target: 'ok', data: { type: 'success' } },
        { id: 'e3', source: 'boom', target: 'caught', data: { type: 'error' } },
      ],
    }
    const events: any[] = []
    for await (const ev of executeWorkflow(dsl, {}, {})) events.push(ev)
    const boom = events.find(e=> e.nodeId==='boom')
    const caught = events.find(e=> e.nodeId==='caught')
    expect(boom.status).toBe('error')
    expect(caught).toBeTruthy()
  })
})



