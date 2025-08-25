import type { FlowDoc } from '@/lib/flowdoc/schema'

export type PlanItem = { text: string; nodeIds: string[] }

export function buildPlanFromFlow(flow: FlowDoc | null | undefined): PlanItem[] {
  if (!flow || !Array.isArray(flow.nodes) || !Array.isArray(flow.edges)) return []
  const idToNode = new Map<string, any>((flow.nodes||[]).map((n:any)=> [String(n.id), n]))
  const outs = new Map<string, string[]>()
  for (const e of (flow.edges||[]) as any[]) {
    const s = String(e?.source?.nodeId||''); const t = String(e?.target?.nodeId||'')
    if (!s || !t) continue
    const arr = outs.get(s) || []; arr.push(t); outs.set(s, arr)
  }
  const allNodes: any[] = Array.isArray(flow.nodes) ? (flow.nodes as any[]) : []
  const inputs = allNodes.filter((n:any)=> ['input','trigger','webhook','schedule'].includes(String(n.type||'').toLowerCase()))
  const first = inputs.length ? inputs[0] : (allNodes.length ? allNodes[0] : null)
  const startId = first && first.id ? String(first.id) : null
  if (!startId) return []
  const items: PlanItem[] = []
  const seen = new Set<string>()
  let cur = startId; let guard = 0
  while (cur && guard++ < 256) {
    if (seen.has(cur)) break
    seen.add(cur)
    const n = idToNode.get(cur)
    if (!n) break
    const title = String(n.title || n.id)
    items.push({ text: title, nodeIds: [cur] })
    const next = outs.get(cur) || []
    if (!next.length) break
    cur = String(next[0])
  }
  return items
}


