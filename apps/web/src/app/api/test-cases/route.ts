import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'

export async function GET() {
  const supabase = getAdminSupabase()
  if (!supabase) return NextResponse.json({ items: [] })
  const { data, error } = await supabase.from('test_cases').select('id,title,prompt,created_at').order('created_at', { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}

export async function POST(req: Request) {
  const supabase = getAdminSupabase()
  const body = await req.json().catch(()=>({}))
  if (!supabase) return NextResponse.json({ ok: true })
  const { title, prompt, dsl, notes } = body || {}
  if (!title || !prompt || !dsl) return NextResponse.json({ error: 'title, prompt, dsl required' }, { status: 400 })
  const { error } = await supabase.from('test_cases').insert({ title, prompt, dsl_json: dsl, notes })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}



