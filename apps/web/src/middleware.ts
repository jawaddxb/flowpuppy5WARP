import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  // Correlation ID
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
  const path = req.nextUrl.pathname || ''
  const e2e = String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()
  const bypass = (e2e==='1'||e2e==='true')

  // AB-450: Per-route rate limiting with headers; bypass blocking in E2E but still emit headers
  const profiles: Array<{ test: (p:string)=>boolean; limit: number; windowMs: number }> = [
    { test: p => p.startsWith('/api/chat'), limit: 180, windowMs: 60_000 },
    { test: p => p.startsWith('/api/agent/plan') || p.startsWith('/api/agent/confirm') || p.startsWith('/api/agent/generate'), limit: 60, windowMs: 60_000 },
    { test: p => p.startsWith('/api/ai/generate-workflow'), limit: 40, windowMs: 60_000 },
    { test: p => p.startsWith('/api/run/stream'), limit: 30, windowMs: 60_000 },
  ]
  const profile = profiles.find(pr => pr.test(path)) || { limit: 300, windowMs: 60_000, test: ()=>false }
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'local'
  const key = `${ip}:${profile.limit}:${profile.windowMs}:${path.split('/').slice(0,4).join('/')}`
  const now = Date.now()
  const store: Map<string, { count: number; window: number }> = (globalThis as any).__rate || ((globalThis as any).__rate = new Map())
  const cur = store.get(key)
  let count = 1
  let windowStart = now
  if (!cur || now - cur.window > profile.windowMs) {
    store.set(key, { count, window: now })
  } else {
    cur.count += 1
    count = cur.count
    windowStart = cur.window
  }

  const remaining = Math.max(0, profile.limit - count)
  const secondsLeft = Math.max(0, Math.ceil((profile.windowMs - (now - windowStart)) / 1000))

  if (!bypass && count > profile.limit) {
    const tooMany = new NextResponse('Too Many Requests', { status: 429 })
    tooMany.headers.set('X-RateLimit-Limit', String(profile.limit))
    tooMany.headers.set('X-RateLimit-Remaining', '0')
    tooMany.headers.set('X-RateLimit-Window', String(profile.windowMs))
    tooMany.headers.set('RateLimit-Policy', `${profile.limit};w=${Math.round(profile.windowMs/1000)}`)
    tooMany.headers.set('Retry-After', String(secondsLeft))
    tooMany.headers.set('x-request-id', requestId)
    return tooMany
  }

  // Content-Security-Policy with nonce for API routes only to avoid blocking Next.js page scripts
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const res = NextResponse.next()
  const self = "'self'"
  if (path.startsWith('/api')) {
    const csp = [
      `default-src ${self}`,
      `script-src ${self} 'nonce-${nonce}' 'strict-dynamic' https: http:`,
      `style-src ${self} 'unsafe-inline' https: http:`,
      `img-src ${self} data: https: http:`,
      `font-src ${self} data: https:`,
      `connect-src ${self} https: http: ws: wss:`,
      `frame-ancestors ${self}`,
      `base-uri ${self}`,
      `form-action ${self}`,
    ].join('; ')
    res.headers.set('Content-Security-Policy', csp)
    res.headers.set('x-csp-nonce', nonce)
  }
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  res.headers.set('x-request-id', requestId)
  // Rate limit headers always present
  res.headers.set('X-RateLimit-Limit', String(profile.limit))
  res.headers.set('X-RateLimit-Remaining', String(remaining))
  res.headers.set('X-RateLimit-Window', String(profile.windowMs))
  res.headers.set('RateLimit-Policy', `${profile.limit};w=${Math.round(profile.windowMs/1000)}`)
  if (bypass) res.headers.set('X-RateLimit-Bypass', '1')
  return res
}


export const config = {
  matcher: [
    // Apply to all except Next static assets and favicon
    '/((?!_next/static|_next/image|favicon\\.ico).*)'
  ]
}


