import type { FlowDoc } from '@/lib/flowdoc/schema'

export type Diff = {
  nodesAdded: Array<{ id: string; title: string; type: string; laneId: string }>
  nodesRemoved: string[]
  nodesChanged: Array<{ id: string; before: any; after: any }>
  edgesAdded: Array<{ source: string; target: string; label?: string }>
  edgesRemoved: Array<{ source: string; target: string }>
}

const pickNode = (n: any) => ({ id: String(n.id), title: String(n.title||''), type: String(n.type||''), laneId: String(n.laneId||'') })

export function buildDiff(before: FlowDoc, after: FlowDoc): Diff {
  const beforeNodes = new Map<string, any>((before.nodes || []).map((n: any) => [String(n.id), n]))
  const afterNodes = new Map<string, any>((after.nodes || []).map((n: any) => [String(n.id), n]))

  const nodesAdded: Diff['nodesAdded'] = []
  const nodesRemoved: Diff['nodesRemoved'] = []
  const nodesChanged: Diff['nodesChanged'] = []

  for (const [id, n] of afterNodes.entries()) {
    if (!beforeNodes.has(id)) {
      nodesAdded.push(pickNode(n))
    } else {
      const a = pickNode(n)
      const b = pickNode(beforeNodes.get(id))
      if (a.title !== b.title || a.type !== b.type || a.laneId !== b.laneId) {
        nodesChanged.push({ id, before: b, after: a })
      }
    }
  }
  for (const [id] of beforeNodes.entries()) {
    if (!afterNodes.has(id)) nodesRemoved.push(id)
  }

  const edgeKey = (e: { source: string; target: string; label?: string }) => `${e.source}->${e.target}:${e.label || ''}`
  const beforeEdges = (before.edges || []).map((e: any) => ({ source: String(e?.source?.nodeId||''), target: String(e?.target?.nodeId||''), label: e?.label ? String(e.label) : undefined }))
  const afterEdges = (after.edges || []).map((e: any) => ({ source: String(e?.source?.nodeId||''), target: String(e?.target?.nodeId||''), label: e?.label ? String(e.label) : undefined }))
  const beforeSet = new Set(beforeEdges.map(edgeKey))
  const afterSet = new Set(afterEdges.map(edgeKey))
  const edgesAdded = afterEdges.filter(e => !beforeSet.has(edgeKey(e)))
  const edgesRemoved = beforeEdges.filter(e => !afterSet.has(edgeKey(e))).map(e => ({ source: e.source, target: e.target }))

  return { nodesAdded, nodesRemoved, nodesChanged, edgesAdded, edgesRemoved }
}


