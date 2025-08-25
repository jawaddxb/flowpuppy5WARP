import type { FlowDoc } from './schema'

export type FlowDocIssue = { kind: 'error'|'warning'; code: string; message: string; nodeId?: string; edgeId?: string }

export function validateFlowDoc(doc: FlowDoc): { issues: FlowDocIssue[] } {
  const issues: FlowDocIssue[] = []
  const nodes = doc.nodes || []
  const edges = doc.edges || []
  const byId = new Map<string, any>(nodes.map((n: any) => [String(n.id), n]))

  // 1) No orphan nodes (all except inputs must be reachable from at least one input)
  const inputs = nodes.filter((n: any) => ['input','trigger','webhook','schedule'].includes(String(n.type||'').toLowerCase()))
  const startIds = new Set(inputs.map((n: any) => String(n.id)))
  const outMap = new Map<string, string[]>()
  for (const e of edges as any[]) {
    const s = String(e?.source?.nodeId || '')
    const t = String(e?.target?.nodeId || '')
    if (!s || !t) continue
    const arr = outMap.get(s) || []
    arr.push(t)
    outMap.set(s, arr)
  }
  const reachable = new Set<string>([...startIds])
  const q: string[] = [...startIds]
  while (q.length) {
    const id = q.shift() as string
    const next = outMap.get(id) || []
    for (const t of next) { if (!reachable.has(t)) { reachable.add(t); q.push(t) } }
  }
  for (const n of nodes as any[]) {
    const id = String(n.id)
    const isInput = startIds.has(id)
    if (!isInput && !reachable.has(id)) {
      issues.push({ kind: 'error', code: 'orphan', message: `Source node ${id} is not wired to a trigger. Click "Auto-wire sources" to fix.`, nodeId: id })
    }
  }

  // 2) Decision nodes must have ≥1 outgoing edge; edge labels must match node.data.branches if present
  const outCounts = new Map<string, number>()
  for (const e of edges as any[]) {
    const s = String(e?.source?.nodeId || '')
    if (s) outCounts.set(s, (outCounts.get(s) || 0) + 1)
  }
  for (const n of nodes as any[]) {
    const id = String(n.id)
    if (String(n.type||'').toLowerCase() === 'decision') {
      if (!outCounts.get(id)) issues.push({ kind:'error', code:'decision.outgoing', message:`Decision ${id} must have ≥1 outgoing edge`, nodeId:id })
      const branches = Array.isArray(n?.data?.branches) ? (n.data.branches as any[]).map((b:any)=> String(b)) : []
      if (branches.length) {
        // collect outgoing labels
        const outs = (edges as any[]).filter(e => String(e?.source?.nodeId||'') === id)
        const edgeLabels = new Set<string>(outs.map(e => String(e?.label || '')))
        for (const e of outs) {
          const lbl = String(e?.label || '')
          if (!lbl) issues.push({ kind:'warning', code:'decision.label.missing', message:`Edge ${e.id || `${id}->${String(e?.target?.nodeId||'')}`} missing label`, edgeId: e.id })
          else if (!branches.includes(lbl)) issues.push({ kind:'error', code:'decision.label.invalid', message:`Edge label '${lbl}' not in branches [${branches.join(', ')}]`, edgeId: e.id })
        }

        // Boolean decision conventions: if branches are boolean-like, enforce Yes/No branches and labels
        if (branches.length === 2 && (branches.includes('Yes') || branches.includes('No'))) {
          // Must contain both Yes and No in branches
          if (!(branches.includes('Yes') && branches.includes('No'))) {
            issues.push({ kind:'error', code:'decision.label.boolean', message:`Boolean decision ${id} should have branches 'Yes' and 'No'`, nodeId: id })
          }
          // Outgoing edges must include labels Yes and No
          if (!(edgeLabels.has('Yes') && edgeLabels.has('No'))) {
            issues.push({ kind:'error', code:'decision.label.boolean', message:`Boolean decision ${id} must have outgoing edges labeled 'Yes' and 'No'`, nodeId: id })
          }
        }
      }
    }
  }

  // 3) DAG discipline: detect cycles
  const inMap = new Map<string, number>()
  for (const n of nodes as any[]) inMap.set(String(n.id), 0)
  const outs = new Map<string, string[]>()
  for (const e of edges as any[]) {
    const s = String(e?.source?.nodeId || '')
    const t = String(e?.target?.nodeId || '')
    if (!s || !t) continue
    inMap.set(t, (inMap.get(t) || 0) + 1)
    const arr = outs.get(s) || []; arr.push(t); outs.set(s, arr)
  }
  const queue: string[] = []
  for (const [id, deg] of inMap.entries()) if (deg === 0) queue.push(id)
  let visited = 0
  while (queue.length) {
    const id = queue.shift() as string
    visited++
    const next = outs.get(id) || []
    for (const t of next) {
      inMap.set(t, (inMap.get(t) || 0) - 1)
      if ((inMap.get(t) || 0) === 0) queue.push(t)
    }
  }
  if (visited < nodes.length) {
    issues.push({ kind:'error', code:'cycle', message:'Graph contains a cycle' })
  }

  // 4) Loop sanity (non-negative maxCycles/maxConcurrent)
  for (const n of nodes as any[]) {
    if (String(n.type||'').toLowerCase() === 'loop') {
      const mc = n?.data?.maxConcurrent
      const mx = n?.data?.maxCycles
      if (mc != null && typeof mc === 'number' && mc < 0) issues.push({ kind:'error', code:'loop.maxConcurrent', message:`Loop ${n.id} has negative maxConcurrent`, nodeId: String(n.id) })
      if (mx != null && typeof mx === 'number' && mx < 0) issues.push({ kind:'error', code:'loop.maxCycles', message:`Loop ${n.id} has negative maxCycles`, nodeId: String(n.id) })
    }
  }

  // 5) Secrets warning: any node listing data.secrets[]
  for (const n of nodes as any[]) {
    const secrets = Array.isArray(n?.data?.secrets) ? (n.data.secrets as any[]).map((s:any)=>String(s)) : []
    if (secrets.length) {
      issues.push({ kind:'warning', code:'secrets.required', message:`Node ${n.id} requires secrets [${secrets.join(', ')}]`, nodeId: String(n.id) })
    }
  }

  return { issues }
}


