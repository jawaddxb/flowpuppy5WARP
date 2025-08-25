import { getAdminSupabase } from '@/lib/supabaseClient'

export type ProviderPref = { provider_id?: string | null; type?: string; model?: string }

export async function getProviderOrder(purpose: string, orgId?: string | null): Promise<ProviderPref[]> {
  const supabase = getAdminSupabase()
  if (!supabase) {
    // Fallback order when DB/env absent
    return [
      { type: 'openai', model: 'gpt-4o' },
      { type: 'claude', model: 'sonnet' },
      { type: 'mistral', model: 'mistral-large' },
    ]
  }
  // Org override → global default
  const { data: routesOrg } = await supabase
    .from('ai_routes')
    .select('priority_json')
    .eq('org_id', orgId ?? '')
    .eq('purpose', purpose)
    .limit(1)
    .maybeSingle()
  if (routesOrg?.priority_json) return routesOrg.priority_json as ProviderPref[]

  const { data: routesGlobal } = await supabase
    .from('ai_routes')
    .select('priority_json')
    .is('org_id', null)
    .eq('purpose', purpose)
    .limit(1)
    .maybeSingle()
  if (routesGlobal?.priority_json) return routesGlobal.priority_json as ProviderPref[]

  // Default order when Supabase is present but no routes configured
  return [
    { type: 'openai', model: 'gpt-4o' },
    { type: 'claude', model: 'sonnet' },
    { type: 'mistral', model: 'mistral-large' },
  ]
}

// Return provider order annotated with mock flag per entry
export async function getProviderOrderWithMock(purpose: string, orgId?: string | null): Promise<Array<ProviderPref & { mock?: boolean }>> {
  const base = await getProviderOrder(purpose, orgId)
  const supabase = getAdminSupabase()
  const isE2E = String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()
  const e2e = (isE2E==='1' || isE2E==='true')
  if (!supabase) {
    // In environments without Supabase, prefer mock to keep CI deterministic
    return base.map(p => ({ ...p, mock: true }))
  }
  const effectiveOrgId = orgId || (e2e ? 'org-demo' : null)
  if (!effectiveOrgId) return base.map(p => ({ ...p, mock: false }))
  const types = base.map(p => String(p.type||''))
  // Fetch settings for these providers
  const { data: rows } = await supabase
    .from('org_provider_settings')
    .select('provider_id, mock_mode')
    .eq('org_id', effectiveOrgId)
  const mockSet = new Set<string>((rows||[]).filter(r => r.mock_mode).map(r => String(r.provider_id)))
  return base.map(p => ({ ...p, mock: mockSet.has(String(p.type||'')) || e2e }))
}

