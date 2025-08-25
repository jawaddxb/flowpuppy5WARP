import { validateDslStrict } from '@/lib/dslSchema'
import type { WorkflowDsl } from '@/lib/dsl'
import { generateWorkflowDslFromPrompt } from '@/lib/planner'
import { getAdminSupabase } from '@/lib/supabaseClient'

async function providerExplain(prompt: string, context?: Record<string, unknown>): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  const explainInstruction = `You are helping a non-technical user design an automation.\nExplain the approach in a single, friendly bullet list (5–9 clear steps).\n- Use plain English and outcomes (what happens), not implementation terms like "+node", "edges", or internal type names.\n- Avoid repeating steps; keep each step unique and descriptive.\n- If the user asks to add, remove, or tweak something, integrate ONLY those changes into the existing plan instead of restating everything.\n- If a service isn't a native action, say "Connect to the official API" rather than naming HTTP details.\n- Do not include extra sections like "edges" or code blocks.\nAfter your explanation, output ONLY a valid JSON DSL v2.1 on a new line prefixed with [[DSL]] (two brackets), with no code fences.`
  const sys = 'You are FlowPuppy planning assistant.'
  const ctx = context && Object.keys(context).length ? `\n\nContext (previous messages, existing plan): ${JSON.stringify(context)}` : ''
  const user = `Goal: ${prompt}${ctx}\n${explainInstruction}`
  // Prefer Anthropic if available
  if (anthropicKey) {
    try {
      const t0 = Date.now()
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model: 'claude-3-5-sonnet-20240620', max_tokens: 800, system: sys, messages: [{ role: 'user', content: user }] }),
      })
      if (!res.ok) throw new Error('anthropic ' + res.status)
      const data: any = await res.json().catch(()=> ({}))
      const text: string = data?.content?.[0]?.text || ''
      try {
        const supabase = getAdminSupabase()
        if (supabase) await supabase.from('ai_usage_events').insert({ org_id: null, provider_id: null, model: 'anthropic:claude-3-5-sonnet-20240620', tokens_in: Math.ceil(prompt.length/4), tokens_out: Math.ceil(text.length/4), latency_ms: Date.now()-t0, cost_usd: 0, status: 'ok' })
      } catch {}
      if (text) return text
    } catch {}
  }
  if (openaiKey) {
    try {
      const t0 = Date.now()
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], temperature: 0 }),
      })
      if (!res.ok) throw new Error('openai ' + res.status)
      const data: any = await res.json().catch(()=> ({}))
      const text: string = data?.choices?.[0]?.message?.content || ''
      try {
        const supabase = getAdminSupabase()
        if (supabase) await supabase.from('ai_usage_events').insert({ org_id: null, provider_id: null, model: 'openai:gpt-4o-mini', tokens_in: Math.ceil(prompt.length/4), tokens_out: Math.ceil(text.length/4), latency_ms: Date.now()-t0, cost_usd: 0, status: 'ok' })
      } catch {}
      if (text) return text
    } catch {}
  }
  // Fallback static narrative
  return `Drafting a workflow for: "${prompt}"\n• Trigger: Webhook\n• Step 1: HTTP Request\n• Step 2: Transform\n• Output: Email`
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const prompt = searchParams.get('prompt') ?? ''
  const orgId = searchParams.get('orgId') ?? undefined
  let context: Record<string, unknown> | undefined = undefined
  const ctxParam = searchParams.get('context')
  if (ctxParam) {
    try { context = JSON.parse(ctxParam) } catch {}
  }

  const encoder = new TextEncoder()
  // Kick off both in parallel so DSL can arrive as soon as it's ready
  const explainPromise = providerExplain(prompt, context)
  const genPromise = generateWorkflowDslFromPrompt(prompt, orgId, context)

  function toId(label: string): string {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || `n-${Math.random().toString(36).slice(2,8)}`
  }
  function buildDslFromNarrative(text: string): WorkflowDsl {
    const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
    const stepLines: string[] = []
    for (const l of lines) if (/^(?:•|\d+\.|-)\s/.test(l)) stepLines.push(l.replace(/^(?:•|\d+\.|-)\s*/, ''))
    const nodes: any[] = []
    const edges: any[] = []
    const idSet = new Set<string>()
    function uniqueId(base: string): string {
      let id = base
      let n = 2
      while (idSet.has(id)) { id = `${base}-${n++}` }
      idSet.add(id)
      return id
    }
    function pushNode(type: string, label: string, extra?: any) {
      const base = toId(label || type)
      const id = uniqueId(base)
      nodes.push({ id, type, config: { label, ...(extra||{}) } })
      return id
    }
    let prev: string | null = null
    const hasSchedule = /schedule|daily|hour|cron|asian market/i.test(text)
    const startId = pushNode(hasSchedule ? 'schedule' : 'input', hasSchedule ? 'Schedule' : 'Webhook')
    prev = startId
    for (const raw of stepLines) {
      const s = raw.toLowerCase()
      if (/webhook|monitor twitter/.test(s)) { const id = pushNode('input', 'Twitter Webhook'); edges.push({ source: prev!, target: id }); prev = id }
      else if (/http|fetch|api|twitter\.com\//.test(s)) { const id = pushNode('http', 'HTTP Request', { url: 'https://api.example.com' }); edges.push({ source: prev!, target: id }); prev = id }
      else if (/switch|if within|case/.test(s)) { const id = pushNode('switch', 'Check Condition', { cases: ['yes','no'] }); edges.push({ source: prev!, target: id }); prev = id }
      else if (/delay|until/.test(s)) { const id = pushNode('delay', 'Delay'); edges.push({ source: prev!, target: id }); prev = id }
      else if (/parallel|simultaneous/.test(s)) {
        const pid = pushNode('parallel', 'Do in Parallel', { branches: 2 }); edges.push({ source: prev!, target: pid })
        const e1 = pushNode('http', 'Exchange 1'); const e2 = pushNode('http', 'Exchange 2')
        edges.push({ source: pid, target: e1 }); edges.push({ source: pid, target: e2 })
        const join = pushNode('join', 'Join Results'); edges.push({ source: e1, target: join }); edges.push({ source: e2, target: join }); prev = join
      }
      else if (/slack|discord/.test(s)) { const id = pushNode('slack', 'Notify'); edges.push({ source: prev!, target: id }); prev = id }
      else if (/sheet|spreadsheet|airtable|notion/.test(s)) { const id = pushNode('sheets', 'Log to Sheet'); edges.push({ source: prev!, target: id }); prev = id }
      else if (/email/.test(s)) { const id = pushNode('email', 'Email'); edges.push({ source: prev!, target: id }); prev = id }
      else if (/loop/.test(s)) { const id = pushNode('loop', 'Loop'); edges.push({ source: prev!, target: id }); prev = id }
      else if (/transform|analyz|extract|aggregate|summar/.test(s)) { const id = pushNode('transform', 'Transform'); edges.push({ source: prev!, target: id }); prev = id }
      else { const id = pushNode('transform', raw.slice(0,28)); edges.push({ source: prev!, target: id }); prev = id }
    }
    return { version: 2.1 as any, nodes, edges }
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      function send(line: string) {
        controller.enqueue(encoder.encode(`data: ${line}\n\n`))
      }
      let bestNodes = 0
      let explainDone = false
      let genDone = false
      function maybeSendDsl(dsl: any) {
        try {
          const strict = validateDslStrict(dsl)
          const count = Array.isArray(dsl?.nodes) ? dsl.nodes.length : 0
          if ((strict as any).ok === true && count > bestNodes) {
            send('[[DSL]] ' + JSON.stringify(dsl))
            bestNodes = count
          }
        } catch {}
      }
      function maybeClose() { if (explainDone && genDone) controller.close() }
      genPromise.then((out)=>{ send('[planner:ok]'); maybeSendDsl(out.dsl); genDone = true; maybeClose() }).catch((e)=>{ send('[planner:error] ' + String(e?.message||e)); genDone = true; maybeClose() })

      explainPromise.then((planText)=>{
        // Normalize and de-duplicate narrative lines for a cleaner chat
        const seen = new Set<string>()
        const lines = planText.split(/\r?\n/).map(l=> l.trim()).filter(l=>{
          if (!l) return false
          if (seen.has(l)) return false
          seen.add(l)
          return true
        })
        let i = 0
        const pump = () => {
          if (i < lines.length) {
            const line = lines[i++] || ''
            send(line)
            setTimeout(pump, 60)
          } else {
            // Try to synthesize a DSL from narrative and emit if better
            try {
              const heuristic = buildDslFromNarrative(planText)
              if ((heuristic.nodes?.length||0) > 3) maybeSendDsl(heuristic)
            } catch {}
            explainDone = true
            maybeClose()
          }
        }
        pump()
      }).catch(()=>{ explainDone = true; maybeClose() })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

