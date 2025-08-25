import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'

export async function GET(req: Request) {
  const supabase = getAdminSupabase()
  if (!supabase) return NextResponse.json({ items: [] })
  const { searchParams } = new URL(req.url)
  const workflowId = searchParams.get('workflowId')
  if (!workflowId) return NextResponse.json({ error: 'workflowId required' }, { status: 400 })
  const { data, error } = await supabase
    .from('workflow_versions')
    .select('id,version,created_at')
    .eq('workflow_id', workflowId)
    .order('version', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}



