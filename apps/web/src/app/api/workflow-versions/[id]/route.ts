import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = getAdminSupabase()
  if (!supabase) return NextResponse.json({ item: null })
  const id = params.id
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data, error } = await supabase
    .from('workflow_versions')
    .select('id,version,graph_json,created_at')
    .eq('id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}



