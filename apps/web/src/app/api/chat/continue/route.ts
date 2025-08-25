import { NextResponse } from 'next/server'
import { callLlmJsonWithZod } from '@/lib/llmHelper'
import { routeProviders } from '@/lib/providers'
import { getProviderOrder } from '@/lib/aiRouting'

// Conversational chat endpoint for natural workflow building
// POST /api/chat/continue
// Body: { prompt?: string, context?: Record<string,any>, step?: number }
// Returns: { message: string, quickActions?: Array<{label:string,value:any}>, primaryAction?: {label:string,action:string}, nextStep: number, context: Record<string,any> }

// removed hardcoded scripted conversation flows to enforce AI-only orchestration

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { prompt, context = {}, step = 0, action, flowId: inFlowId } = body
    // AI-driven conversation (no hard-coded patterns)
    // E2E stub: deterministic responses for tests/demo
    const e2e = String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()
    if (e2e==='1' || e2e==='true') {
      const goal = String(prompt||'').toLowerCase()
      const baseCtx = { ...(context||{}), stage: (context?.stage||'goal') }
      const sourcesAI = ['https://arxiv.org', 'https://openai.com/blog', 'https://huggingface.co/blog', 'https://anthropic.com/news']
      const sourcesHealth = ['https://healthline.com', 'https://webmd.com', 'https://aarp.org/health', 'https://nih.gov/news']
      if (goal.includes('tweet') && goal.includes('daily')) {
        const isAI = goal.includes('ai') || goal.includes('trends')
        const src = isAI ? sourcesAI : sourcesHealth
        return NextResponse.json({
          message: isAI ? 'I can suggest sources and a daily research pipeline.' : 'Let’s gather sources and propose a daily pipeline.',
          quickActions: [
            { label: 'Preview pipeline', kind: 'preview', value: 'add_research_pipeline', patchInstruction: 'add_research_pipeline', patchParams: { sources: src, audience: isAI ? 'AI practitioners' : 'Adults over 50', cadence: 'daily' } },
            { label: 'Connect Twitter', kind: 'connect', value: { provider: 'twitter' } },
          ],
          primaryAction: { label: 'Build', action: 'build' },
          nextStep: Number(step||0) + 1,
          context: { ...baseCtx, stage: 'sources' },
          flowId: inFlowId || 'stubFlow'
        })
      }
      // Fallback generic stub
      return NextResponse.json({
        message: 'I can help you plan this. Choose a quick action or click Build.',
        quickActions: [ { label: 'Connect Twitter', kind: 'connect', value: { provider: 'twitter' } } ],
        primaryAction: { label: 'Build', action: 'build' },
        nextStep: Number(step||0) + 1,
        context: { ...baseCtx, stage: 'goal' },
        flowId: inFlowId || 'stubFlow'
      })
    }
    const order = await getProviderOrder('chat', null)
    const list = await routeProviders(order)
    const system = (
      'You are a workflow conversation orchestrator for building workflows step-by-step.\n' +
      'Return ONLY JSON: {\n' +
      '  message: string,\n' +
      '  quickActions?: Array<{ label: string, value: any, kind?: "continue"|"edit"|"connect"|"simulate"|"preview"|"apply", patchInstruction?: string, patchParams?: object }>,\n' +
      '  primaryAction?: { label: string, action: string },\n' +
      '  secondaryActions?: Array<{ label: string, value: any }>,\n' +
      '  nextStep: number,\n' +
      '  context: object\n' +
      '}\n' +
      'Conversation stages: ["goal","sources","research_routine","drafting","scheduling","connections","simulate","review_diff","build","monitoring"].\n' +
      'Rules:\n' +
      '- Keep the conversation within valid next stages; do not jump arbitrarily.\n' +
      '- Propose structural changes as quickActions with kind:"preview" (or kind:"edit") and include patchInstruction/patchParams.\n' +
      '- To request credentials, use quickActions with kind:"connect" and a value like { provider: "twitter" }.\n' +
      '- Do NOT move to "monitoring" until context.build?.applied === true AND context.connections?.twitter === "connected".\n' +
      '- If a prerequisite is missing (e.g., scheduling without connection), explain what is needed and offer the appropriate quickAction.\n' +
      '- If the user expresses a clear goal or clicks a suggestion, within the next 1–2 responses you MUST surface a primaryAction { label: "Build", action: "build" } to kick off planning, unless the user asked to do something else first.\n' +
      '- Prefer concise, testable steps; when offering Build, ensure quickActions include a structural preview (kind:"preview") so the UI can display a Diff before Apply.\n' +
      '- When the goal implies tweeting trends daily (e.g., contains "tweet" and "daily"), first propose 3–5 candidate sources (domains/feeds) and a research routine. Then include a quickAction with kind:"preview", patchInstruction:"add_research_pipeline", and patchParams { sources:string[], audience?:string, cadence?:string } so the UI can show a Proposed change.\n' +
      '- Keep provider connections inline as quickActions kind:"connect"; do not instruct navigation.\n' +
      '- Keep messages concise and helpful; no IDs or code unless asked.'
    )
    const failures: string[] = []
    // Derive a stable flowId if missing; echo on each turn
    const derivedFlowId = inFlowId || (context && (context as any).flowId) || (typeof prompt === 'string' && prompt ? (String(prompt).toLowerCase().includes('tweet') ? 'aiTweets' : 'genericFlow') : 'genericFlow')
    const ctxBase = { ...(context||{}), flowId: derivedFlowId }

    const ZChat = {
      safeParse: (v: any) => {
        const msg = String(v?.message || '').trim()
        if (!msg) return { success: false }
        const next = typeof v?.nextStep === 'number' ? v.nextStep : (Number(step||0)+1)
        const ctxRaw = (typeof v?.context === 'object' && v?.context) ? v.context : (context || {})
        const ctx = { ...ctxBase, ...ctxRaw, flowId: derivedFlowId }
        return { success: true, data: {
          message: msg,
          quickActions: Array.isArray(v?.quickActions) ? v.quickActions : [],
          primaryAction: v?.primaryAction || null,
          secondaryActions: Array.isArray(v?.secondaryActions) ? v.secondaryActions : [],
          nextStep: next,
          context: ctx,
          flowId: derivedFlowId,
        } }
      }
    }
    const jsonSchema = {
      name: 'ChatTurn',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          quickActions: { type: 'array' },
          primaryAction: { type: 'object' },
          secondaryActions: { type: 'array' },
          nextStep: { type: 'number' },
          context: { type: 'object' },
        },
        required: ['message'],
        additionalProperties: true,
      },
      strict: false,
    }
    const result = await callLlmJsonWithZod(list, `${system}\nCurrent step: ${step}\nContext: ${JSON.stringify(ctxBase)}\nUser: ${prompt||''}\nAction: ${action||''}`, ZChat as any, jsonSchema, 2, 250)
    if (result.ok) return NextResponse.json(result.data)
    return NextResponse.json({ error: 'All providers failed', details: failures }, { status: 502 })

    // unreachable in normal flow: all handled above or error out
    return NextResponse.json({ error: 'No response generated' }, { status: 500 })

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to process conversation', details: error.message },
      { status: 500 }
    )
  }
}
