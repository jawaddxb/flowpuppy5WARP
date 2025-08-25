import { NextResponse } from 'next/server'

// LLM-driven conversational patch endpoint.
// Body: { instruction: string, context?: any }
// Returns: { diff: { nodesAdded: any[]; nodesRemoved: string[]; edgesAdded: any[]; edgesRemoved: any[] } }

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({})) as { instruction?: string; intent?: string; params?: Record<string, any>; context?: any }
    const instruction = String(body?.instruction || body?.intent || '')
    const params = (body?.params && typeof body.params === 'object') ? body.params : undefined
    const convoContext = body?.context || {}
    if (!instruction.trim()) return NextResponse.json({ error: 'Missing instruction' }, { status: 400 })
    // Built-in instruction: add_research_pipeline → build a complete, wired pipeline from sources
    if (instruction === 'add_research_pipeline') {
      try {
        const sourcesIn = Array.isArray((params as any)?.sources) ? ((params as any).sources as any[]).map(String).filter(Boolean) : []
        const cadence = String((params as any)?.cadence || 'daily')
        const audience = String((params as any)?.audience || (String((convoContext as any)?.audience || '') || 'audience'))
        const defaultSources = [
          'https://arxiv.org',
          'https://openai.com/blog',
          'https://huggingface.co/blog',
          'https://anthropic.com/news',
          'https://paperswithcode.com',
        ]
        const sources: string[] = (sourcesIn.length ? sourcesIn : defaultSources).slice(0, 5)

        const toId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2,7)}`
        const nodesAdded: any[] = []
        const edgesAdded: any[] = []

        const triggerId = toId('trigger')
        nodesAdded.push({ id: triggerId, type: 'input', label: cadence.toLowerCase().includes('daily') ? 'Daily Schedule' : 'Schedule', data: { scheduleCadence: cadence || 'daily', timeOfDay: '09:00' } })

        const fetchIds: string[] = []
        for (const raw of sources) {
          try {
            const url = raw.startsWith('http') ? raw : `https://${raw}`
            const host = new URL(url).hostname
            const nodeId = toId(`fetch_${host.replace(/\W+/g,'_')}`)
            nodesAdded.push({ id: nodeId, type: 'http', label: `Fetch ${host}` })
            edgesAdded.push({ source: triggerId, target: nodeId })
            fetchIds.push(nodeId)
          } catch {
            // Skip invalid URL entries silently
          }
        }

        const summarizeId = toId('summarize')
        nodesAdded.push({ id: summarizeId, type: 'transform', label: `Summarize for ${audience}` })
        for (const fid of fetchIds) edgesAdded.push({ source: fid, target: summarizeId })

        const composeId = toId('compose')
        nodesAdded.push({ id: composeId, type: 'transform', label: 'Compose Tweet' })
        edgesAdded.push({ source: summarizeId, target: composeId })

        const tweetId = toId('tweet')
        nodesAdded.push({ id: tweetId, type: 'output', label: 'Post Tweet' })
        edgesAdded.push({ source: composeId, target: tweetId })

        // Hygiene: ensure only one trigger by signaling removal of duplicate generic triggers named 'Trigger'
        const nodesRemoved: string[] = []
        try {
          const ctxNodes = Array.isArray((convoContext as any)?.nodes) ? ((convoContext as any).nodes as any[]) : []
          const triggers = ctxNodes.filter(n => ['input','trigger','schedule'].includes(String(n?.type||'').toLowerCase()))
          if (triggers.length > 1) {
            for (const t of triggers.slice(1)) nodesRemoved.push(String(t.id))
          }
        } catch {}
        return NextResponse.json({ diff: { nodesAdded, nodesRemoved, edgesAdded, edgesRemoved: [] } })
      } catch (e:any) {
        return NextResponse.json({ error: `Failed to build research pipeline: ${String(e?.message||e)}` }, { status: 400 })
      }
    }
    const { routeProviders } = await import('@/lib/providers')
    const { getProviderOrder } = await import('@/lib/aiRouting')
    const order = await getProviderOrder('chat', null)
    const list = await routeProviders(order)
    const schema = 'Return ONLY JSON: { diff: { nodesAdded: Array<{id:string,type:string,label?:string}>, nodesRemoved: string[], edgesAdded: Array<{source:string,target:string,label?:string}>, edgesRemoved: Array<{source:string,target:string,label?:string}> } }'
    const failures: string[] = []
    for (const p of list) {
      const r = await p.call({ prompt: `${schema}\nInstruction: ${instruction}\nParams: ${params ? JSON.stringify(params) : '{}'}\nContext: ${JSON.stringify(convoContext)}` })
      if (!r.ok || !r.text) { failures.push(`${p.name}: ${r.error||'no text'}`); continue }
      try {
        const j = JSON.parse(r.text)
        const diff = j?.diff
        const normalized = {
          nodesAdded: Array.isArray(diff?.nodesAdded) ? diff.nodesAdded.map((n:any)=> ({ id: String(n.id||''), type: String(n.type||'action'), label: n?.label })) : [],
          nodesRemoved: Array.isArray(diff?.nodesRemoved) ? diff.nodesRemoved.map((id:any)=> String(id||'')) : [],
          edgesAdded: Array.isArray(diff?.edgesAdded) ? diff.edgesAdded.map((e:any)=> ({ source: String(e?.source||''), target: String(e?.target||''), label: e?.label })) : [],
          edgesRemoved: Array.isArray(diff?.edgesRemoved) ? diff.edgesRemoved.map((e:any)=> ({ source: String(e?.source||''), target: String(e?.target||''), label: e?.label })) : [],
        }
        return NextResponse.json({ diff: normalized })
      } catch { failures.push(`${p.name}: invalid json`) }
    }
    return NextResponse.json({ error: 'All providers failed', details: failures }, { status: 502 })
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 })
  }
}


