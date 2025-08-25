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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = getAdminSupabase()
  const url = new URL(req.url)
  const state = url.searchParams.get('state')
  const code = url.searchParams.get('code')
  const orgId = getOrgIdFromUrl(req) || 'org-demo'

  if (!supabase) return NextResponse.json({ ok: true, mock: true })
  if (!state) return NextResponse.json({ error: 'missing state' }, { status: 400 })

  const { data: st } = await supabase
    .from('oauth_states')
    .select('state, provider_id, org_id, expires_at')
    .eq('state', state)
    .maybeSingle()

  if (!st) return NextResponse.json({ error: 'invalid state' }, { status: 400 })
  if (new Date(st.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'state expired' }, { status: 400 })

  // Mock token exchange if no external HTTP is allowed here
  const token = code ? `mock-token-for-${params.id}-${Date.now()}` : `mock-token-${Date.now()}`

  // Upsert org-level secrets with token
  const { data: existing } = await supabase
    .from('org_provider_settings')
    .select('id, secrets')
    .eq('org_id', orgId)
    .eq('provider_id', params.id)
    .maybeSingle()

  const mergedSecrets = { ...(existing?.secrets || {}), OAUTH_TOKEN: token }
  if (existing?.id) {
    const { error } = await supabase
      .from('org_provider_settings')
      .update({ secrets: mergedSecrets, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('org_provider_settings')
      .insert({ org_id: orgId, provider_id: params.id, secrets: mergedSecrets })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Optionally clean up state
  await supabase.from('oauth_states').delete().eq('state', state)

  // Mark connected in a provider-scoped way if needed later; for now, presence of token implies connected
  return NextResponse.json({ ok: true, connected: true })
}

