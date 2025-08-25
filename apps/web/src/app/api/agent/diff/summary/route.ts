import { NextResponse } from 'next/server'
import { getProviderOrder } from '@/lib/aiRouting'
import { routeProviders } from '@/lib/providers'

type NodeLite = { id: string; type?: string }
type EdgeLite = { source: string; target: string; label?: string }

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as {
      addedNodes?: NodeLite[];
      removedNodes?: NodeLite[];
      addedEdges?: EdgeLite[];
      removedEdges?: EdgeLite[];
      context?: Record<string, any>;
      orgId?: string | null;
    }

    const addedNodes = Array.isArray(body.addedNodes) ? body.addedNodes : []
    const removedNodes = Array.isArray(body.removedNodes) ? body.removedNodes : []
    const addedEdges = Array.isArray(body.addedEdges) ? body.addedEdges : []
    const removedEdges = Array.isArray(body.removedEdges) ? body.removedEdges : []
    const orgId = body.orgId ?? null

    const total = addedNodes.length + removedNodes.length + addedEdges.length + removedEdges.length
    if (total === 0) {
      return NextResponse.json({ summary: 'No changes proposed.' })
    }

    const order = await getProviderOrder('diff-summary', orgId ?? undefined)
    const providers = await routeProviders(order)

    const prompt = `You are writing a very clear, non-technical, one-paragraph explanation of a workflow change.
Return ONLY JSON: { "summary": string }.
Use simple language. No IDs, no jargon. Explain what the user will see happen after applying these changes.

Changes:
Added nodes: ${JSON.stringify(addedNodes)}
Removed nodes: ${JSON.stringify(removedNodes)}
Added edges: ${JSON.stringify(addedEdges)}
Removed edges: ${JSON.stringify(removedEdges)}
`

    const errors: string[] = []
    for (const p of providers) {
      const res = await p.call({ prompt })
      if (!res.ok) { errors.push(`${p.name}: ${res.error}`); continue }
      const text = String(res.text || '').trim()
      if (!text) { errors.push(`${p.name}: empty`); continue }
      let j: any = null
      try { j = JSON.parse(text) } catch (e) {
        errors.push(`${p.name}: invalid json`)
        continue
      }
      const summary = String(j?.summary || '').trim()
      if (summary) {
        return NextResponse.json({ summary })
      } else {
        errors.push(`${p.name}: missing summary`)
      }
    }

    return NextResponse.json({ error: 'All providers failed', details: errors.slice(0, 5) }, { status: 502 })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}


