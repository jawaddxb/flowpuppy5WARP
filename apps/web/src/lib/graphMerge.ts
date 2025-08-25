import type { Node, Edge } from 'reactflow'

export function mergeDslIntoGraph(
  dslNodes: Array<{ id: string; type: string; config?: Record<string, unknown>; position?: { x: number; y: number } }>,
  dslEdges: Array<{ source: string; target: string; label?: string; data?: Record<string, unknown> }>,
  currentNodes: Node[],
  currentEdges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  const byId = new Map(currentNodes.map(n => [n.id, n]))
  const nextNodes: Node[] = [...currentNodes]
  for (const dn of dslNodes) {
    const existing = byId.get(dn.id)
    if (existing) {
      const mergedData = { ...(existing.data || {}), ...(dn.config || {}) }
      nextNodes.splice(nextNodes.findIndex(n => n.id === dn.id), 1, {
        ...existing,
        type: (dn.type as any) || existing.type,
        data: mergedData as any,
        position: dn.position || existing.position,
      })
    } else {
      nextNodes.push({ id: dn.id, type: dn.type as any, data: (dn.config || {}) as any, position: dn.position || { x: 100, y: 100 } } as any)
    }
  }
  const edgeKey = (e: { source: string; target: string; label?: string }) => `${e.source}->${e.target}:${e.label || ''}`
  const curEdgeKeys = new Set(currentEdges.map(e => edgeKey({ source: e.source, target: e.target, label: (e as any).label })))
  const addEdges: Edge[] = []
  for (const de of dslEdges) {
    if (!curEdgeKeys.has(edgeKey(de))) {
      addEdges.push({ id: `e_${Math.random().toString(36).slice(2,8)}`, source: de.source, target: de.target, label: (de.label as any), data: (de.data as any) } as any)
    }
  }
  const nextEdges = [...currentEdges, ...addEdges]
  return { nodes: nextNodes, edges: nextEdges }
}



