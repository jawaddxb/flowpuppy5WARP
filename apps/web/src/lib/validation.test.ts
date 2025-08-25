import { describe, it, expect } from 'vitest'
import type { Node } from 'reactflow'
import { validateGraph, validateNode } from './validation'

function node(id: string, type: string, data: any = {}): Node<any> {
  return { id, type: type as any, data, position: { x: 0, y: 0 } } as any
}

describe('validation', () => {
  it('validates required fields for http', () => {
    const n = node('a', 'http', { method: 'GET' })
    const errs = validateNode(n)
    expect(errs.some(e=>e.field==='url')).toBe(true)
  })

  it('detects self-loop and guarded edge without guard', () => {
    const nodes = [node('a', 'http', { url: 'https://example.com' }), node('b', 'email', { to: 'x@y.z' })]
    const edges = [
      { id: 'e1', source: 'a', target: 'a' },
      { id: 'e2', source: 'a', target: 'b', data: { type: 'guarded' } },
    ]
    const { graphIssues } = validateGraph(nodes as any, edges as any)
    expect(graphIssues.some(g=>g.message.includes('cannot connect to itself'))).toBe(true)
    expect(graphIssues.some(g=>g.message.includes('guarded but has no expression'))).toBe(true)
  })

  it('requires trycatch to have try and catch edges', () => {
    const nodes = [node('t','trycatch',{}), node('x','transform',{})]
    const edges = [ { id: 'e', source: 't', target: 'x', label: 'try' } ]
    const { graphIssues } = validateGraph(nodes as any, edges as any)
    expect(graphIssues.some(g=> g.field === 'trycatch')).toBe(true)
  })
})



