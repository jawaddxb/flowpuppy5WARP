import { NextResponse } from 'next/server'
import { routeProviders } from '@/lib/providers'
import { getProviderOrder } from '@/lib/aiRouting'

type SimNode = { id: string; type?: string; title?: string }
type SimEdge = { source: { nodeId: string }; target: { nodeId: string }; label?: string }

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({})) as { flowDoc?: { nodes?: SimNode[]; edges?: SimEdge[] }; input?: Record<string, any> }
    const flowDoc = body?.flowDoc || { nodes: [], edges: [] }
    const nodes = Array.isArray(flowDoc.nodes) ? flowDoc.nodes : []
    const edges = Array.isArray(flowDoc.edges) ? flowDoc.edges : []

    // Build adjacency and indegree for naive topological order
    const indeg = new Map<string, number>()
    const adj = new Map<string, string[]>()
    for (const n of nodes) { indeg.set(String(n.id), 0); adj.set(String(n.id), []) }
    for (const e of edges) {
      const s = String(e?.source?.nodeId||'')
      const t = String(e?.target?.nodeId||'')
      if (!indeg.has(s)) indeg.set(s, 0)
      if (!indeg.has(t)) indeg.set(t, 0)
      indeg.set(t, (indeg.get(t) || 0) + 1)
      const a = adj.get(s) || []
      a.push(t)
      adj.set(s, a)
    }

    const queue: string[] = []
    for (const [id, d] of indeg.entries()) if ((d||0) === 0) queue.push(id)

    const nodeById = new Map(nodes.map(n=> [String(n.id), n]))
    const results: Array<{ id: string; status: 'pass'|'warn'|'fail'; info?: { type?: string; title?: string }; ms: number; error?: string }> = []
    const startTs = Date.now()
    const visited = new Set<string>()
    while (queue.length) {
      const id = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)
      const t0 = Date.now()
      try {
        // No side-effects in simulation. Capture minimal, non-mocked info for LLM to summarize.
        const n = nodeById.get(id)
        const ms = Math.max(5, Date.now() - t0)
        results.push({ id, status: 'pass', info: { type: String(n?.type||''), title: String(n?.title||'') }, ms })
      } catch (e: any) {
        const ms = Math.max(5, Date.now() - t0)
        results.push({ id, status: 'fail', ms, error: String(e?.message || e) })
      }
      for (const nx of (adj.get(id) || [])) {
        indeg.set(nx, (indeg.get(nx) || 1) - 1)
        if ((indeg.get(nx) || 0) === 0) queue.push(nx)
      }
    }

    const durationMs = Math.max(10, Date.now() - startTs)

    // Ask LLM to summarize the run in natural language (AI-guided, no heuristics)
    const order = await getProviderOrder('chat', null)
    const list = await routeProviders(order)
    const schemaHint = 'Return ONLY JSON: { summary: string, takeaways?: string[], warnings?: string[], failures?: string[] }'
    const failures: string[] = []
    for (const p of list) {
      const r = await p.call({ prompt: `${schemaHint}\nGiven this simulation result, write a concise plain-English summary for a non-technical user. Avoid IDs.\nResults: ${JSON.stringify({ durationMs, results: results.map(r => ({ id: r.id, status: r.status, type: r.info?.type||'', title: r.info?.title||'', error: r.error||'' })) })}` })
      if (!r.ok || !r.text) { failures.push(`${p.name}: ${r.error||'no text'}`); continue }
      try {
        const j = JSON.parse(r.text)
        const summary = String(j?.summary || '').trim()
        if (!summary) { failures.push(`${p.name}: empty summary`); continue }
        return NextResponse.json({ ai: { summary, takeaways: j?.takeaways||[], warnings: j?.warnings||[], failures: j?.failures||[] }, results, durationMs })
      } catch { failures.push(`${p.name}: invalid json`) }
    }
    return NextResponse.json({ error: 'All providers failed', details: failures }, { status: 502 })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to simulate', details: String(error?.message || error) }, { status: 500 })
  }
}


