import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = getAdminSupabase()
  const body = await req.json().catch(()=>({}))
  if (!supabase) return NextResponse.json({ ok: true })
  // Update name and/or graph JSON if provided
  const patch: any = {}
  if (body?.name) patch.name = body.name
  if (body?.graph) patch.graph_json = body.graph
  const { error } = await supabase.from('builder_drafts').update(patch).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = getAdminSupabase()
  if (!supabase) return NextResponse.json({ ok: true })
  const { error } = await supabase.from('builder_drafts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

