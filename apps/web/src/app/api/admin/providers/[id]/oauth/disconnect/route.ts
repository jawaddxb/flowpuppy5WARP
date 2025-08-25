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

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = getAdminSupabase()
  const orgId = getOrgIdFromUrl(req) || ((String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='1' || String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='true') ? 'org-demo' : null)
  if (!orgId) return NextResponse.json({ error: 'org required' }, { status: 401 })
  if (!supabase) return NextResponse.json({ ok: true, mock: true })

  // Remove OAuth-related tokens from org_provider_settings.secrets
  const { data: row } = await supabase
    .from('org_provider_settings')
    .select('id, secrets')
    .eq('org_id', orgId)
    .eq('provider_id', params.id)
    .maybeSingle()

  if (row?.id) {
    const secrets = { ...(row.secrets || {}) }
    delete (secrets as any).OAUTH_TOKEN
    delete (secrets as any).oauth_token
    delete (secrets as any).access_token
    delete (secrets as any).token
    const { error } = await supabase
      .from('org_provider_settings')
      .update({ secrets, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

