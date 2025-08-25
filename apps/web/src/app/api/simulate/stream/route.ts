export const runtime = 'nodejs'

export async function POST(req: Request) {
  const encoder = new TextEncoder()
  const { nodes = [], edges = [] } = await req.json().catch(() => ({}))

  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: any) {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)) } catch {}
      }
      // Ensure headers flush by sending periodic heartbeats
      send({ type: 'start', at: Date.now(), nodes: nodes.length, edges: edges.length })
      await new Promise((r) => setTimeout(r, 100))
      for (let i = 0; i < nodes.length; i++) {
        const nodeId = nodes[i]?.id ?? `n${i}`
        const durationMs = 120 + (i % 4) * 40
        send({ type: 'step', nodeId, input: { i }, output: { ok: true }, status: 'ok', durationMs })
        await new Promise((r) => setTimeout(r, 140))
      }
      send({ type: 'end', at: Date.now(), ok: true })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}


