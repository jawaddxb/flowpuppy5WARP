import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  const body = await req.json().catch(()=> ({})) as { url?: string; id?: string; name?: string }
  const id = (body.id || 'mcp-' + Math.random().toString(36).slice(2)).slice(0,50)
  const name = body.name || 'MCP Provider'
  // Minimal stub: store as provider with mcp_config
  const supabase = getAdminSupabase()
  if (supabase) {
    const { error } = await supabase.from('providers').insert({ id, name, category: 'other', auth_type: 'none', mcp_config: { url: body.url || '' } })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ provider: { id, name, mcp: true } })
}


