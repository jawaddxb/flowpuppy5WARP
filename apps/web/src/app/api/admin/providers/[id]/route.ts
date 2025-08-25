import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'

function getOrgIdFromUrl(req: Request): string | null {
  try {
    const url = new URL(req.url)
    const org = url.searchParams.get('org')
    if (org) return org
  } catch {}
  return null
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = getAdminSupabase()
  const body = await req.json().catch(()=> ({}))
  if (!supabase) return NextResponse.json({ ok: true })

  // Handle mock_mode update via org_provider_settings
  if ('mock_mode' in body) {
    const orgRaw = getOrgIdFromUrl(req)
    const allow = String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()
    const orgId = orgRaw || ((allow==='1'||allow==='true') ? 'org-demo' : null)
    if (!orgId) return NextResponse.json({ error: 'org required' }, { status: 401 })
    const { data: exists } = await supabase
      .from('org_provider_settings')
      .select('id')
      .eq('org_id', orgId)
      .eq('provider_id', params.id)
      .maybeSingle()
    if (exists?.id) {
      const { error } = await supabase
        .from('org_provider_settings')
        .update({ mock_mode: !!body.mock_mode, updated_at: new Date().toISOString() })
        .eq('id', exists.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabase
        .from('org_provider_settings')
        .insert({ org_id: orgId, provider_id: params.id, mock_mode: !!body.mock_mode })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  const fields: any = {}
  for (const k of ['name','category','auth_type','required_secrets','config_schema','capabilities','icon_url','status_check_kind','oauth_config','mcp_config']) {
    if (k in body) fields[k] = body[k]
  }
  const { error } = await supabase.from('providers').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

