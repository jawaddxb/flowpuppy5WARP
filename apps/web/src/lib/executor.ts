import { WorkflowDsl } from '@/lib/dsl'
import { getAdminSupabase } from '@/lib/supabaseClient'
import { decryptStringAESGCM } from '@/lib/crypto'
import { sendEmail, sendSlack, sendDiscord } from '@/lib/executorEmailSlack'
import { execNotion, execSheets, execAirtable } from '@/lib/executorIntegrations'

export type StepEvent = { type: 'step'; nodeId: string; name?: string; status: 'ok'|'error'; input?: any; output?: any; error?: string; durationMs?: number; costUSD?: number }

function replaceSecretsDeep(value: any, secrets: Record<string, string>): any {
  if (typeof value === 'string') {
    return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, key) => secrets[key] ?? '')
  }
  if (Array.isArray(value)) return value.map(v => replaceSecretsDeep(v, secrets))
  if (value && typeof value === 'object') {
    const out: any = {}
    for (const [k, v] of Object.entries(value)) out[k] = replaceSecretsDeep(v, secrets)
    return out
  }
  return value
}

export async function loadSecretsMap(): Promise<Record<string, string>> {
  const supabase = getAdminSupabase()
  if (!supabase) return {}
  const { data } = await supabase.from('secrets').select('name,value_encrypted').limit(1000)
  const map: Record<string, string> = {}
  for (const r of data || []) {
    const enc = (r as any).value_encrypted || ''
    let val = enc
    try {
      val = await decryptStringAESGCM(enc, process.env.SECRETS_KEY || 'dev-key')
    } catch {
      // fallback: maybe legacy/plain
      try {
        const raw = Buffer.from(enc, 'base64').toString('utf8')
        val = raw
      } catch {}
    }
    map[(r as any).name] = val
  }
  return map
}

const HTTP_METHODS = new Set(['GET','POST','PUT','PATCH','DELETE','HEAD'])
const ALLOWLIST_HOSTS = (process.env.HTTP_ALLOWLIST || 'discord.com,slack.com,api.openai.com,api.anthropic.com,openrouter.ai,sheets.googleapis.com,api.notion.com,api.airtable.com,example.com').split(',').map(s=>s.trim()).filter(Boolean)
const MAX_BODY_BYTES = Number(process.env.HTTP_MAX_BODY || 1_000_000)

function hostAllowed(url: string): boolean {
  try {
    const u = new URL(url)
    return ALLOWLIST_HOSTS.some(p => u.hostname.endsWith(p))
  } catch { return false }
}

async function execHttp(config: any, timeoutMs?: number): Promise<any> {
  const method = String(config?.method || 'GET').toUpperCase()
  const url = String(config?.url || '')
  if (!HTTP_METHODS.has(method)) throw new Error('http: method not allowed')
  if (!hostAllowed(url)) throw new Error('http: host not allowed')
  const headers = (config?.headers && typeof config.headers === 'object') ? config.headers : {}
  const bodyStr = config?.body ? JSON.stringify(config.body) : undefined
  const body = bodyStr && bodyStr.length > MAX_BODY_BYTES ? (()=>{ throw new Error('http: body too large') })() : bodyStr
  const ctrl = new AbortController()
  const t = timeoutMs ? setTimeout(() => ctrl.abort(), timeoutMs) : null
  const res = await fetch(url, { method, headers, body, signal: ctrl.signal as any })
  if (t) clearTimeout(t)
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { status: res.status, body: text } }
}

async function execTransform(config: any, input: any): Promise<any> {
  const code = String(config?.script || 'return input')
  const timeoutMs = Math.min(2000, Number(config?.timeoutMs ?? 1000))
  const WorkerRef: any = (globalThis as any).Worker
  if (typeof WorkerRef !== 'function') {
    // Fallback for test/SSR: direct Function execution
    // eslint-disable-next-line no-new-func
    const fn = new Function('input', code)
    return await fn(input)
  }
  return await new Promise((resolve, reject) => {
    const blob = new Blob([
      `onmessage = (e) => { try { const fn = new Function('input', e.data.code); const res = fn(e.data.input); postMessage({ ok: true, res }); } catch (err) { postMessage({ ok: false, err: String(err?.message||err) }); } }`
    ], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    const worker = new WorkerRef(url)
    const to = setTimeout(() => { try { worker.terminate() } catch {}; reject(new Error('transform: timeout')) }, timeoutMs)
    worker.onmessage = (ev: any) => {
      clearTimeout(to)
      try { worker.terminate() } catch {}
      URL.revokeObjectURL(url)
      const d = ev.data
      if (d && d.ok) resolve(d.res)
      else reject(new Error(String(d?.err || 'transform: error')))
    }
    worker.postMessage({ code, input })
  })
}

async function execDelay(config: any): Promise<any> { const ms = Number(config?.ms || 0); if (ms > 0) await new Promise(r=>setTimeout(r, ms)); return { delayed: ms } }

async function execNoop(_: any): Promise<any> { return { ok: true } }

async function execLoop(config: any, input: any): Promise<any> {
  const items = Array.isArray(config?.items) ? config.items : (Array.isArray(input) ? input : [])
  const maxConcurrent = Math.max(1, Number(config?.maxConcurrent ?? 4))
  const mapperCode: string = String(config?.mapper || 'return item')
  // eslint-disable-next-line no-new-func
  const mapper = new Function('item', 'index', 'input', mapperCode) as (item:any, index:number, input:any)=>any
  const results: any[] = []
  let idx = 0
  async function worker() {
    while (idx < items.length) {
      const my = idx++
      try { results[my] = await Promise.resolve(mapper(items[my], my, input)) } catch (e:any) { results[my] = { error: String(e?.message||e) } }
    }
  }
  const workers = Array.from({ length: Math.min(maxConcurrent, items.length||0) }, () => worker())
  await Promise.all(workers)
  return { count: items.length, results }
}

async function execCode(config: any, input: any): Promise<any> {
  const code = String(config?.code || '')
  if (!code) return { ok: true }
  // Use Worker if available; otherwise restricted Function
  const WorkerRef: any = (globalThis as any).Worker
  if (typeof WorkerRef !== 'function') {
    // eslint-disable-next-line no-new-func
    const fn = new Function('input', code)
    return await Promise.resolve(fn(input))
  }
  const timeoutMs = Math.min(3000, Number(config?.timeoutMs ?? 1500))
  return await new Promise((resolve, reject) => {
    const blob = new Blob([
      `onmessage = (e) => { try { const fn = new Function('input', e.data.code); const res = fn(e.data.input); postMessage({ ok: true, res }); } catch (err) { postMessage({ ok: false, err: String(err?.message||err) }); } }`
    ], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    const worker = new WorkerRef(url)
    const to = setTimeout(() => { try { worker.terminate() } catch {}; reject(new Error('code: timeout')) }, timeoutMs)
    worker.onmessage = (ev: any) => {
      clearTimeout(to)
      try { worker.terminate() } catch {}
      URL.revokeObjectURL(url)
      const d = ev.data
      if (d && d.ok) resolve(d.res)
      else reject(new Error(String(d?.err || 'code: error')))
    }
    worker.postMessage({ code, input })
  })
}

async function execKbSearch(config: any): Promise<any> {
  const docs: Array<{ title: string; text: string }> = Array.isArray(config?.docs) ? config.docs : []
  const q = String(config?.query || '').toLowerCase()
  const k = Math.max(1, Math.min(10, Number(config?.k ?? 3)))
  const scored = docs.map(d => ({ d, s: scoreDoc(d, q) }))
  scored.sort((a,b)=> b.s - a.s)
  return { query: q, top: scored.slice(0,k).map(x=> ({ title: x.d.title, snippet: snippet(x.d.text, q) })) }
}

function scoreDoc(d: { title: string; text: string }, q: string): number {
  const hay = `${d.title}\n${d.text}`.toLowerCase()
  if (!q) return 0
  const parts = q.split(/\s+/).filter(Boolean)
  return parts.reduce((s, term)=> s + (hay.includes(term) ? 1 : 0), 0)
}

function snippet(text: string, q: string): string {
  const hay = text.toLowerCase()
  const i = hay.indexOf(q.split(/\s+/)[0] || '')
  const start = Math.max(0, i - 40)
  return text.slice(start, start + 160)
}

async function execBrowser(config: any): Promise<any> {
  const enabled = String(process.env.COMPUTER_USE_ENABLED||'').toLowerCase()
  if (!(enabled==='1'||enabled==='true')) {
    return { ok: false, reason: 'computer-use disabled' }
  }
  // Placeholder: Integrate with a remote headless browser (e.g., Browserless) here
  const url = String(config?.url||'')
  const actions = Array.isArray(config?.actions) ? config.actions : []
  return { ok: true, url, actions, note: 'stubbed execution' }
}

function edgePasses(e: any, status: 'ok'|'error', output: any): boolean {
  const t = e?.data?.type
  if (t === 'error' && status !== 'error') return false
  if (t === 'success' && status !== 'ok') return false
  const guard = e?.data?.guard
  if (guard && typeof guard === 'string') {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('output', 'status', `return (${guard})`)
      const res = fn(output, status)
      if (!res) return false
    } catch {}
  }
  return true
}

export async function* executeWorkflow(
  dsl: WorkflowDsl,
  runInput: any,
  secrets: Record<string,string>,
  options?: { maxRuntimeMs?: number; backoffBaseMs?: number }
): AsyncGenerator<StepEvent, void, unknown> {
  const nodes = dsl.nodes || []
  const edges = dsl.edges || []
  const byId = new Map(nodes.map(n => [n.id, n]))
  const outEdges = new Map<string, Array<typeof edges[number]>>()
  for (const e of edges) {
    const arr = outEdges.get(e.source) || []
    arr.push(e as any)
    outEdges.set(e.source, arr)
  }
  // Incoming edges map and join policies
  const inEdges = new Map<string, Array<typeof edges[number]>>()
  for (const n of nodes) inEdges.set(n.id, [])
  for (const e of edges) {
    const arr = inEdges.get(e.target) || []
    arr.push(e as any)
    inEdges.set(e.target, arr)
  }
  const requiredCount = new Map<string, number>()
  for (const n of nodes) {
    const id = n.id as string
    const incoming = (inEdges.get(id) || []).length
    let req = incoming
    const join = (n as any)?.config?.join
    if (join === 'any') req = Math.min(1, incoming)
    else if (typeof join === 'object' && typeof (join as any).count === 'number') req = Math.max(0, Math.min(incoming, Number((join as any).count)))
    requiredCount.set(id, req)
  }
  const readyCounts = new Map<string, number>()
  for (const n of nodes) readyCounts.set(n.id as string, 0)
  const processed = new Set<string>()
  const queued = new Set<string>()
  const queue: string[] = []
  for (const n of nodes) {
    const id = n.id as string
    if ((requiredCount.get(id) || 0) === 0) { queue.push(id); queued.add(id) }
  }
  const outputs = new Map<string, any>()
  const backoffBase = Math.max(50, Number(options?.backoffBaseMs ?? 200))
  const startedAt = Date.now()
  let totalCost = 0
  while (queue.length) {
    if (options?.maxRuntimeMs && Date.now() - startedAt > options.maxRuntimeMs) {
      break
    }
    const id = queue.shift() as string
    const n = byId.get(id)
    if (!n) continue
    processed.add(id)
    const resolvedCfg = replaceSecretsDeep((n as any).config || {}, secrets)
    const t0 = Date.now()
    let out: any
    let status: 'ok'|'error' = 'ok'
    let errMsg: string | undefined
    let costUSD = 0
    const retries = Math.max(0, Number(resolvedCfg?.retries ?? 0))
    const timeoutMs = Number(resolvedCfg?.timeoutMs ?? 0) || undefined
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        switch (n.type) {
          case 'input': out = runInput ?? {}; break
          case 'http': out = await execHttp(resolvedCfg, timeoutMs); break
          case 'transform': out = await execTransform(resolvedCfg, outputs.get(id) ?? runInput ?? {}); break
          case 'code': out = await execCode(resolvedCfg, outputs.get(id) ?? runInput ?? {}); break
          case 'kb': out = await execKbSearch(resolvedCfg); break
          case 'browser': out = await execBrowser(resolvedCfg); break
          case 'delay': out = await execDelay(resolvedCfg); break
          case 'email': out = await sendEmail(resolvedCfg); break
          case 'slack': out = await sendSlack(resolvedCfg); break
          case 'discord': out = await sendDiscord(resolvedCfg); break
          case 'notion': out = await execNotion(resolvedCfg); break
          case 'sheets': out = await execSheets(resolvedCfg); break
          case 'airtable': out = await execAirtable(resolvedCfg); break
          case 'loop': out = await execLoop(resolvedCfg, outputs.get(id) ?? runInput ?? {}); break
          default: out = await execNoop(resolvedCfg); break
        }
        status = 'ok'
        errMsg = undefined
        break
      } catch (e: any) {
        status = 'error'
        errMsg = String(e?.message || e)
        if (attempt < retries) {
          const delay = backoffBase * Math.pow(2, attempt)
          await new Promise((r)=> setTimeout(r, delay))
          continue
        }
      }
    }
    const ev: StepEvent = { type: 'step', nodeId: id, name: ((n as any).config?.label || n.type) as any, status, input: runInput ?? null, output: out, error: errMsg, durationMs: Date.now() - t0, costUSD }
    yield ev
    totalCost += costUSD
    outputs.set(id, out)
    for (const e of outEdges.get(id) || []) {
      if (!edgePasses(e, status, out)) continue
      const tgt = e.target as string
      readyCounts.set(tgt, (readyCounts.get(tgt) || 0) + 1)
      const need = requiredCount.get(tgt) || 0
      if (!processed.has(tgt) && !queued.has(tgt) && (readyCounts.get(tgt) || 0) >= need) {
        queue.push(tgt)
        queued.add(tgt)
      }
    }
  }
}


