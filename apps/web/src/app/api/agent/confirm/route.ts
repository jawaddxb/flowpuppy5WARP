import { NextResponse } from 'next/server'
import { ZAgentSpec } from '@/lib/agentSpec/schema'
import { routeProvidersWithMock } from '@/lib/providers'
import { callLlmJsonWithZod } from '@/lib/llmHelper'
import { getProviderOrderWithMock } from '@/lib/aiRouting'
import { parseJsonLoose } from '@/lib/jsonRepair'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const selections = (body && typeof body === 'object' && (body as any).selections && typeof (body as any).selections === 'object') ? (body as any).selections : {}
  const prompt = (body && typeof (body as any).prompt === 'string') ? String((body as any).prompt) : 'Agent build'

  // E2E stub: fast static response under NEXT_PUBLIC_E2E_HOOKS
  const isE2E = String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()
  if (isE2E==='1' || isE2E==='true') {
    const data = {
      agentSpec: {
        name: 'Stub Agent',
        inputs: { schedule: { type: 'interval', value: 'hourly' } },
        analysis: { merge: true },
      }
    }
    return NextResponse.json(data, { status: 200 })
  }

  // AI-only confirm (derive AgentSpec via LLM)
const url = new URL(req.url)
  const orgId = url.searchParams.get('org') || ((String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='1'||String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='true') ? 'org-demo' : null)
  const order = await getProviderOrderWithMock('chat', orgId)
  const list = routeProvidersWithMock(order)
  const schemaHint = [
    'Return ONLY valid JSON for this schema. No markdown/code fences/prose:',
    '{ "agentSpec": {',
    '  "name": string,',
    '  "inputs"?: object,',
    '  "sources"?: object,',
    '  "analysis"?: object,',
    '  "decision"?: object,',
    '  "actions"?: object,',
    '  "channels"?: any[]',
    '} }',
    'Rules:',
    '- Prefer concrete provider IDs in any nested fields (e.g., sources.twitter.provider = "twitter").',
    '- Do not include prose or code fences.'
  ].join('\n')
  const jsonSchema = {
    name: 'ConfirmResponse',
    schema: {
      type: 'object',
      properties: {
        agentSpec: { type: 'object' },
      },
      required: ['agentSpec'],
      additionalProperties: true,
    },
    strict: true,
  }
  const result = await callLlmJsonWithZod(list, `${schemaHint}\nPrompt: ${prompt}\nSelections: ${JSON.stringify(selections)}`, { safeParse: (v: unknown) => {
    const j: any = v
    const sp = ZAgentSpec.safeParse(j?.agentSpec || {})
    return sp.success ? { success: true, data: { agentSpec: sp.data } as any } : { success: false } as any
  } }, jsonSchema, 2, 250)
  if (result.ok) {
    const data: any = result.data
    const debug = (String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='1' || String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='true')
    if (debug) {
      try {
        const fs = await import('fs')
        const path = await import('path')
        const dir = path.join(process.cwd(), 'apps/web/test-artifacts')
        try { fs.mkdirSync(dir, { recursive: true }) } catch {}
        const stamp = Date.now()
        fs.writeFileSync(path.join(dir, `confirm_json_${stamp}.json`), JSON.stringify(data, null, 2))
      } catch {}
    }
    return NextResponse.json(data)
  }
  return NextResponse.json({ error: 'All providers failed', details: result.logs.map(l=> `${l.provider}#${l.attempt}:${l.outcome}`) }, { status: 502 })
}


