import type { Node } from 'reactflow'

export type ValidationIssue = { field: string; message: string; id?: string }

export function validateNode(node: Node | undefined): ValidationIssue[] {
  if (!node) return [{ field: 'node', message: 'No node selected' }]
  const issues: ValidationIssue[] = []
  const type = (node.type as string) || 'node'
  const d: any = node.data || {}
  switch (type) {
    case 'input':
      if (!d.path) issues.push({ field: 'path', message: 'Path is required' })
      break
    case 'http':
      if (!d.url) issues.push({ field: 'url', message: 'URL is required' })
      if (d.method && !['GET','POST','PUT','PATCH','DELETE'].includes(String(d.method).toUpperCase())) {
        issues.push({ field: 'method', message: 'Invalid HTTP method' })
      }
      break
    case 'email':
      if (!d.to) issues.push({ field: 'to', message: 'Recipient (to) is required' })
      break
    case 'delay':
      if (typeof d.ms !== 'number' || d.ms <= 0) issues.push({ field: 'ms', message: 'Delay must be > 0' })
      break
    case 'loop':
      if (typeof d.iterations !== 'number' || d.iterations < 1) issues.push({ field: 'iterations', message: 'Iterations must be >= 1' })
      break
    case 'parallel':
      if (!d.branches || d.branches < 2) issues.push({ field: 'branches', message: 'At least 2 branches' })
      break
    case 'join':
      if (!d.strategy) issues.push({ field: 'strategy', message: 'Strategy is required' })
      break
    case 'switch':
      if (!Array.isArray(d.cases) || d.cases.length < 2) issues.push({ field: 'cases', message: 'At least 2 cases' })
      break
    case 'slack':
      if (!d.channel) issues.push({ field: 'channel', message: 'Channel is required' })
      if (!d.message) issues.push({ field: 'message', message: 'Message is required' })
      break
  }
  return issues
}

export function validateGraph(nodes: Node[], edges: any[]): { nodeIssues: Record<string, ValidationIssue[]>; graphIssues: ValidationIssue[] } {
  const nodeIssues: Record<string, ValidationIssue[]> = {}
  const graphIssues: ValidationIssue[] = []
  // Per-node validation
  for (const n of nodes) {
    const errs = validateNode(n)
    if (errs.length) nodeIssues[n.id] = errs
  }
  // No self-loops
  for (const e of edges as any[]) {
    if (e.source === e.target) graphIssues.push({ field: 'edge', message: `Edge ${e.id || `${e.source}->${e.target}`} cannot connect to itself`, id: e.id || e.source })
  }
  // Single incoming edge except join
  const incoming = new Map<string, number>()
  for (const e of edges as any[]) {
    incoming.set(e.target, (incoming.get(e.target) || 0) + 1)
  }
  for (const n of nodes as any[]) {
    if (n.type !== 'join' && (incoming.get(n.id) || 0) > 1) {
      graphIssues.push({ field: 'edge', message: `Node ${n.id} has multiple incoming edges`, id: n.id })
    }
  }
  // Decision/switch edges must have labels that match branches/cases
  const switches = new Map<string, string[]>()
  const decisions = new Map<string, string[]>()
  const trycatch = new Set<string>()
  for (const n of nodes as any[]) {
    if (n.type === 'switch') {
      const cases = Array.isArray(n.data?.cases) ? n.data.cases.map((c:string)=>String(c)) : []
      switches.set(n.id, cases)
      if (cases.length < 2) nodeIssues[n.id] = [...(nodeIssues[n.id]||[]), { field: 'cases', message: 'At least 2 cases' }]
    }
    if (String(n.type||'').toLowerCase() === 'decision') {
      const branches = Array.isArray(n.data?.branches) ? (n.data.branches as string[]).map((b)=> String(b)) : []
      decisions.set(n.id, branches)
      if (branches.length === 2) {
        const hasYes = branches.some(b=> b.toLowerCase()==='yes')
        const hasNo = branches.some(b=> b.toLowerCase()==='no')
        if (!hasYes || !hasNo) {
          graphIssues.push({ field: 'decisionBranches', message: `Decision ${n.id} should use Yes/No for boolean branches`, id: n.id })
        }
      }
    }
    if (n.type === 'trycatch') {
      trycatch.add(n.id)
    }
  }
  for (const e of edges as any[]) {
    if (switches.has(e.source)) {
      const lbl = String(e.label || '').trim()
      if (!lbl) graphIssues.push({ field: 'edgeLabel', message: `Edge ${e.id || `${e.source}->${e.target}`} from switch requires a label`, id: e.id || e.source })
      else if (!switches.get(e.source)!.includes(lbl)) graphIssues.push({ field: 'edgeLabel', message: `Edge ${e.id || `${e.source}->${e.target}`} label '${lbl}' not in switch cases`, id: e.id || e.source })
    }
    if (decisions.has(e.source)) {
      const branches = decisions.get(e.source) || []
      const lbl = String(e.label || '').trim()
      if (!lbl) {
        graphIssues.push({ field: 'edgeLabel', message: `Edge ${e.id || `${e.source}->${e.target}`} from decision requires a label`, id: e.id || e.source })
      } else if (branches.length && !branches.includes(lbl)) {
        graphIssues.push({ field: 'edgeLabel', message: `Edge ${e.id || `${e.source}->${e.target}`} label '${lbl}' not in decision branches`, id: e.id || e.source })
      }
    }
  }
  // Guarded edges require guard expression
  for (const e of edges as any[]) {
    if (e.data?.type === 'guarded' && (!e.data?.guard || String(e.data.guard).trim() === '')) {
      graphIssues.push({ field: 'guard', message: `Edge ${e.id || `${e.source}->${e.target}`} is guarded but has no expression`, id: e.id || e.source })
    }
  }
  // Try/catch node must have edges labeled 'try' and 'catch'
  for (const id of trycatch) {
    const outs = (edges as any[]).filter(e => e.source === id)
    const labels = new Set(outs.map(e=> String(e.label||'').toLowerCase()))
    if (!labels.has('try') || !labels.has('catch')) {
      graphIssues.push({ field: 'trycatch', message: `TryCatch ${id} requires 'try' and 'catch' edges with labels`, id })
    }
  }
  return { nodeIssues, graphIssues }
}

