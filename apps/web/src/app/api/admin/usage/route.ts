import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'

export async function GET() {
  const supabase = getAdminSupabase()
  if (!supabase) return NextResponse.json({ items: [] })
  const since = new Date(Date.now() - 24*60*60*1000).toISOString()
  // aggregate by provider
  const { data, error } = await supabase
    .from('ai_usage_events')
    .select('provider,latency_ms,tokens_in,tokens_out,created_at,status')
    .gte('created_at', since)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const agg = new Map<string, { provider: string; cnt: number; avg_latency: number; tokens_in: number; tokens_out: number; ok: number; error: number }>()
  for (const r of data || []) {
    const k = (r as any).provider || 'auto'
    const it = agg.get(k) || { provider: k, cnt: 0, avg_latency: 0, tokens_in: 0, tokens_out: 0, ok: 0, error: 0 }
    it.cnt += 1
    it.avg_latency = ((it.avg_latency * (it.cnt - 1)) + ((r as any).latency_ms || 0)) / it.cnt
    it.tokens_in += ((r as any).tokens_in || 0)
    it.tokens_out += ((r as any).tokens_out || 0)
    const st = String((r as any).status || 'ok').toLowerCase()
    if (st === 'ok') it.ok += 1
    else it.error += 1
    agg.set(k, it)
  }
  return NextResponse.json({ items: Array.from(agg.values()) })
}


