import { describe, it, expect } from 'vitest'
import { flowDocToDsl } from './adapter'
import { linearFlow } from './fixtures'

describe('flowDocToDsl', () => {
  it('maps nodes and edges', () => {
    const dsl = flowDocToDsl(linearFlow)
    expect(dsl.nodes.length).toBe(3)
    expect(dsl.edges.length).toBe(2)
  })
})



