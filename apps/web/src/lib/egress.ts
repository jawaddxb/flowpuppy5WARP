const DEFAULT_ALLOW: string[] = [
  'api.openai.com',
  'api.anthropic.com',
  'openrouter.ai',
  'slack.com',
  'hooks.slack.com',
  'discord.com',
  'discordapp.com',
  'sheets.googleapis.com',
  'api.notion.com',
  'api.airtable.com',
  'api.github.com',
  'api.twitter.com',
  'api.sendgrid.com',
  'api.twilio.com',
]

function parseAllowlist(): string[] {
  const envList = (process.env.HTTP_ALLOWLIST || '').split(',').map(s=> s.trim()).filter(Boolean)
  const list = envList.length ? envList : DEFAULT_ALLOW
  return Array.from(new Set(list))
}

function isIpv4(host: string): boolean {
  return /^\d+\.\d+\.\d+\.\d+$/.test(host)
}

function isPrivateIpv4(host: string): boolean {
  if (!isIpv4(host)) return false
  const [a,b] = host.split('.').map(n=> Number(n))
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 192 && b === 168) return true
  if (a === 172) {
    const c = Number(host.split('.')[1])
    if (c >= 16 && c <= 31) return true
  }
  return false
}

function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase()
  return h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80:')
}

function hostMatchesSuffix(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith('.' + suffix)
}

export function ensureHostAllowed(urlString: string) {
  let url: URL
  try { url = new URL(urlString) } catch { throw new Error('egress: invalid url') }
  const proto = url.protocol
  if (proto !== 'https:' && !(proto === 'http:' && String(process.env.HTTP_ALLOW_HTTP||'').toLowerCase() === '1')) {
    throw new Error('egress: protocol not allowed')
  }
  const host = url.hostname
  if (isPrivateIpv4(host) || isPrivateIpv6(host) || host === 'localhost') {
    throw new Error('egress: private address blocked')
  }
  const allow = parseAllowlist()
  const ok = allow.some(sfx => hostMatchesSuffix(host, sfx))
  if (!ok) throw new Error('egress: host not in allowlist')
}

export async function safeFetch(input: string | URL | Request, init?: RequestInit) {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : String((input as any)?.url || ''))
  ensureHostAllowed(url)
  return fetch(input as any, init as any)
}


