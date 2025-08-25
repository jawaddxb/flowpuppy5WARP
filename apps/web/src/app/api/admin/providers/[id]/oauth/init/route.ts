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
  if (!supabase) {
    // Mock response for CI
    return NextResponse.json({ 
      authUrl: 'https://example.com/oauth/authorize?client_id=mock&redirect_uri=http://localhost:3000/api/oauth/callback',
      state: 'mock-state-' + Date.now() 
    })
  }

  const orgId = getOrgIdFromUrl(req) || 'org-demo'
  
  // Get provider oauth config
  const { data: provider } = await supabase
    .from('providers')
    .select('oauth_config')
    .eq('id', params.id)
    .maybeSingle()

  if (!provider?.oauth_config) {
    // Mock OAuth flow for providers without real OAuth
    const mockAuthUrl = `https://example.com/oauth/authorize?client_id=mock-${params.id}&redirect_uri=${encodeURIComponent('http://localhost:3000/api/oauth/callback')}&state=mock-${Date.now()}`
    
    // Store mock state
    await supabase
      .from('oauth_states')
      .insert({
        state: 'mock-' + Date.now(),
        provider_id: params.id,
        org_id: orgId,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })
    
    return NextResponse.json({ authUrl: mockAuthUrl, state: 'mock-' + Date.now() })
  }

  // Real OAuth flow would generate state, store it, and return auth URL
  const state = 'state-' + Math.random().toString(36).substring(2)
  const authUrl = `${provider.oauth_config.authUrl}?client_id=${provider.oauth_config.clientId}&redirect_uri=${encodeURIComponent(provider.oauth_config.redirectUri)}&state=${state}&scope=${encodeURIComponent(provider.oauth_config.scope || '')}`

  // Store state for verification
  await supabase
    .from('oauth_states')
    .insert({
      state,
      provider_id: params.id,
      org_id: orgId,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    })

  return NextResponse.json({ authUrl, state })
}
