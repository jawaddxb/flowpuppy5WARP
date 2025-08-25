import { describe, it, expect } from 'vitest'
import { agentSpecToFlowDoc } from './adapter'
import { flowDocToDsl } from '@/lib/flowdoc/adapter'
import { dslToFlowDoc } from '@/lib/flowdoc/fromDsl'
import { buildDiff } from '@/lib/diff'

describe('adapter: agentSpecToFlowDoc', () => {
  it('adapter maps schedule, sources, decision, email', () => {
    const doc = agentSpecToFlowDoc({
      name: 'Energy',
      inputs: { schedule: { type: 'interval', value: 'hourly' } },
      sources: { prices: { type: 'api' }, weather: { type: 'openweather' } },
      analysis: { merge: true },
      decision: { rules: [{ when: 'x', action: 'CHARGE' }] },
      actions: { notification: { type: 'email', to: 'user@example.com' } },
    })
    const ids = new Set(doc.nodes.map(n => n.id))
    expect(ids.has('n-schedule')).toBe(true)
    expect(ids.has('n-prices')).toBe(true)
    expect(ids.has('n-weather')).toBe(true)
    expect(ids.has('n-analyze')).toBe(true)
    expect(ids.has('n-decision')).toBe(true)
    expect(ids.has('n-email')).toBe(true)
  })

  it('adapter diff round-trip: AgentSpec -> FlowDoc -> DSL -> FlowDoc deterministically', () => {
    const docA = agentSpecToFlowDoc({
      name: 'Energy',
      inputs: { schedule: { type: 'interval', value: 'hourly' } },
      sources: { prices: { type: 'api' }, weather: { type: 'openweather' } },
      analysis: { merge: true },
      decision: { rules: [{ when: 'x', action: 'CHARGE' }] },
      actions: { notification: { type: 'email', to: 'user@example.com' } },
    })
    const dsl = flowDocToDsl(docA as any)
    const docB = dslToFlowDoc(dsl as any) as any
    // Accept minor differences in ids, but the diff should be empty on nodes/edges presence
    const diff = buildDiff(
      { ...docA, nodes: (docA.nodes as any[]).map((n:any)=> ({...n, id: String(n.id)})) } as any,
      { ...docB, nodes: (docB.nodes as any[]).map((n:any)=> ({...n, id: String(n.id)})) } as any,
    )
    expect(diff.nodesRemoved.length).toBe(0)
    expect(diff.edgesRemoved.length).toBe(0)
  })
})



