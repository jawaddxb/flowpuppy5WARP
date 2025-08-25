export const runtime = 'edge'

import { NextResponse } from 'next/server'

type ManifestInput = { name: string; label?: string; type: 'string'|'number'|'boolean'|'json'; required?: boolean }

function buildManifest(slug: string) {
  const presets: Record<string, any> = {
    demo: {
      name: 'Energy Optimizer',
      slug: 'demo',
      icon: '☀️',
      description: 'Optimize charging/selling by price and weather.',
      inputs: [
        { name: 'homeZip', label: 'Home ZIP', type: 'string', required: true },
        { name: 'sellThreshold', label: 'Sell when price > ¢/kWh', type: 'number', required: false, default: 25 },
      ],
      theme: { accent: '#10b981' },
    },
  }
  return presets[slug] || {
    name: slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    slug,
    icon: '🐶',
    description: 'A FlowPuppy mini app',
    inputs: [ { name: 'query', label: 'Query', type: 'string', required: true } ],
    theme: { accent: '#3b82f6' },
  }
}

function validateInputs(inputs: ManifestInput[], data: any) {
  const errors: string[] = []
  const clean: Record<string, any> = {}
  for (const inp of inputs) {
    const v = data?.[inp.name]
    if (inp.required && (v === undefined || v === null || v === '')) {
      errors.push(`missing required input: ${inp.name}`)
      continue
    }
    if (v === undefined) continue
    switch (inp.type) {
      case 'string': if (typeof v !== 'string') errors.push(`input ${inp.name} must be string`); else clean[inp.name] = v; break
      case 'number': {
        let n: number | null = null
        if (typeof v === 'number') n = v
        else if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) n = Number(v)
        if (n === null) errors.push(`input ${inp.name} must be number`); else clean[inp.name] = n
        break
      }
      case 'boolean': {
        if (typeof v === 'boolean') clean[inp.name] = v
        else if (v === 'true' || v === 'false') clean[inp.name] = v === 'true'
        else errors.push(`input ${inp.name} must be boolean`)
        break
      }
      case 'json': {
        if (typeof v === 'object') clean[inp.name] = v
        else if (typeof v === 'string') {
          try { clean[inp.name] = JSON.parse(v) } catch { errors.push(`input ${inp.name} must be JSON`) }
        } else errors.push(`input ${inp.name} must be JSON`)
        break
      }
    }
  }
  return { ok: errors.length === 0, errors, input: clean }
}

// Basic per-IP+slug quota (reset every minute)
const quota = new Map<string, { count: number; resetAt: number }>()
const LIMIT_PER_MIN = 30

function checkQuota(key: string) {
  const now = Date.now()
  const rec = quota.get(key)
  if (!rec || rec.resetAt < now) {
    quota.set(key, { count: 1, resetAt: now + 60_000 })
    return { ok: true }
  }
  if (rec.count >= LIMIT_PER_MIN) return { ok: false }
  rec.count += 1
  return { ok: true }
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug || 'demo'
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'local'
  const quotaKey = `${slug}:${ip}:run`
  if (!checkQuota(quotaKey).ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const { dsl, input } = await req.json().catch(() => ({}))
  if (!dsl || typeof dsl !== 'object') return NextResponse.json({ error: 'dsl required' }, { status: 400 })

  const manifest = buildManifest(slug)
  const { ok, errors, input: clean } = validateInputs((manifest.inputs || []) as ManifestInput[], input || {})
  if (!ok) return NextResponse.json({ error: 'invalid_input', issues: errors }, { status: 400 })

  // Return stream path for client to connect
  const streamPath = `/apps/${encodeURIComponent(slug)}/stream`
  return NextResponse.json({ ok: true, streamPath, slug, acceptedAt: Date.now(), input: clean })
}



