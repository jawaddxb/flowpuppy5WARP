import { describe, it, expect } from 'vitest'
import { POST as PLAN } from '../plan/route'
import { POST as CONFIRM } from '../confirm/route'
import { POST as GENERATE } from '../generate/route'

function makeReq(body: any) {
  return new Request('http://localhost', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
}

describe('agent api', () => {
  it('plan returns plan with nodeIds and validates DSL', async () => {
    const res = await PLAN(makeReq({ prompt: 'energy optimizer hourly email' }))
    expect(res.ok).toBe(true)
    const j: any = await res.json()
    expect(Array.isArray(j?.options?.plan)).toBe(true)
    const first = j?.options?.plan?.[0]
    expect(typeof first?.text).toBe('string')
    expect(Array.isArray(first?.nodeIds)).toBe(true)
  })

  it('confirm validates and returns AgentSpec', async () => {
    const res = await CONFIRM(makeReq({ selections: { schedule: { type: 'interval', value: 'hourly' }, analysis: { merge: true } } }))
    expect(res.ok).toBe(true)
    const j: any = await res.json()
    expect(j?.agentSpec?.name).toBeTypeOf('string')
  })

  it('generate validates AgentSpec and returns FlowDoc v1.1', async () => {
    const spec = { name: 'Energy', inputs: { schedule: { type: 'interval', value: 'hourly' } }, analysis: { merge: true } }
    const res = await GENERATE(makeReq({ agentSpec: spec }))
    expect(res.ok).toBe(true)
    const j: any = await res.json()
    expect(j?.flowDoc?.version).toBe('1.1')
    expect(Array.isArray(j?.flowDoc?.nodes)).toBe(true)
  })
})


