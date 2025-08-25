export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'
import { executeWorkflow, loadSecretsMap } from '@/lib/executor'
import { log, withRequest } from '@/lib/log'
import { redactSensitive } from '@/lib/redact'

export async function POST(req: Request) {
  const encoder = new TextEncoder()
  const { workflowId, dsl, input, options } = await req.json().catch(() => ({}))
  if (!dsl) return NextResponse.json({ error: 'dsl required' }, { status: 400 })
  const supabase = getAdminSupabase()

  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: any, id?: number) {
        const idPart = typeof id === 'number' ? `id: ${id}\n` : ''
        controller.enqueue(encoder.encode(`${idPart}data: ${JSON.stringify(obj)}\n\n`))
      }
      const t0 = Date.now()
      let runId: string | null = null
      let finalStatus: 'ok' | 'error' = 'ok'
      let seq = 0
      try {
        log('info', 'run.start', withRequest(req, { workflowId, nodes: (dsl?.nodes||[]).length }))
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('workflow_runs')
              .insert({ workflow_id: workflowId || null, status: 'running', input_json: input || {} })
              .select('id')
              .single()
            if (!error) runId = data?.id || null
          } catch {}
        }

        {
          const payload: any = { type: 'start', at: Date.now(), nodes: (dsl.nodes || []).length, edges: (dsl.edges || []).length }
          if (runId) payload.runId = runId
          send(payload, seq++)
        }
        const secrets = await loadSecretsMap()
        for await (const ev of executeWorkflow(dsl, input || {}, secrets, options || {})) {
          if (ev.status === 'error') finalStatus = 'error'
          send(ev, seq++)
          if (runId && supabase) {
            try {
              const endedAt = new Date()
              const startedAt = (typeof ev.durationMs === 'number' && ev.durationMs >= 0)
                ? new Date(endedAt.getTime() - ev.durationMs)
                : undefined
              await supabase.from('run_steps').insert({
                run_id: runId,
                node_id: ev.nodeId,
                name: ev.name || null,
                status: ev.status,
                input_json: redactSensitive(ev.input ?? null),
                output_json: redactSensitive(ev.output ?? null),
                error: ev.error ?? null,
                started_at: startedAt ? startedAt.toISOString() as any : undefined,
                finished_at: endedAt.toISOString() as any,
                duration_ms: ev.durationMs ?? null,
              })
            } catch {}
          }
        }
        const totalMs = Date.now() - t0
        {
          const payload: any = { type: 'end', at: Date.now(), ok: finalStatus === 'ok', durationMs: totalMs }
          if (runId) payload.runId = runId
          send(payload, seq++)
        }
        log('info', 'run.end', withRequest(req, { workflowId, ok: finalStatus==='ok', durationMs: totalMs }))
        if (runId && supabase) {
          try {
            await supabase
              .from('workflow_runs')
              .update({ status: finalStatus, finished_at: new Date().toISOString(), duration_ms: totalMs })
              .eq('id', runId)
          } catch {}
        }
      } catch (e: any) {
        const err = String(e?.message || e)
        {
          const payload: any = { type: 'end', at: Date.now(), ok: false, error: err }
          if (runId) payload.runId = runId
          send(payload, seq++)
        }
        log('error', 'run.error', withRequest(req, { error: err }))
      } finally {
        controller.close()
      }
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


