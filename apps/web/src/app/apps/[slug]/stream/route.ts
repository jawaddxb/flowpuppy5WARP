export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { executeWorkflow, loadSecretsMap } from '@/lib/executor'

// Lightweight in-memory per-IP+slug quota for streams
const quota = new Map<string, { count: number; resetAt: number }>()
const LIMIT_PER_MIN = 30
function checkQuota(key: string) {
  const now = Date.now()
  const rec = quota.get(key)
  if (!rec || rec.resetAt < now) { quota.set(key, { count: 1, resetAt: now + 60_000 }); return { ok: true } }
  if (rec.count >= LIMIT_PER_MIN) return { ok: false }
  rec.count += 1; return { ok: true }
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug || 'demo'
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'local'
  const quotaKey = `${slug}:${ip}:stream`
  if (!checkQuota(quotaKey).ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const encoder = new TextEncoder()
  const { dsl, input, options } = await req.json().catch(() => ({}))
  if (!dsl || typeof dsl !== 'object') return NextResponse.json({ error: 'dsl required' }, { status: 400 })

  const stream = new ReadableStream({
    async start(controller) {
      let seq = 0
      const send = (obj: any) => controller.enqueue(encoder.encode(`id: ${seq++}\ndata: ${JSON.stringify(obj)}\n\n`))
      try {
        send({ type: 'start', slug, at: Date.now() })
        const secrets = await loadSecretsMap()
        for await (const ev of executeWorkflow(dsl as any, input || {}, secrets, options || {})) {
          send(ev)
        }
        send({ type: 'end', at: Date.now(), ok: true })
      } catch (e: any) {
        send({ type: 'end', at: Date.now(), ok: false, error: String(e?.message || e) })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    }
  })
}



