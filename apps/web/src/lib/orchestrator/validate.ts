import type { FlowDoc } from '@/lib/flowdoc/schema'

export type RuntimeValidation = { ok: boolean; errors?: string[] }

// Internal graph view for runtime checks
function analyzeGraph(doc: FlowDoc) {
  const nodes = doc.nodes || []
  const edges = doc.edges || []
  const byId = new Map(nodes.map(n => [String(n.id), n]))
  const out = new Map<string, string[]>()
  const inDeg = new Map<string, number>()
  for (const n of nodes) inDeg.set(String(n.id), 0)
  for (const e of edges) {
    const s = String((e as any)?.source?.nodeId || '')
    const t = String((e as any)?.target?.nodeId || '')
    if (!byId.has(s) || !byId.has(t)) continue
    const arr = out.get(s) || []
    arr.push(t)
    out.set(s, arr)
    inDeg.set(t, (inDeg.get(t) || 0) + 1)
  }
  return { nodes, edges, byId, out, inDeg }
}

// Validate a "join" node’s runtime rules
export function validateJoinNode(node: any, ctx: { inDeg: Map<string, number> }): string[] {
  const errs: string[] = []
  const indeg = ctx.inDeg.get(String(node.id)) || 0
  if (indeg < 2) errs.push(`join ${node.id} requires >=2 incoming edges`)
  // Optional policy check if provided under data.joinPolicy
  const p = (node as any)?.data?.joinPolicy
  if (p != null) {
    const valid = p === 'all' || p === 'any' || (typeof p === 'object' && (typeof p.count === 'number' || typeof p.deadlineMs === 'number'))
    if (!valid) errs.push(`join ${node.id} has invalid joinPolicy`)
  }
  return errs
}

// Validate a "race" node’s runtime rules
export function validateRaceNode(node: any, ctx: { inDeg: Map<string, number> }): string[] {
  const errs: string[] = []
  const indeg = ctx.inDeg.get(String(node.id)) || 0
  if (indeg < 2) errs.push(`race ${node.id} requires >=2 incoming edges`)
  // Recommend timeout (surface as error to enforce in RC)
  const timeout = (node as any)?.data?.timeoutMs ?? (node as any)?.data?.timeout
  if (timeout == null || typeof timeout !== 'number' || timeout <= 0) {
    errs.push(`race ${node.id} should configure a positive timeoutMs`)
  }
  return errs
}

// Validate a map/loop node’s runtime rules
export function validateMapLoopNode(node: any, ctx: { out: Map<string, string[]> }): string[] {
  const errs: string[] = []
  const t = String(node.type || '').toLowerCase()
  const isMapLike = t.includes('map') || t.includes('loop')
  if (!isMapLike) return errs
  const data = (node as any)?.data || {}
  // Input collection field must be specified
  const inputField = data.inputField || data.itemsField || data.sourceField
  if (!inputField || typeof inputField !== 'string') {
    errs.push(`mapLoop ${node.id} must specify an input array field (data.inputField)`) 
  }
  // Require at least one outgoing edge (loop body)
  const next = ctx.out.get(String(node.id)) || []
  if (next.length === 0) errs.push(`mapLoop ${node.id} must have a loop body (no outgoing edges)`) 
  // Safety limits
  if (data.maxIterations != null && (typeof data.maxIterations !== 'number' || data.maxIterations <= 0)) {
    errs.push(`mapLoop ${node.id} has invalid maxIterations`)
  }
  if (data.concurrent && (data.concurrencyLimit == null || data.concurrencyLimit <= 0)) {
    errs.push(`mapLoop ${node.id} concurrent mode requires positive concurrencyLimit`)
  }
  return errs
}

export function validateRuntimeSemantics(doc: FlowDoc): RuntimeValidation {
  const errors: string[] = []
  try {
    const { nodes, byId, out, inDeg } = analyzeGraph(doc)

    // Edge references sanity
    for (const e of (doc.edges || [])) {
      const s = String((e as any)?.source?.nodeId || '')
      const t = String((e as any)?.target?.nodeId || '')
      if (!byId.has(s) || !byId.has(t)) errors.push(`edge references missing node: ${s}->${t}`)
    }

    // Loop/map-specific checks (self-cycles, concurrency)
    for (const n of nodes) {
      const type = String(n.type || '').toLowerCase()
      if (type === 'loop' || type.includes('map')) {
        const next = out.get(String(n.id)) || []
        const selfBack = next.filter(t => t === String(n.id)).length
        if (selfBack > 1) errors.push(`loop ${n.id} has multiple self-edges`)
        const mc = (n as any)?.data?.maxConcurrent
        if (mc != null && typeof mc === 'number' && mc <= 0) errors.push(`loop ${n.id} has invalid maxConcurrent`)
        errors.push(...validateMapLoopNode(n, { out }))
      }
    }

    // Join/race validations
    for (const n of nodes) {
      const t = String(n.type || '').toLowerCase()
      if (t.includes('join')) errors.push(...validateJoinNode(n, { inDeg }))
      if (t.includes('race')) errors.push(...validateRaceNode(n, { inDeg }))
    }
  } catch (e: any) {
    errors.push(`validation exception: ${String(e?.message || e)}`)
  }
  return { ok: errors.length === 0, errors: errors.length ? errors : undefined }
}
