import { z } from 'zod'

// FlowDoc v1.1 (subset sufficient for UI/planner; extends universalDsl)

export const ZJoinPolicy = z.union([
  z.literal('all'),
  z.literal('any'),
  z.object({ count: z.number().int().positive() }),
  z.object({ deadlineMs: z.number().int().positive() }),
])

export const ZRetryPolicy = z.object({
  max: z.number().int().nonnegative(),
  backoff: z.enum(['const', 'linear', 'expo']),
  baseMs: z.number().int().positive().optional(),
  jitter: z.boolean().optional(),
  on: z.array(z.enum(['timeout', '5xx', '4xx', 'network'])).optional(),
}).optional()

export const ZResource = z.object({
  concurrency: z.number().int().positive().optional(),
  rateLimitPerSec: z.number().positive().optional(),
  budgetUSD: z.number().nonnegative().optional(),
  providerPool: z.string().optional(),
}).optional()

export const ZLane = z.object({ id: z.string(), title: z.string(), order: z.number().int() })

export const ZNodeBase = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string().optional(),
  laneId: z.string(),
  provider: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
  retry: ZRetryPolicy,
  timeoutMs: z.number().int().positive().optional(),
  idempotencyKey: z.string().optional(),
  compensateWith: z.string().optional(),
  resource: ZResource,
})

export const ZEdge = z.object({
  id: z.string(),
  source: z.object({ nodeId: z.string() }),
  target: z.object({ nodeId: z.string() }),
  label: z.string().optional(),
})

export const ZFlowDoc = z.object({
  version: z.literal('1.1'),
  meta: z.record(z.string(), z.any()).optional(),
  lanes: z.array(ZLane),
  nodes: z.array(ZNodeBase),
  edges: z.array(ZEdge),
})

export type FlowDoc = z.infer<typeof ZFlowDoc>

// Stricter validations per spec §2.2/§2.3
export const ZFlowDocStrict = ZFlowDoc.superRefine((val, ctx) => {
  try {
    const nodes = val.nodes || []
    const edges = val.edges || []
    const byId = new Map(nodes.map(n => [n.id, n]))
    const laneIds = new Set((val.lanes || []).map(l => l.id))
    // Unique node IDs
    if (byId.size !== nodes.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'duplicate node ids' })
    }
    // Unique edge IDs
    const edgeIds = new Set(edges.map(e => e.id))
    if (edgeIds.size !== edges.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'duplicate edge ids' })
    }
    // Nodes must reference existing lanes
    for (const n of nodes) {
      if (!laneIds.has(n.laneId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `node ${n.id} in unknown lane ${n.laneId}` })
      }
    }
    // In-degree / start nodes
    const inDeg = new Map<string, number>()
    for (const n of nodes) inDeg.set(n.id, 0)
    for (const e of edges) {
      if (!byId.has(e.source.nodeId) || !byId.has(e.target.nodeId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `edge ${e.id} references missing node` })
      }
      inDeg.set(e.target.nodeId, (inDeg.get(e.target.nodeId) || 0) + 1)
    }
    const startNodes = nodes.filter(n => (inDeg.get(n.id) || 0) === 0)
    if (startNodes.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'no start node (in-degree 0) found' })
    }
    // Require at least one start node to be an input/trigger/webhook/schedule
    const hasInputStart = startNodes.some(n => {
      const t = String(n.type || '').toLowerCase()
      return (t === 'input' || t === 'trigger' || t === 'webhook' || t === 'schedule')
    })
    if (!hasInputStart) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'no input/trigger start node found' })
    }
    // Non-input nodes should have at least one incoming edge
    for (const n of nodes) {
      const t = String(n.type || '').toLowerCase()
      const isInput = (t === 'input' || t === 'trigger' || t === 'webhook' || t === 'schedule')
      if (!isInput && (inDeg.get(n.id) || 0) === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `node ${n.id} has no incoming edge` })
      }
    }
    // Decision conventions: branches exist and edge labels ∈ branches
    const decisionBranches = new Map<string, string[]>()
    for (const n of nodes) {
      if (String(n.type).toLowerCase() === 'decision') {
        const branches = Array.isArray((n as any)?.data?.branches) ? ((n as any).data.branches as string[]) : []
        if (branches.length < 2) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `decision ${n.id} missing branches` })
        } else {
          decisionBranches.set(n.id, branches.map(b => String(b)))
        }
      }
    }
    for (const e of edges) {
      const src = byId.get(e.source.nodeId)
      if (src && String(src.type).toLowerCase() === 'decision') {
        const branches = decisionBranches.get(src.id) || []
        if (!e.label || !branches.includes(String(e.label))) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `edge ${e.id} from decision ${src.id} must have label ∈ branches` })
        }
      }
    }
    // DAG discipline: detect cycles strictly
    const incoming = new Map<string, number>()
    const outgoing = new Map<string, string[]>()
    for (const n of nodes) incoming.set(n.id, 0)
    for (const e of edges) {
      const s = e.source.nodeId, t = e.target.nodeId
      incoming.set(t, (incoming.get(t) || 0) + 1)
      const arr = outgoing.get(s) || []
      arr.push(t)
      outgoing.set(s, arr)
    }
    const queue: string[] = []
    for (const [id, deg] of incoming.entries()) if (deg === 0) queue.push(id)
    let visited = 0
    while (queue.length) {
      const id = queue.shift() as string
      visited++
      const next = outgoing.get(id) || []
      for (const t of next) {
        incoming.set(t, (incoming.get(t) || 0) - 1)
        if ((incoming.get(t) || 0) === 0) queue.push(t)
      }
    }
    if (visited < nodes.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'graph contains a cycle' })
    }
  } catch {}
})

export function validateFlowDocStrict(doc: unknown): { ok: boolean; issues?: string[] } {
  const res = ZFlowDocStrict.safeParse(doc)
  if (res.success) return { ok: true }
  const issues = res.error.issues?.map(i => i.message) || ['invalid flow']
  return { ok: false, issues }
}


