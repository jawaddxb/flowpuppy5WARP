import type { FlowDoc } from '@/lib/flowdoc/schema'

export type ConnStatus = 'not-connected'|'connected'|'error'|'pending'|'skipped'

export function deriveRequiredProviders(flow: FlowDoc | null | undefined): string[] {
  if (!flow || !Array.isArray(flow.nodes)) return []
  const set = new Set<string>()
  for (const n of (flow.nodes as any[])) {
    const p = String((n as any).provider || '').toLowerCase()
    if (p && ['gmail','slack','sheets','drive','openweather','webscrape','browserless','twitter'].includes(p)) set.add(p)
    const secrets = Array.isArray((n as any)?.data?.secrets) ? ((n as any).data.secrets as any[]) : []
    for (const s of secrets) set.add(String(s).toLowerCase())
  }
  return Array.from(set)
}

export function readConnectionStatus(): Record<string, ConnStatus> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem('fp-conn-status')
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, ConnStatus>
  } catch { return {} }
}

export function setConnectionStatus(map: Record<string, ConnStatus>) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem('fp-conn-status', JSON.stringify(map)) } catch {}
}


