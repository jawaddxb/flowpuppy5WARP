import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'

export async function GET(req: Request) {
  const supabase = getAdminSupabase()
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!supabase) return NextResponse.json({ items: [] })
  if (id) {
    const { data, error } = await supabase.from('builder_drafts').select('id,name,graph_json,created_at').eq('id', id).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
  }
  const { data, error } = await supabase.from('builder_drafts').select('id,name,created_at').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}

export async function POST(req: Request) {
  const supabase = getAdminSupabase()
  const body = await req.json()
  if (!supabase) return NextResponse.json({ ok: true, id: 'local' })
  const { data, error } = await supabase.from('builder_drafts').insert({ name: body?.name || 'Untitled', graph_json: body?.graph }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

// Save as version (optional secondary action routed here for MVP)
export async function PUT(req: Request) {
  const supabase = getAdminSupabase()
  const body = await req.json().catch(()=>({}))
  if (!supabase) return NextResponse.json({ ok: true })
  const { workflowId, versionName, dsl } = body || {}
  if (!workflowId || !dsl) return NextResponse.json({ error: 'workflowId and dsl required' }, { status: 400 })
  const { data: last } = await supabase.from('workflow_versions').select('version').eq('workflow_id', workflowId).order('version', { ascending: false }).limit(1).maybeSingle()
  const nextVer = (last?.version ?? 0) + 1
  const { error } = await supabase.from('workflow_versions').insert({ workflow_id: workflowId, version: nextVer, graph_json: dsl, dsl: JSON.stringify(dsl), created_by: null })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, version: nextVer })
}

