import { describe, it, expect } from 'vitest'
import { ZFlowDoc } from './schema'
import { validateFlowDoc } from './validate'
import { linearFlow, decisionFlow, parallelFlow, raceFlow, mapLoopFlow } from './fixtures'

describe('FlowDoc v1.1 schema', () => {
  it('validates linear flow', () => {
    const res = ZFlowDoc.safeParse(linearFlow)
    expect(res.success).toBe(true)
  })
  it('validates decision flow', () => {
    const res = ZFlowDoc.safeParse(decisionFlow)
    expect(res.success).toBe(true)
  })
  it('validates parallel/race/mapLoop fixtures', () => {
    expect(ZFlowDoc.safeParse(parallelFlow).success).toBe(true)
    expect(ZFlowDoc.safeParse(raceFlow).success).toBe(true)
    expect(ZFlowDoc.safeParse(mapLoopFlow).success).toBe(true)
  })
  it('enforces no orphans and decision label rules', () => {
    const bad = JSON.parse(JSON.stringify(decisionFlow))
    // Make an orphan node
    bad.nodes.push({ id: 'orphan', type: 'action', title: 'Orphan', laneId: 'lane-transform' })
    const res = validateFlowDoc(bad as any)
    expect(res.issues.some(i => i.code === 'orphan')).toBe(true)

    // Decision with invalid label
    const bad2 = JSON.parse(JSON.stringify(decisionFlow))
    bad2.edges.push({ id: 'ex', source: { nodeId: 'n2' }, target: { nodeId: 'n3' }, label: 'NOT_A_BRANCH' })
    const res2 = validateFlowDoc(bad2 as any)
    expect(res2.issues.some(i => i.code === 'decision.label.invalid')).toBe(true)

    // Boolean decision semantics: branches Yes/No required and labels must be Yes/No
    const boolBad = JSON.parse(JSON.stringify(decisionFlow))
    boolBad.nodes = boolBad.nodes.map((n:any)=> n.id==='n2' ? { ...n, data: { branches: ['Yes','No'] } } : n)
    // Wrong labels True/False
    boolBad.edges = boolBad.edges.map((e:any)=> e.id==='e2' ? { ...e, label: 'True' } : e.id==='e3' ? { ...e, label: 'False' } : e)
    const res3 = validateFlowDoc(boolBad as any)
    expect(res3.issues.some(i => i.code === 'decision.label.boolean')).toBe(true)

    const boolGood = JSON.parse(JSON.stringify(decisionFlow))
    boolGood.nodes = boolGood.nodes.map((n:any)=> n.id==='n2' ? { ...n, data: { branches: ['Yes','No'] } } : n)
    boolGood.edges = boolGood.edges.map((e:any)=> e.id==='e2' ? { ...e, label: 'Yes' } : e.id==='e3' ? { ...e, label: 'No' } : e)
    const res4 = validateFlowDoc(boolGood as any)
    expect(res4.issues.some(i => i.code === 'decision.label.boolean')).toBe(false)
  })
})



