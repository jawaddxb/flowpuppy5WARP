// apps/web/src/app/api/agent/plan/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { routeProvidersWithMock } from '@/lib/providers'
import { callLlmJsonWithZod } from '@/lib/llmHelper'
import { getProviderOrderWithMock } from '@/lib/aiRouting'

/**
 * Spec (AB-201): /api/agent/plan returns JSON only:
 * {
 *   "options": {...},
 *   "defaults": {...},
 *   "nextQuestions": [...]
 * }
 */

// Request payload schema (adjust as needed)
const PlanRequest = z.object({
  prompt: z.string().min(1).optional(),
  answers: z.record(z.string(), z.any()).optional()
});

export async function POST(req: Request) {
  // Parse JSON body safely
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // ignore; default {}
  }
  const parsed = PlanRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // E2E stub: fast static response under NEXT_PUBLIC_E2E_HOOKS
  const isE2E = String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()
  if (isE2E==='1' || isE2E==='true') {
    const data = {
      options: {
        plan: [
          { text: 'Check current weather conditions', nodeIds: ['daily_trigger','fetch_weather'] },
          { text: 'Email summary', nodeIds: ['summarize','email_out'] }
        ],
        questions: [{ id: 'location', label: 'What location?', choices: ['Current location','Specific city'] }],
        pipelines: [{ id: 'get_weather', title: 'Retrieve Weather Data', steps: ['Connect','Fetch','Parse'] }],
        connectionsRequired: ['weather_api','email_provider']
      },
      defaults: {}
    }
    return NextResponse.json(data, { status: 200 })
  }

  // AI-only plan generation (no code fallback)
const userPrompt = String((parsed.data as any)?.prompt || '').trim()
  // Determine org for mock/live routing
  const url = new URL(req.url)
  const orgId = url.searchParams.get('org') || ((String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='1'||String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='true') ? 'org-demo' : null)
  const order = await getProviderOrderWithMock('chat', orgId)
  const list = routeProvidersWithMock(order)
  // Zod schema for validating LLM output (AB-201/202)
  const ZPlan = z.object({
    options: z.object({
      plan: z.array(z.object({ text: z.string().min(1) })),
      questions: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), choices: z.array(z.string().min(1)).min(1) })).optional(),
      discoveries: z.array(z.object({ id: z.string().min(1), title: z.string().min(1), confidence: z.number().min(0).max(1) })).optional(),
      pipelines: z.array(z.object({ id: z.string().min(1), title: z.string().min(1), steps: z.array(z.string().min(1)).min(1), requires: z.array(z.string().min(1)).optional() })).optional(),
      connectionsRequired: z.array(z.string().min(1)).optional()
    }),
    defaults: z.record(z.string(), z.any()).optional(),
    nextQuestions: z.array(z.any()).optional()
  })
  const schemaHint = [
    'You must return ONLY valid JSON for this schema. No markdown, no code fences, no extra prose.',
    'Schema:',
    '{',
    '  "options": {',
    '    "plan": Array<{ text: string }>,',
    '    "questions"?: Array<{ id: string, label: string, choices: string[] }>,',
    '    "discoveries"?: Array<{ id: string, title: string, confidence: number }>,',
    '    "pipelines"?: Array<{ id: string, title: string, steps: string[], requires?: string[] }>,',
    '    "connectionsRequired"?: string[]',
    '  },',
    '  "defaults"?: Record<string, any>,',
    '  "nextQuestions"?: Array<any>',
    '}',
    'Rules:',
    '- Ensure every question has non-empty choices.',
    '- "connectionsRequired" should be concrete provider keys like "twitter", "openai", not generic labels.',
    '- Output must be a single top-level JSON object. Do NOT wrap in ```.' ,
  ].join('\n')
  const planJsonSchema = {
    name: 'PlanResponse',
    schema: {
      type: 'object',
      properties: {
        options: {
          type: 'object',
          properties: {
            plan: {
              type: 'array',
              items: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: true },
            },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string' },
                  choices: { type: 'array', items: { type: 'string' }, minItems: 1 },
                },
                required: ['id', 'label', 'choices'],
                additionalProperties: true,
              },
            },
            discoveries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  confidence: { type: 'number' },
                },
                required: ['id', 'title', 'confidence'],
                additionalProperties: true,
              },
            },
            pipelines: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  steps: { type: 'array', items: { type: 'string' }, minItems: 1 },
                  requires: { type: 'array', items: { type: 'string' } },
                },
                required: ['id', 'title', 'steps'],
                additionalProperties: true,
              },
            },
            connectionsRequired: { type: 'array', items: { type: 'string' } },
          },
          required: ['plan'],
          additionalProperties: true,
        },
        defaults: { type: 'object' },
        nextQuestions: { type: 'array' },
      },
      required: ['options'],
      additionalProperties: true,
    },
    strict: true,
  }

  const result = await callLlmJsonWithZod(list, `${schemaHint}\nUser goal: ${userPrompt}`, ZPlan, planJsonSchema, 2, 250, (data) => Array.isArray((data as any)?.options?.plan) && ((data as any).options.plan.length > 0))
  if (result.ok) {
    const debug = (String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='1' || String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='true')
    if (debug) {
      try {
        const fs = await import('fs')
        const path = await import('path')
        const dir = path.join(process.cwd(), 'apps/web/test-artifacts')
        try { fs.mkdirSync(dir, { recursive: true }) } catch {}
        const stamp = Date.now()
        fs.writeFileSync(path.join(dir, `plan_json_${stamp}.json`), JSON.stringify(result.data, null, 2))
      } catch {}
    }
    const data: any = { ...(result as any).data }
    if (data.defaults === undefined) data.defaults = {}
    return NextResponse.json(data, { status: 200 })
  }
  return NextResponse.json({ error: 'All providers failed', details: result.logs.map(l=> `${l.provider}#${l.attempt}:${l.outcome}`) }, { status: 502 })
}

// Optional: handle GET with a simple health ping
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "plan" }, { status: 200 });
}
