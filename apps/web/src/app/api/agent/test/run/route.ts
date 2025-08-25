import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)) }

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json().catch(()=>({}))
  const flow = body?.flow || { nodes: [], edges: [] }
  const supabase = getAdminSupabase()
  let runId: string | null = null
  if (supabase) {
    try {
      const { data, error } = await supabase.from('workflow_runs').insert({ status: 'running', input_json: flow }).select('id').single()
      if (!error && data?.id) runId = data.id as string
    } catch {}
  }
  const nodeMap: Record<string, any> = {}
  for (const n of (flow.nodes||[])) nodeMap[n.id] = n
  const incoming = new Map<string, number>()
  for (const n of (flow.nodes||[])) incoming.set(n.id, 0)
  for (const e of (flow.edges||[])) incoming.set(e.target?.nodeId, (incoming.get(e.target?.nodeId)||0)+1)
  const outs = new Map<string, string[]>()
  for (const e of (flow.edges||[])) {
    const a = outs.get(e.source?.nodeId)||[]
    a.push(e.target?.nodeId)
    outs.set(e.source?.nodeId, a)
  }
  const queue: string[] = []
  incoming.forEach((v,k)=> { if (v===0) queue.push(k) })
  const order: string[] = []
  while (queue.length) {
    const id = queue.shift() as string
    order.push(id)
    const next = outs.get(id)||[]
    for (const t of next) { const c = (incoming.get(t)||0) - 1; incoming.set(t,c); if (c===0) queue.push(t) }
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const id of order) {
        const n = nodeMap[id] || { id }
        const title = String(n.title || n.id)
        controller.enqueue(encoder.encode(`▶︎ ${title} running\n`))
        const dur = 200 + Math.round(Math.random()*420)
        await sleep(dur)
        controller.enqueue(encoder.encode(`✓ ${title} ok (${dur}ms)\n`))
        if (supabase && runId) {
          try {
            await supabase.from('run_steps').upsert({ run_id: runId, node_id: id, name: title, status: 'ok', duration_ms: dur })
          } catch {}
        }
      }
      controller.enqueue(encoder.encode(`done\n`))
      controller.close()
      if (supabase && runId) {
        try { await supabase.from('workflow_runs').update({ status: 'completed', finished_at: new Date().toISOString() }).eq('id', runId) } catch {}
      }
    }
  })
  return new NextResponse(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } })
}



