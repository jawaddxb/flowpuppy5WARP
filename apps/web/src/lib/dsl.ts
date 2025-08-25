export type DslNode = {
  id: string
  type: string
  config?: Record<string, unknown>
  position?: { x: number; y: number }
  size?: { width: number; height: number }
  parentId?: string
}

export type DslEdge = {
  source: string
  target: string
  label?: string
  data?: Record<string, unknown>
  sourceHandle?: string
  targetHandle?: string
}

export type WorkflowDsl = {
  version: number
  nodes: DslNode[]
  edges: DslEdge[]
}

export function validateDsl(dsl: unknown): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = []
  if (!dsl || typeof dsl !== 'object') return { ok: false, errors: ['DSL must be an object'] }
  const w = dsl as WorkflowDsl
  if (typeof w.version !== 'number') errors.push('version must be a number')
  if (!Array.isArray(w.nodes) || w.nodes.length === 0) errors.push('nodes must be a non-empty array')
  if (!Array.isArray(w.edges)) errors.push('edges must be an array')
  const ids = new Set<string>()
  w.nodes?.forEach((n) => {
    if (!n?.id || !n?.type) errors.push('each node must have id and type')
    if (n?.id) {
      if (ids.has(n.id)) errors.push(`duplicate node id: ${n.id}`)
      ids.add(n.id)
    }
  })
  w.edges?.forEach((e) => {
    if (!e?.source || !e?.target) errors.push('each edge must have source and target')
    if (e?.source && !ids.has(e.source)) errors.push(`edge source not found: ${e.source}`)
    if (e?.target && !ids.has(e.target)) errors.push(`edge target not found: ${e.target}`)
  })
  return errors.length ? { ok: false, errors } : { ok: true }
}

// Simple transforms between ReactFlow graph and DSL
import type { Node, Edge } from 'reactflow'

export function toDsl(nodes: Node[], edges: Edge[]): WorkflowDsl {
  const dslNodes: DslNode[] = nodes.map((n) => ({
    id: n.id,
    type: (n.type as string) || 'node',
    config: n.data as Record<string, unknown> | undefined,
    position: n.position ? { x: n.position.x, y: n.position.y } : undefined,
    size: (n as any).width || (n as any).height ? { width: (n as any).width ?? 0, height: (n as any).height ?? 0 } : undefined,
    parentId: (n as any).parentNode as string | undefined,
  }))
  const dslEdges: DslEdge[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
    label: (e as any).label as string | undefined,
    data: (e as any).data as Record<string, unknown> | undefined,
    sourceHandle: (e as any).sourceHandle as string | undefined,
    targetHandle: (e as any).targetHandle as string | undefined,
  }))
  return { version: 2.1, nodes: dslNodes, edges: dslEdges }
}

export function fromDsl(dsl: WorkflowDsl): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = dsl.nodes.map((n, i) => {
    const base: Node = {
      id: n.id,
      type: (n.type as any) || 'node',
      data: (n.config ?? { label: n.type }) as any,
      position: n.position ?? { x: 100 + i * 200, y: 80 },
    }
    if (n.type === 'frame' && n.size) {
      ;(base as any).style = { width: n.size.width, height: n.size.height, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }
    }
    if ((n as any).parentId) {
      ;(base as any).parentNode = (n as any).parentId
      ;(base as any).extent = 'parent'
    }
    return base
  })
  const edges: Edge[] = dsl.edges.map((e, i) => ({ id: `e-${i}`, source: e.source, target: e.target, label: e.label as any, data: e.data as any }))
  return { nodes, edges }
}

