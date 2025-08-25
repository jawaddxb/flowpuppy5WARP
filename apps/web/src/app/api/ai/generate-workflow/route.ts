import { NextResponse } from 'next/server'
import { validateDsl, type WorkflowDsl } from '@/lib/dsl'
import { validateDslStrict } from '@/lib/dslSchema'
import { getAdminSupabase } from '@/lib/supabaseClient'
import { generateWorkflowDslFromPrompt } from '@/lib/planner'

type GenReq = {
  prompt: string
  orgId?: string
  context?: Record<string, unknown>
}

export async function POST(req: Request) {
  const { prompt, orgId, context } = (await req.json().catch(() => ({}))) as GenReq
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

  const t0 = Date.now()
  // In E2E mode, return a minimal valid DSL quickly to avoid external LLM latency
  const isE2E = String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='1' || String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='true'
  if (isE2E) {
    const base: WorkflowDsl = {
      version: '2.1' as any,
      nodes: [
        { id: 'trigger', type: 'input', config: {} as any } as any,
        { id: 'step1', type: 'http', config: { url: 'https://example.com' } as any } as any,
      ] as any,
      edges: [
        { source: 'trigger', target: 'step1' } as any,
      ] as any,
    } as any
    return NextResponse.json({ dsl: base, rationale: 'e2e', confidence: 0.99, missingSecrets: [] })
  }
  const gen = await generateWorkflowDslFromPrompt(prompt, orgId || undefined, context)
  const base = gen.dsl
  const rationale = gen.rationale
  const confidence = gen.confidence
  const missingSecrets = gen.missingSecrets
  const providerName = gen.providerName
  const latencyMs = gen.latencyMs
  const strict = validateDslStrict(base)
  if ((strict as any).ok !== true) return NextResponse.json({ error: 'invalid dsl', details: (strict as any).errors }, { status: 400 })

  // Optional: record generation event
  try {
    const supabase = getAdminSupabase()
    if (supabase) {
      const status = providerName === 'fallback' ? 'error' : 'ok'
      await supabase.from('ai_usage_events').insert({
        org_id: orgId ?? null,
        provider_id: null,
        model: String(providerName || 'auto'),
        tokens_in: Math.ceil(prompt.length / 4),
        tokens_out: Math.ceil(JSON.stringify(base).length / 4),
        latency_ms: latencyMs || (Date.now() - t0),
        cost_usd: 0,
        status,
      })
    }
  } catch {}

  return NextResponse.json({ dsl: base, rationale, confidence, missingSecrets })
}


