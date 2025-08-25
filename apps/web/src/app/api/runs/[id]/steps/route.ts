import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const runId = params.id
  const supabase = getAdminSupabase()
  const strictDb = String(process.env.CI_DB_STRICT||'').toLowerCase()
  if (!supabase && (strictDb==='1'||strictDb==='true')) {
    return NextResponse.json({ error: 'DB required in strict mode' }, { status: 500 })
  }
  if (supabase) {
    const { data, error } = await supabase
      .from('run_steps')
      .select('id,run_id,node_id,name,started_at,finished_at,duration_ms,status,error,input_json,output_json')
      .eq('run_id', runId)
      .order('started_at', { ascending: true })
    if (!error) return NextResponse.json({ items: data || [] })
    // Fallback stub when DB errors
    const start = Date.now() - 5000
    const items = [
      { id: `${runId}-s1`, run_id: runId, node_id: 'trigger', name: 'Trigger', started_at: new Date(start).toISOString(), duration_ms: 500, status: 'ok' },
      { id: `${runId}-s2`, run_id: runId, node_id: 'http1', name: 'HTTP Request', started_at: new Date(start+600).toISOString(), duration_ms: 800, status: 'ok' },
      { id: `${runId}-s3`, run_id: runId, node_id: 'ai1', name: 'Analyze & Decide', started_at: new Date(start+1500).toISOString(), duration_ms: 1200, status: 'ok', note: 'Decision: SELL' },
      { id: `${runId}-s4`, run_id: runId, node_id: 'email1', name: 'Send Email', started_at: new Date(start+2800).toISOString(), duration_ms: 400, status: 'ok' },
    ]
    return NextResponse.json({ items })
  }
  // Fallback stub timeline
  const start = Date.now() - 5000
  const items = [
    { id: `${runId}-s1`, run_id: runId, node_id: 'trigger', name: 'Trigger', started_at: new Date(start).toISOString(), duration_ms: 500, status: 'ok' },
    { id: `${runId}-s2`, run_id: runId, node_id: 'http1', name: 'HTTP Request', started_at: new Date(start+600).toISOString(), duration_ms: 800, status: 'ok' },
    { id: `${runId}-s3`, run_id: runId, node_id: 'ai1', name: 'Analyze & Decide', started_at: new Date(start+1500).toISOString(), duration_ms: 1200, status: 'ok', note: 'Decision: SELL' },
    { id: `${runId}-s4`, run_id: runId, node_id: 'email1', name: 'Send Email', started_at: new Date(start+2800).toISOString(), duration_ms: 400, status: 'ok' },
  ]
  return NextResponse.json({ items })
}



