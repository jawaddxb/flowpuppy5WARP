import { WorkflowDsl } from '@/lib/dsl'
import { validateDslStrict } from '@/lib/dslSchema'
import { getProviderOrder } from '@/lib/aiRouting'
import { routeProviders, type AiProvider } from '@/lib/providers'

// Simple in-memory health cache (TTL)
const healthCache = new Map<string, { ok: boolean; latencyMs: number; at: number }>()
const HEALTH_TTL_MS = 60_000

function buildStructuredPrompt(userPrompt: string, context?: Record<string, unknown>): string {
  const schema = `{
    "version": 2.1,
    "nodes": [
      { "id": "string", "type": "input|http|email|transform|delay|parallel|join|switch|trycatch|loop|subflow|slack|notion|sheets|airtable|discord|frame", "config": {}, "position": { "x": number, "y": number } }
    ],
    "edges": [
      { "source": "nodeId", "target": "nodeId", "label": "optional", "data": {"type":"success|error|guarded","guard":"optional js expression"}}
    ]
  }`
  const rules = `
Output ONLY valid JSON matching the schema. Do NOT include code fences.
Rules:
- Always include a starting trigger node with type "input" and config: { label, path }
- Use constructs where appropriate: "parallel" + "join", "switch" with cases (encode in edge labels), "loop" with iterations, "trycatch" with try/catch branches (use edge labels try/catch)
- For integrations (slack, notion, sheets, airtable, discord), include minimal config placeholders (e.g., channel, databaseId, range)
- For http: include method and url
- Position nodes roughly left-to-right
- Keep ids short and unique
 - For switch nodes, create one outgoing edge per case with the case name as the edge label. Ensure edge count matches cases
 - For trycatch, create two edges labeled "try" and "catch" from the trycatch node to appropriate targets
 - Avoid cycles; target nodes (except join) must have at most one incoming edge
 - If the goal references external services without a dedicated node (e.g., Twitter/X, crypto exchanges), use an HTTP node with placeholders and clear labels.
 - If the goal mentions a cadence (e.g., daily/hourly), add a schedule node and wire it to the flow.
 - Prefer meaningful labels in each node's config.label summarizing the action.
`
  const ctx = context && Object.keys(context).length ? `\n\nContext (previous steps, constraints): ${JSON.stringify(context)}` : ''
  return `You are an expert workflow planner. Based on the user's goal, produce a FlowPuppy DSL v2.1 plan as JSON.\n\nUser goal: ${userPrompt}${ctx}\n\nSchema: ${schema}\n\n${rules}`
}

function parseJsonFromText(text: string): any | null {
  try {
    // Try direct parse
    return JSON.parse(text)
  } catch {}
  // Try to extract from code fences
  const fence = text.match(/```json[\s\S]*?```/i)
  if (fence) {
    const inner = fence[0].replace(/```json/i, '').replace(/```$/, '')
    try { return JSON.parse(inner) } catch {}
  }
  // Try first {...} block
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const slice = text.slice(firstBrace, lastBrace + 1)
    try { return JSON.parse(slice) } catch {}
  }
  return null
}

// Very light JSON "repair" pass to coerce shape into WorkflowDsl-like structure
function repairDslShape(input: any): WorkflowDsl | null {
  try {
    if (!input || typeof input !== 'object') return null
    const out: any = {}
    out.version = 2.1
    const nodesIn = Array.isArray(input.nodes) ? input.nodes : []
    const edgesIn = Array.isArray(input.edges) ? input.edges : []
    out.nodes = nodesIn
      .filter((n: any) => n && typeof n === 'object')
      .map((n: any, i: number) => ({
        id: String(n.id || `n${i+1}`),
        type: String(n.type || 'transform'),
        config: typeof n.config === 'object' && n.config ? n.config : {},
        position: typeof n.position === 'object' && n.position ? n.position : { x: 80 + i*160, y: 100 },
      }))
    const nodeIds = new Set(out.nodes.map((n: any) => n.id))
    out.edges = edgesIn
      .filter((e: any) => e && typeof e === 'object')
      .map((e: any) => ({ source: String(e.source||''), target: String(e.target||''), label: e.label ? String(e.label) : undefined, data: typeof e.data==='object'&&e.data? e.data : undefined }))
      .filter((e: any) => nodeIds.has(e.source) && nodeIds.has(e.target) && e.source !== e.target)
    return out as WorkflowDsl
  } catch { return null }
}

function inferMissingSecrets(dsl: WorkflowDsl): string[] {
  const secrets = new Set<string>()
  for (const n of dsl.nodes) {
    const c = (n as any).config || {}
    for (const [k, v] of Object.entries(c)) {
      const key = k.toLowerCase()
      if (key.includes('token') || key.includes('api') || key.includes('secret')) {
        if (!v || typeof v !== 'string') {
          if (n.type === 'slack') secrets.add('SLACK_TOKEN')
          else if (n.type === 'discord') secrets.add('DISCORD_TOKEN')
          else secrets.add('API_KEY')
        }
      }
      if (key === 'headers' && typeof v === 'object' && v) {
        const auth = (v as any)['Authorization'] as string | undefined
        if (auth && /\$\{([A-Z0-9_]+)\}/.test(auth)) {
          const m = auth.match(/\$\{([A-Z0-9_]+)\}/)
          if (m && m[1]) secrets.add(m[1])
        }
      }
    }
  }
  return Array.from(secrets)
}

function normalizeSwitchEdgeLabels(dsl: WorkflowDsl): WorkflowDsl {
  const bySource = new Map<string, Array<any>>()
  for (const e of dsl.edges || []) {
    const arr = bySource.get(e.source) || []
    arr.push(e)
    bySource.set(e.source, arr)
  }
  for (const n of dsl.nodes || []) {
    if ((n as any).type === 'switch') {
      const cases: string[] = Array.isArray((n as any).config?.cases) ? (n as any).config.cases : []
      const outs = bySource.get((n as any).id) || []
      const unlabeled = outs.filter((e:any)=> !e.label || String(e.label).trim()==='')
      if (cases.length > 0 && unlabeled.length === outs.length) {
        for (let i = 0; i < Math.min(cases.length, outs.length); i++) {
          outs[i].label = cases[i]
        }
      }
    }
  }
  return dsl
}

export function normalizeDsl(dsl: WorkflowDsl): WorkflowDsl {
  return normalizeSwitchEdgeLabels(dsl)
}

export function computePlannerHints(prompt: string): string[] {
  const hints: string[] = []
  if (/parallel|in parallel|simultaneous/i.test(prompt)) hints.push('Use parallel branches with a join when steps can run concurrently.')
  if (/(?:\bif\b|\bthen\b|switch|case|otherwise|\belse\b)/i.test(prompt)) hints.push('Use a switch node with cases and label edges with case names.')
  if (/retry|timeout|fail|error/i.test(prompt)) hints.push('Wrap risky sections with trycatch and label edges try/catch; set retries/timeouts in config.')
  if (/loop|iterate|for each|repeat/i.test(prompt)) hints.push('Use a loop node with iterations or break conditions as appropriate.')
  if (/daily|every day|each day|hourly|every hour|cron/i.test(prompt)) hints.push('Add a schedule trigger for the requested cadence and wire it to the main flow.')
  if (/twitter|tweet|x\.com/i.test(prompt)) hints.push('Use an HTTP node to call Twitter API v2 (set Authorization: Bearer ${TWITTER_BEARER}) and map fields in transform nodes.')
  if (/exchange|binance|coinbase|kraken|bybit|okx/i.test(prompt)) hints.push('Represent trading actions as HTTP nodes to exchange REST APIs with placeholders for auth and endpoints.')
  return hints
}

export async function generateWorkflowDslFromPrompt(prompt: string, orgId?: string, context?: Record<string, unknown>) {
  const order = await getProviderOrder('chat', orgId)
  const routed = await routeProviders(order)
  // Health-based prioritization (simple): prefer providers that respond to a 1-token ping, by latency
  async function prioritizeByHealth(list: AiProvider[]): Promise<AiProvider[]> {
    const now = Date.now()
    const checks = await Promise.all(list.map(async (p) => {
      const cached = healthCache.get(p.name)
      if (cached && (now - cached.at) < HEALTH_TTL_MS) {
        return { p, h: { ok: cached.ok, latencyMs: cached.latencyMs } }
      }
      try {
        const h = await p.health()
        healthCache.set(p.name, { ok: h.ok, latencyMs: h.latencyMs || 0, at: Date.now() })
        return { p, h }
      } catch {
        healthCache.set(p.name, { ok: false, latencyMs: 0, at: Date.now() })
        return { p, h: { ok: false, latencyMs: 0 } }
      }
    }))
    const ok = checks.filter(c => c.h.ok).sort((a,b)=> (a.h.latencyMs||999) - (b.h.latencyMs||999)).map(c=>c.p)
    const bad = checks.filter(c => !c.h.ok).map(c=>c.p)
    return ok.length ? [...ok, ...bad] : list
  }
  const providers = await prioritizeByHealth(routed as AiProvider[])
  const errors: string[] = []
  const hints = computePlannerHints(prompt)
  for (const prov of providers) {
    const ptxt = buildStructuredPrompt(`${prompt}\n\nHints:\n- ${hints.join('\n- ')}`, context)
    const t0 = Date.now()
    const res = await prov.call({ prompt: ptxt })
    const latencyMs = Date.now() - t0
    if (!res.ok || !res.text) { errors.push(`${prov.name}: ${res.error || 'no text'}`); continue }
    const json = parseJsonFromText(res.text)
    if (!json) { errors.push(`${prov.name}: parse fail`); continue }
    const strict = validateDslStrict(json)
    if ((strict as any).ok !== true) {
      // Attempt repair
      const repaired = repairDslShape(json)
      if (!repaired) { errors.push(`${prov.name}: invalid dsl`); continue }
      const strict2 = validateDslStrict(repaired)
      if ((strict2 as any).ok !== true) { errors.push(`${prov.name}: repair failed`); continue }
      let dsl = repaired as WorkflowDsl
      dsl = normalizeDsl(dsl)
      const missingSecrets = inferMissingSecrets(dsl)
      return { dsl, rationale: `Repaired JSON from ${prov.name} (${latencyMs}ms)`, confidence: 0.7, missingSecrets, providerName: prov.name, latencyMs }
    }
    let dsl = json as WorkflowDsl
    dsl = normalizeDsl(dsl)
    const missingSecrets = inferMissingSecrets(dsl)
    return { dsl, rationale: `Generated by ${prov.name} (${latencyMs}ms)`, confidence: 0.8, missingSecrets, providerName: prov.name, latencyMs }
  }
  // Heuristic fallbacks for common intents
  const p = (prompt || '').toLowerCase()
  let fallback: WorkflowDsl
  if (/twitter|tweet|\bx\b/.test(p)) {
    fallback = {
      version: 2.1 as any,
      nodes: [
        { id: 'sched', type: 'schedule', position: { x: 80, y: 100 }, config: { label: 'Daily 09:00 EST' } },
        { id: 'trends', type: 'http', position: { x: 320, y: 100 }, config: { label: 'Fetch AI trends', method: 'GET', url: 'https://api.twitter.com/2/tweets/search/recent?query=ai', headers: { Authorization: 'Bearer ${TWITTER_BEARER}' } } },
        { id: 'compose', type: 'transform', position: { x: 560, y: 100 }, config: { label: 'Compose tweet (professional)', prompt: 'Summarize trending AI topic in a professional tone. Include an image prompt.' } },
        { id: 'tweet', type: 'http', position: { x: 800, y: 100 }, config: { label: 'Post tweet', method: 'POST', url: 'https://api.twitter.com/2/tweets', headers: { Authorization: 'Bearer ${TWITTER_BEARER}' }, body: { text: '${COMPOSED_TEXT}' } } },
      ],
      edges: [ { source: 'sched', target: 'trends' }, { source: 'trends', target: 'compose' }, { source: 'compose', target: 'tweet' } ],
    }
  } else {
    // Generic fallback
    fallback = {
      version: 2.1 as any,
      nodes: [
        { id: 'trigger', type: 'input', position: { x: 80, y: 100 }, config: { label: 'Webhook', path: '/new' } },
        { id: 'http', type: 'http', position: { x: 320, y: 100 }, config: { label: 'HTTP Request', method: 'GET', url: 'https://api.example.com' } },
        { id: 'email', type: 'email', position: { x: 560, y: 100 }, config: { label: 'Email', to: 'user@example.com', subject: 'Done' } },
      ],
      edges: [ { source: 'trigger', target: 'http' }, { source: 'http', target: 'email' } ],
    }
  }
  fallback = normalizeDsl(fallback)
  return { dsl: fallback, rationale: `Fallback plan. Errors: ${errors.join('; ')}`, confidence: 0.4, missingSecrets: [], providerName: 'fallback', latencyMs: 0 }
}


