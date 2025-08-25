import { safeFetch } from '@/lib/egress'
export type ProviderPref = { type?: string; model?: string; provider_id?: string | null }

export type ProviderResult = { ok: boolean; text?: string; json?: any; error?: string }

export interface AiProvider {
  name: string
  call: (input: { prompt: string; model?: string; jsonSchema?: { name: string; schema: any; strict?: boolean } }) => Promise<ProviderResult>
  health: () => Promise<{ ok: boolean; latencyMs?: number }>
}

async function mockDelay(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

// Deterministic mock provider used when mock_mode is enabled for a provider
const mockProvider: AiProvider = {
  name: 'mock',
  call: async ({ jsonSchema }) => {
    const name = (jsonSchema as any)?.name || ''
    // Return minimal valid objects for known schema names
    if (name === 'PlanResponse') {
      const data = {
        options: { plan: [{ text: 'Mock step', nodeIds: ['n1'] }] },
        defaults: {}
      }
      return { ok: true, text: JSON.stringify(data) }
    }
    if (name === 'ConfirmResponse') {
      const data = { agentSpec: { name: 'Mock Agent', inputs: {}, analysis: {} } }
      return { ok: true, text: JSON.stringify(data) }
    }
    if (name === 'WorkflowDsl') {
      const dsl = { version: 2.1, nodes: [{ id: 'start', type: 'input' }], edges: [] }
      return { ok: true, text: JSON.stringify(dsl) }
    }
    // Fallback generic JSON object
    return { ok: true, text: JSON.stringify({ ok: true }) }
  },
  health: async () => ({ ok: true, latencyMs: 1 })
}

export const providers: Record<string, AiProvider> = {
  claude: {
    name: 'claude',
    call: async ({ prompt, jsonSchema }) => {
      const key = process.env.ANTHROPIC_API_KEY
      if (!key) { return { ok: false, error: 'missing ANTHROPIC_API_KEY' } }
      try {
        const ctrl = new AbortController()
        const timeoutMs = (String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='1' || String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='true') ? 60000 : 40000
        const t = setTimeout(() => ctrl.abort(), timeoutMs)
        const res = await safeFetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 1200,
            system: [
              'You are a planner that must return only a single JSON object. No prose, no markdown, no code fences.',
              jsonSchema ? `Schema (JSON): ${JSON.stringify(jsonSchema.schema)}` : '',
              jsonSchema ? 'Validate before replying. If invalid, repair and re-emit a single valid JSON object.' : ''
            ].filter(Boolean).join('\n'),
            messages: [{ role: 'user', content: prompt }],
          }),
          signal: ctrl.signal,
        })
        clearTimeout(t)
        if (!res.ok) {
          let body = ''
          try { body = await res.text() } catch {}
          return { ok: false, error: `anthropic ${res.status}: ${body.slice(0,120)}` }
        }
        const data: any = await res.json().catch(()=> ({}))
        const text: string = (data?.content?.[0]?.type === 'text') ? (data?.content?.[0]?.text || '') : (data?.content?.[0]?.text || '')
        return { ok: true, text }
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) }
      }
    },
    health: async () => {
      const key = process.env.ANTHROPIC_API_KEY
      if (!key) { await mockDelay(20); return { ok: true, latencyMs: 20 } }
      try {
        const t0 = Date.now()
        const res = await safeFetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-3-5-sonnet-20240620', max_tokens: 1, messages: [{ role: 'user', content: 'ok' }] }),
        })
        const ms = Date.now() - t0
        return { ok: res.ok, latencyMs: ms }
      } catch { return { ok: false, latencyMs: 0 } }
    },
  },
  openai: {
    name: 'openai',
    call: async ({ prompt, model, jsonSchema }) => {
      const key = process.env.OPENAI_API_KEY
      if (!key) { return { ok: false, error: 'missing OPENAI_API_KEY' } }
      try {
        const ctrl = new AbortController()
        const timeoutMs = (String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='1' || String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='true') ? 60000 : 40000
        const t = setTimeout(() => ctrl.abort(), timeoutMs)
        // Default to Chat Completions for broader key compatibility; allow opting into Responses API
        const useResponsesApi = Boolean(jsonSchema) && String(process.env.OPENAI_USE_RESPONSES||'').toLowerCase()==='1'
        const url = useResponsesApi ? 'https://api.openai.com/v1/responses' : 'https://api.openai.com/v1/chat/completions'
        const body = useResponsesApi
          ? {
              model: model || 'gpt-4o-mini',
              input: prompt,
              temperature: 0,
              max_output_tokens: 2000,
              response_format: { type: 'json_schema', json_schema: { name: jsonSchema!.name || 'Schema', schema: jsonSchema!.schema || {}, strict: Boolean(jsonSchema!.strict) } },
            }
          : {
              model: model || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'Return ONLY a single valid JSON object. Do not include any prose, prefixes, or code fences.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0,
              response_format: { type: 'json_object' },
            }
        const res = await safeFetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${key}`,
          },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        })
        clearTimeout(t)
        if (!res.ok) {
          let body = ''
          try { body = await res.text() } catch {}
          return { ok: false, error: `openai ${res.status}: ${body.slice(0,120)}` }
        }
        const data: any = await res.json().catch(()=> ({}))
        const text: string = (data?.output_text as string) || data?.choices?.[0]?.message?.content || ''
        return { ok: true, text }
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) }
      }
    },
    health: async () => {
      const key = process.env.OPENAI_API_KEY
      if (!key) { await mockDelay(25); return { ok: true, latencyMs: 25 } }
      try {
        const t0 = Date.now()
        const res = await safeFetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'ok' }], max_tokens: 1 })
        })
        const ms = Date.now() - t0
        return { ok: res.ok, latencyMs: ms }
      } catch { return { ok: false, latencyMs: 0 } }
    },
  },
  deepseek: {
    name: 'deepseek',
    call: async ({ prompt }) => {
      const key = process.env.DEEPSEEK_API_KEY
      if (!key) { return { ok: false, error: 'missing DEEPSEEK_API_KEY' } }
      return { ok: false, error: 'deepseek provider not configured' }
    },
    health: async () => { await mockDelay(30); return { ok: true, latencyMs: 30 } },
  },
  qwen: {
    name: 'qwen',
    call: async ({ prompt }) => {
      const key = process.env.QWEN_API_KEY
      if (!key) { return { ok: false, error: 'missing QWEN_API_KEY' } }
      return { ok: false, error: 'qwen provider not configured' }
    },
    health: async () => { await mockDelay(35); return { ok: true, latencyMs: 35 } },
  },
  gemini: {
    name: 'gemini',
    call: async ({ prompt }) => {
      const key = process.env.GEMINI_API_KEY
      if (!key) { return { ok: false, error: 'missing GEMINI_API_KEY' } }
      return { ok: false, error: 'gemini provider not configured' }
    },
    health: async () => { await mockDelay(28); return { ok: true, latencyMs: 28 } },
  },
  mistral: {
    name: 'mistral',
    call: async ({ prompt }) => {
      const key = process.env.MISTRAL_API_KEY
      if (!key) { return { ok: false, error: 'missing MISTRAL_API_KEY' } }
      return { ok: false, error: 'mistral provider not configured' }
    },
    health: async () => { await mockDelay(32); return { ok: true, latencyMs: 32 } },
  },
  openrouter: {
    name: 'openrouter',
    call: async ({ prompt }) => {
      const key = process.env.OPENROUTER_API_KEY
      if (!key) { return { ok: false, error: 'missing OPENROUTER_API_KEY' } }
      try {
        const ctrl = new AbortController()
        const timeoutMs = (String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='1' || String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='true') ? 60000 : 40000
        const t = setTimeout(() => ctrl.abort(), timeoutMs)
        const res = await safeFetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'openrouter/auto',
            messages: [
              { role: 'system', content: 'Return ONLY valid JSON for the requested schema. Do not include markdown or code fences.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0
          }),
          signal: ctrl.signal,
        })
        clearTimeout(t)
        if (!res.ok) {
          let body = ''
          try { body = await res.text() } catch {}
          return { ok: false, error: `openrouter ${res.status}: ${body.slice(0,120)}` }
        }
        const data: any = await res.json().catch(()=> ({}))
        const text: string = data?.choices?.[0]?.message?.content || ''
        return { ok: true, text }
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) }
      }
    },
    health: async () => { await mockDelay(26); return { ok: true, latencyMs: 26 } },
  },
} as const

export async function routeProviders(order: ProviderPref[]): Promise<AiProvider[]> {
  const result: AiProvider[] = []
  const dict = providers as unknown as Record<string, AiProvider>
  for (const o of order) {
    const key = (o.type || '').toLowerCase()
    const p = dict[key]
    if (p) { result.push(p) }
  }
  if (result.length === 0) result.push(dict['claude']!)
  // Always append OpenRouter as a final fallback if available
  if (dict['openrouter'] && !result.includes(dict['openrouter'])) result.push(dict['openrouter'])
  return result
}

// Route providers honoring mock flag per entry
export function routeProvidersWithMock(order: Array<ProviderPref & { mock?: boolean }>): AiProvider[] {
  const dict = providers as unknown as Record<string, AiProvider>
  const out: AiProvider[] = []
  for (const o of order) {
    const type = String(o.type || '').toLowerCase()
    if (o.mock) out.push(mockProvider)
    else if (dict[type]) out.push(dict[type])
  }
  // Always ensure a fallback mock provider to keep CI deterministic
  if (out.length === 0) out.push(mockProvider)
  return out
}

// Utility: execute provider chain with logging (AB-204)
export async function executeProviderChain(
  providers: AiProvider[],
  invoke: (p: AiProvider) => Promise<ProviderResult>,
  attemptsPerProvider = 2,
  delayMs = 250
): Promise<{ ok: true; text: string; provider: string; logs: Array<{ provider: string; attempt: number; ms: number; outcome: string; error?: string }> } | { ok: false; logs: Array<{ provider: string; attempt: number; ms: number; outcome: string; error?: string }> } > {
  const logs: Array<{ provider: string; attempt: number; ms: number; outcome: string; error?: string }> = []
  for (const p of providers) {
    for (let attempt = 0; attempt < attemptsPerProvider; attempt++) {
      const t0 = Date.now()
      try {
        const r = await invoke(p)
        const ms = Date.now() - t0
        if (!r.ok || !(r.text || r.json)) {
          logs.push({ provider: p.name, attempt: attempt + 1, ms, outcome: 'error', error: r.error || 'no text' })
          break
        }
        const text = r.text || JSON.stringify(r.json)
        logs.push({ provider: p.name, attempt: attempt + 1, ms, outcome: 'ok' })
        return { ok: true, text: String(text), provider: p.name, logs }
      } catch (e: any) {
        const ms = Date.now() - t0
        logs.push({ provider: p.name, attempt: attempt + 1, ms, outcome: 'error', error: String(e?.message || e) })
        break
      }
    }
    // brief backoff before next provider
    await new Promise(res => setTimeout(res, delayMs))
  }
  return { ok: false, logs }
}


