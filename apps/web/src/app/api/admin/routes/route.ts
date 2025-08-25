// Memory stub removed in favor of Supabase-backed routes below

import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'

export async function GET(req: Request) {
  const supabase = getAdminSupabase()
  if (!supabase) return NextResponse.json({ items: [] })
  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')
  const purpose = searchParams.get('purpose')
  let q = supabase.from('ai_routes').select('*')
  if (orgId) q = q.eq('org_id', orgId)
  if (purpose) q = q.eq('purpose', purpose)
  const { data, error } = await q.limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}

export async function POST(req: Request) {
  const supabase = getAdminSupabase()
  if (!supabase) return NextResponse.json({ ok: true })
  const body = await req.json().catch(()=>({}))
  const { org_id, purpose, priority_json } = body || {}
  if (!purpose || !priority_json) return NextResponse.json({ error: 'purpose and priority_json required' }, { status: 400 })
  const { error } = await supabase.from('ai_routes').insert({ org_id: org_id ?? null, purpose, priority_json })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  const supabase = getAdminSupabase()
  if (!supabase) return NextResponse.json({ ok: true })
  const body = await req.json().catch(()=>({}))
  const { id, priority_json } = body || {}
  if (!id || !priority_json) return NextResponse.json({ error: 'id and priority_json required' }, { status: 400 })
  const { error } = await supabase.from('ai_routes').update({ priority_json }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}



