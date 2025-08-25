type LogLevel = 'debug'|'info'|'warn'|'error'|'audit'

function nowIso(): string { return new Date().toISOString() }

function redact(value: unknown): unknown {
  try {
    if (value == null) return value
    if (typeof value === 'string') {
      // Mask common secret patterns
      if (/api[_-]?key|secret|token|password/i.test(value)) return '***'
      if (value.length > 80) return value.slice(0, 60) + '…'
      return value
    }
    if (Array.isArray(value)) return value.map(v => redact(v))
    if (typeof value === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value as any)) {
        out[k] = /api[_-]?key|secret|token|password/i.test(k) ? '***' : redact(v)
      }
      return out
    }
    return value
  } catch { return value }
}

export function log(level: LogLevel, message: string, fields?: Record<string, unknown>) {
  try {
    const rec = { ts: nowIso(), level, msg: message, ...(fields||{}) }
    const safe = redact(rec)
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(safe))
  } catch {}
}

export function logAudit(action: string, fields?: Record<string, unknown>) {
  log('audit', action, fields)
}

export function withRequest(req: Request | null | undefined, extra?: Record<string, unknown>) {
  try {
    const id = req ? (req.headers.get('x-request-id') || '') : ''
    const url = req ? (new URL(req.url).pathname) : ''
    return redact({ requestId: id, route: url, ...(extra||{}) }) as Record<string, unknown>
  } catch { return extra || {} }
}


