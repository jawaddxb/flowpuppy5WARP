import { describe, it, expect } from 'vitest'
import { executeWorkflow } from './executor'

describe('executor http guard', () => {
  it('blocks disallowed HTTP method', async () => {
    const dsl: any = { version: '2.1', nodes: [
      { id: 'in', type: 'input', config: {} },
      { id: 'h', type: 'http', config: { url: 'https://api.openai.com/v1/test', method: 'TRACE' } },
    ], edges: [ { id: 'e', source: 'in', target: 'h' } ] }
    const events: any[] = []
    for await (const ev of executeWorkflow(dsl, {}, {})) events.push(ev)
    const httpEv = events.find(e=> e.nodeId==='h')
    expect(httpEv.status).toBe('error')
    expect(String(httpEv.error)).toContain('method not allowed')
  })

  it('blocks non-allowlisted host', async () => {
    const dsl: any = { version: '2.1', nodes: [
      { id: 'in', type: 'input', config: {} },
      { id: 'h', type: 'http', config: { url: 'https://internal.local/secret', method: 'GET' } },
    ], edges: [ { id: 'e', source: 'in', target: 'h' } ] }
    const events: any[] = []
    for await (const ev of executeWorkflow(dsl, {}, {})) events.push(ev)
    const httpEv = events.find(e=> e.nodeId==='h')
    expect(httpEv.status).toBe('error')
    expect(String(httpEv.error)).toContain('host not allowed')
  })

  it('blocks oversized request body', async () => {
    const big = 'x'.repeat(1_100_000)
    const dsl: any = { version: '2.1', nodes: [
      { id: 'in', type: 'input', config: {} },
      { id: 'h', type: 'http', config: { url: 'https://api.openai.com/v1/test', method: 'POST', body: { data: big } } },
    ], edges: [ { id: 'e', source: 'in', target: 'h' } ] }
    const events: any[] = []
    for await (const ev of executeWorkflow(dsl, {}, {})) events.push(ev)
    const httpEv = events.find(e=> e.nodeId==='h')
    expect(httpEv.status).toBe('error')
    expect(String(httpEv.error)).toContain('body too large')
  })
})


