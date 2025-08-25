import { describe, it, expect } from 'vitest'
import { ZFlowDoc, type FlowDoc } from '@/lib/flowdoc/schema'
import { validateRuntimeSemantics, validateJoinNode, validateRaceNode, validateMapLoopNode } from './validate'

function makeDoc(partial: Partial<FlowDoc>): FlowDoc {
  const base: FlowDoc = {
    version: '1.1',
    lanes: [
      { id: 'lane-input', title: 'Input', order: 0 },
      { id: 'lane-transform', title: 'X', order: 1 },
    ],
    nodes: [],
    edges: [],
  }
  const doc = { ...base, ...partial }
  const parsed = ZFlowDoc.parse(doc)
  return parsed
}

describe('Runtime validators (join/race/mapLoop)', () => {
  it('flags join with <2 inputs and invalid policy', () => {
    const doc = makeDoc({
      nodes: [
        { id: 'a', type: 'action', laneId: 'lane-input' },
        { id: 'j', type: 'join', laneId: 'lane-transform', data: { joinPolicy: 'invalid' } },
      ] as any,
      edges: [
        { id: 'e1', source: { nodeId: 'a' }, target: { nodeId: 'j' } },
      ],
    })
    const res = validateRuntimeSemantics(doc)
    expect(res.ok).toBe(false)
    expect(res.errors?.some(e => e.includes('join j requires >=2 incoming edges'))).toBe(true)
    expect(res.errors?.some(e => e.includes('invalid joinPolicy'))).toBe(true)
  })

  it('flags race with <2 inputs and missing timeout', () => {
    const doc = makeDoc({
      nodes: [
        { id: 'a', type: 'action', laneId: 'lane-input' },
        { id: 'r', type: 'race', laneId: 'lane-transform' },
      ] as any,
      edges: [
        { id: 'e1', source: { nodeId: 'a' }, target: { nodeId: 'r' } },
      ],
    })
    const res = validateRuntimeSemantics(doc)
    expect(res.ok).toBe(false)
    expect(res.errors?.some(e => e.includes('race r requires >=2 incoming edges'))).toBe(true)
    expect(res.errors?.some(e => e.includes('should configure a positive timeoutMs'))).toBe(true)
  })

  it('flags mapLoop without inputField or loop body', () => {
    const doc = makeDoc({
      nodes: [
        { id: 'm', type: 'map', laneId: 'lane-transform', data: {} },
      ] as any,
      edges: [],
    })
    const res = validateRuntimeSemantics(doc)
    expect(res.ok).toBe(false)
    expect(res.errors?.some(e => e.includes('must specify an input array field'))).toBe(true)
    expect(res.errors?.some(e => e.includes('must have a loop body'))).toBe(true)
  })

  it('passes for valid join/race/mapLoop configuration', () => {
    const doc = makeDoc({
      nodes: [
        { id: 'in1', type: 'input', laneId: 'lane-input' },
        { id: 'in2', type: 'input', laneId: 'lane-input' },
        { id: 'j', type: 'join', laneId: 'lane-transform', data: { joinPolicy: 'all' } },
        { id: 'r', type: 'race', laneId: 'lane-transform', data: { timeoutMs: 1000 } },
        { id: 'm', type: 'map', laneId: 'lane-transform', data: { inputField: 'items', maxIterations: 10, concurrent: true, concurrencyLimit: 2 } },
      ] as any,
      edges: [
        { id: 'e1', source: { nodeId: 'in1' }, target: { nodeId: 'j' } },
        { id: 'e2', source: { nodeId: 'in2' }, target: { nodeId: 'j' } },
        { id: 'e3', source: { nodeId: 'j' }, target: { nodeId: 'r' } },
        { id: 'e4', source: { nodeId: 'm' }, target: { nodeId: 'r' } },
      ],
    })
    const res = validateRuntimeSemantics(doc)
    expect(res.ok).toBe(true)
    expect(res.errors?.length || 0).toBe(0)
  })
})

