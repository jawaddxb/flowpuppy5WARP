import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'
import { validateProviderDescriptor } from '@/lib/providerRegistry'

function getOrgId(req: Request): string | null {
  try {
    const url = new URL(req.url)
    const org = url.searchParams.get('org')
    if (org) return org
  } catch {}
  return null
}

export async function GET(req: Request) {
  const orgIdRaw = getOrgId(req)
  const allow = String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()
  const orgId = orgIdRaw || ((allow==='1'||allow==='true') ? 'org-demo' : null)
  if (!orgId) return NextResponse.json({ error: 'org required' }, { status: 401 })
  const supabase = getAdminSupabase()
  if (!supabase) {
    // Fallback sample list for dev/mock to populate Admin UI
    const sample = [
      { id: 'openweather', name: 'OpenWeather', category: 'weather' },
      { id: 'gmail', name: 'Gmail', category: 'email' },
      { id: 'webscrape', name: 'WebScrape', category: 'http' },
      { id: 'amplitude', name: 'Amplitude', category: 'analytics' },
    ]
    const list = sample.map((r: any) => ({
      id: r.id,
      type: r.name || r.id,
      model: '',
      scope: 'global' as const,
      latency: 0,
      errorRate: 0,
      active: true,
      category: r.category || 'other',
      mockMode: (allow==='1'||allow==='true'),
      connected: false,
    }))
    return NextResponse.json({ providers: list })
  }
  const { data, error } = await supabase.from('providers').select('*').order('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Fetch org settings (mock and secrets)
  const { data: settings } = await supabase
    .from('org_provider_settings')
    .select('provider_id, mock_mode, secrets')
    .eq('org_id', orgId)
  const settingsMap = new Map<string, any>((settings||[]).map((s:any)=> [s.provider_id, s]))
  const list = (data || []).map((r: any) => {
    const s = settingsMap.get(r.id)
    const secrets = (s?.secrets || {}) as Record<string, any>
    const connected = Boolean(secrets.OAUTH_TOKEN || secrets.oauth_token || secrets.access_token || secrets.token)
    return {
      id: r.id,
      type: r.name || r.id,
      model: '',
      scope: 'global',
      latency: 0,
      errorRate: 0,
      active: true,
      category: r.category || 'other',
      mockMode: (s?.mock_mode ?? true),
      connected,
    }
  })
  return NextResponse.json({ providers: list })
}

export async function POST(req: Request) {
  const supabase = getAdminSupabase()
  const body = await req.json().catch(()=> ({}))
  const v = validateProviderDescriptor({
    id: body.id || body.type,
    name: body.name || body.type,
    category: body.category || 'other',
    auth: (body.auth_type || 'apiKey'),
    required_secrets: body.required_secrets || [],
    credentials: body.config_schema?.credentials,
    connectUrl: body.connectUrl,
  })
  if (!v.ok) return NextResponse.json({ error: 'invalid provider descriptor', issues: v.errors }, { status: 400 })
  const url = new URL(req.url)
  const orgId = url.searchParams.get('org')
  const allow = String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()
  if (!orgId && !(allow==='1'||allow==='true')) return NextResponse.json({ error: 'org required' }, { status: 401 })
  if (!supabase) return NextResponse.json({ provider: { ...body, id: body.id || body.type || 'custom' } })
  const { data, error } = await supabase.from('providers').insert({
    id: body.id || body.type,
    name: body.name || body.type,
    category: body.category || 'other',
    auth_type: body.auth_type || 'apiKey',
    required_secrets: body.required_secrets || [],
    config_schema: body.config_schema || {},
    capabilities: body.capabilities || [],
    icon_url: body.icon_url || null,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const provider = {
    id: data.id,
    type: data.name || data.id,
    model: '',
    scope: 'global',
    latency: 0,
    errorRate: 0,
    active: true,
  }
  return NextResponse.json({ provider })
}

