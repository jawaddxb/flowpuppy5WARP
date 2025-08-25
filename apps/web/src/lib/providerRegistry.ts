import { seedFromString, seededRandom } from './seed'
import { z } from 'zod'

export type ProviderAuth = 'none' | 'apiKey' | 'oauth'
export type ProviderCategory = 'llm' | 'email' | 'weather' | 'chat' | 'storage' | 'calendar' | 'http' | 'docs' | 'other'

export type CredentialField = { name: string; label?: string; type?: 'string'|'password'|'number'|'select'|'json'|'oauth'; placeholder?: string; required?: boolean; options?: Array<{ label: string; value: string }> }

export interface ProviderDescriptor {
  id: string
  name: string
  category: ProviderCategory
  auth: ProviderAuth
  required_secrets?: string[]
  connectUrl?: string
  statusCheck?: (hasSecret: (name: string) => boolean) => Promise<'connected'|'missing'|'error'>
  mockResponse?: (seedKey: string, params?: Record<string, unknown>) => Promise<any>
  credentials?: { fields: CredentialField[] }
  testConnection?: (secrets: Record<string, string>) => Promise<{ ok: boolean; message?: string }>
}

export const ZProviderDescriptor = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['llm','email','weather','chat','storage','calendar','http','docs','other']),
  auth: z.enum(['none','apiKey','oauth']),
  required_secrets: z.array(z.string()).optional(),
  connectUrl: z.string().url().optional(),
  credentials: z.object({ fields: z.array(z.object({
    name: z.string().min(1),
    label: z.string().optional(),
    type: z.enum(['string','password','number','select','json','oauth']).optional(),
    placeholder: z.string().optional(),
    required: z.boolean().optional(),
    options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  })) }).optional(),
}).strict()

export function validateProviderDescriptor(d: unknown): { ok: boolean; errors?: string[] } {
  const res = ZProviderDescriptor.safeParse(d)
  if (res.success) return { ok: true }
  return { ok: false, errors: res.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }
}

function hasEnv(name: string): boolean { return !!process.env[name] }

export const registry: Record<string, ProviderDescriptor> = {
  openweather: {
    id: 'openweather', name: 'OpenWeather', category: 'weather', auth: 'apiKey', required_secrets: ['OPENWEATHER_API_KEY'],
    statusCheck: async (hasSecret) => hasSecret('OPENWEATHER_API_KEY') ? 'connected' : 'missing',
    credentials: { fields: [ { name: 'OPENWEATHER_API_KEY', label: 'API Key', type: 'password', required: true } ] },
    testConnection: async (secrets) => ({ ok: !!secrets.OPENWEATHER_API_KEY, message: !!secrets.OPENWEATHER_API_KEY ? 'Key present' : 'Missing OPENWEATHER_API_KEY' }),
    mockResponse: async (seedKey) => {
      const rnd = seededRandom(seedFromString(seedKey))
      const temp = Math.round(10 + rnd()*20)
      return { main: { temp }, weather: [{ main: temp > 20 ? 'Clear' : 'Clouds' }], name: 'Mock City' }
    }
  },
  gmail: {
    id: 'gmail', name: 'Gmail', category: 'email', auth: 'oauth', required_secrets: ['GOOGLE_CLIENT_ID'],
    statusCheck: async (hasSecret) => hasSecret('GOOGLE_CLIENT_ID') ? 'connected' : 'missing',
    credentials: { fields: [ { name: 'GOOGLE_CLIENT_ID', label: 'Client ID', type: 'string', required: true }, { name: 'GOOGLE_CLIENT_SECRET', label: 'Client Secret', type: 'password', required: true } ] },
    testConnection: async (secrets) => ({ ok: !!(secrets.GOOGLE_CLIENT_ID && secrets.GOOGLE_CLIENT_SECRET), message: 'Client ID/Secret ' + (secrets.GOOGLE_CLIENT_ID && secrets.GOOGLE_CLIENT_SECRET ? 'present' : 'missing') }),
    mockResponse: async (seedKey, params) => {
      const rnd = seededRandom(seedFromString(seedKey))
      const to = String((params?.to as string) || 'user@example.com')
      return { id: `m_${Math.floor(rnd()*1e6)}`, to, subject: 'Simulated Notification', status: 'queued' }
    }
  },
  apify: {
    id: 'apify', name: 'Apify', category: 'docs', auth: 'apiKey', required_secrets: ['APIFY_TOKEN'],
    statusCheck: async (hasSecret) => hasSecret('APIFY_TOKEN') ? 'connected' : 'missing',
    credentials: { fields: [ { name: 'APIFY_TOKEN', label: 'Token', type: 'password', required: true } ] },
    testConnection: async (secrets) => ({ ok: !!secrets.APIFY_TOKEN, message: !!secrets.APIFY_TOKEN ? 'Token present' : 'Missing APIFY_TOKEN' }),
    mockResponse: async (seedKey) => {
      const rnd = seededRandom(seedFromString(seedKey))
      const runId = `run_${Math.floor(rnd()*1e6)}`
      const items = Array.from({ length: 3 }).map((_,i)=> ({ id: `it_${i+1}`, title: `Result ${i+1}`, value: Math.round(rnd()*100) }))
      return { runId, dataset: items }
    }
  },
  scrapingbee: {
    id: 'scrapingbee', name: 'ScrapingBee', category: 'http', auth: 'apiKey', required_secrets: ['SCRAPINGBEE_API_KEY'],
    statusCheck: async (hasSecret) => hasSecret('SCRAPINGBEE_API_KEY') ? 'connected' : 'missing',
    credentials: { fields: [ { name: 'SCRAPINGBEE_API_KEY', label: 'API Key', type: 'password', required: true }, { name: 'RENDERING_MODE', label: 'Rendering Mode', type: 'select', options: [ { label: 'HTML', value: 'html' }, { label: 'Screenshot', value: 'screenshot' } ] } ] },
    testConnection: async (secrets) => ({ ok: !!secrets.SCRAPINGBEE_API_KEY, message: !!secrets.SCRAPINGBEE_API_KEY ? 'Key present' : 'Missing SCRAPINGBEE_API_KEY' }),
    mockResponse: async (seedKey, params) => {
      const rnd = seededRandom(seedFromString(seedKey))
      const url = String(params?.url || 'https://example.com')
      const html = `<html><head><title>Mock ${Math.floor(rnd()*1000)}</title></head><body><h1>Rendered ${url}</h1></body></html>`
      return { status: 200, html, headers: { 'content-type': 'text/html' } }
    }
  },
}

export async function getStatusForProviders(ids: string[], hasSecret: (name: string) => boolean) {
  const s: Record<string, 'connected'|'missing'|'error'> = {}
  for (const id of ids) {
    const d = registry[id]
    if (!d) continue
    try { s[id] = d.statusCheck ? await d.statusCheck(hasSecret) : 'connected' } catch { s[id] = 'error' }
  }
  return s
}

export function hasEnvSecret(name: string): boolean { return hasEnv(name) }


