import type { WorkflowDsl, DslEdge } from './dsl'

// Heuristic "structure & connect" to make sparse DSLs readable A→Z for newbies
// - If edges are missing or very sparse, connect nodes linearly in declaration order
// - Preserve existing edges; do not duplicate
// - Optionally label edges if a following node looks like success/failure

export function structureAndConnectLinear(dsl: WorkflowDsl): WorkflowDsl {
  const nodes = Array.isArray(dsl.nodes) ? dsl.nodes : []
  const edges = Array.isArray(dsl.edges) ? [...dsl.edges] : []
  if (nodes.length <= 1) return dsl

  // Build quick lookup to avoid duplicates
  const edgeKey = (e: DslEdge) => `${e.source}→${e.target}`
  const existing = new Set(edges.map(edgeKey))

  // Count existing connections; if already dense enough, skip
  if (edges.length >= Math.max(0, nodes.length - 1)) {
    return { ...dsl, edges }
  }

  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i]
    const b = nodes[i + 1]
    if (!a || !b) continue
    const key = `${a.id}→${b.id}`
    if (existing.has(key)) continue

    // Try to infer a friendly label for success/failure tails
    const label = inferEdgeLabelFromNode(String((b as any)?.type || ''), b as any)
    edges.push({ source: String(a.id), target: String(b.id), label })
    existing.add(key)
  }

  return { ...dsl, edges }
}

// Upgrade pass: inject decision node and success/failure outputs when narrative implies an IF
export function structureWithDecisionHeuristics(dsl: WorkflowDsl): WorkflowDsl {
  let out = structureAndConnectLinear(dsl)
  const nodes = [...out.nodes]
  const edges = [...out.edges]
  // Find any node whose label/config suggests a decision
  const hasDecision = nodes.some((n:any)=> String((n as any)?.type||'').toLowerCase().includes('switch') || /has\s+|if\s+/i.test(String(((n as any).config as any)?.label || '')))
  if (!hasDecision) return out
  // Ensure success/failure outputs exist
  const successId = nodes.find((n:any)=> /success/i.test(String(((n as any).config as any)?.label || '')))?.id || `success_${Math.random().toString(36).slice(2,7)}`
  const failureId = nodes.find((n:any)=> /fail|error/i.test(String(((n as any).config as any)?.label || '')))?.id || `failure_${Math.random().toString(36).slice(2,7)}`
  if (!nodes.some(n=> n.id===successId)) nodes.push({ id: successId, type: 'output', config: { label: 'Success' } })
  if (!nodes.some(n=> n.id===failureId)) nodes.push({ id: failureId, type: 'output', config: { label: 'Failure' } })
  // Link last node before outputs to decision branches if not present
  const last = nodes[nodes.length - 3] // roughly
  if (last) {
    const yesKey = `${last.id}→${successId}`
    const noKey = `${last.id}→${failureId}`
    const set = new Set(edges.map((e:any)=> `${e.source}→${e.target}`))
    if (!set.has(yesKey)) edges.push({ source: last.id, target: successId, label: 'Yes' })
    if (!set.has(noKey)) edges.push({ source: last.id, target: failureId, label: 'No' })
  }
  out = { ...out, nodes, edges }
  return out
}

function inferEdgeLabelFromNode(type: string, node: any): string | undefined {
  const t = (type || '').toLowerCase()
  const title = String((node as any)?.config?.label || (node as any)?.title || '').toLowerCase()
  if (t.includes('output')) return undefined
  if (title.includes('success')) return 'success'
  if (title.includes('failure') || title.includes('error')) return 'failure'
  return undefined
}


