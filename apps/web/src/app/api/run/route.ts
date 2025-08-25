import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  const supabase = getAdminSupabase()
  const body = await req.json().catch(()=>({}))
  const { workflowId, input } = body || {}
  if (!workflowId) return NextResponse.json({ error: 'workflowId required' }, { status: 400 })
  if (!supabase) return NextResponse.json({ id: 'local-run' })
  const { data, error } = await supabase.from('workflow_runs').insert({ workflow_id: workflowId, status: 'running', input_json: input || {} }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}



