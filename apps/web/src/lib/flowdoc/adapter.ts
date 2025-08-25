import type { FlowDoc } from './schema'
import type { WorkflowDsl } from '../dsl'

export function flowDocToDsl(flow: FlowDoc): WorkflowDsl {
  const nodes = flow.nodes.map((n) => ({
    id: n.id,
    type: String(n.type || 'node'),
    config: { label: n.title, provider: n.provider, ...(n.data || {}) } as any,
  }))
  const edges = flow.edges.map((e, i) => ({
    source: e.source.nodeId,
    target: e.target.nodeId,
    label: e.label,
  }))
  return { version: 2.1 as any, nodes: nodes as any, edges: edges as any }
}



