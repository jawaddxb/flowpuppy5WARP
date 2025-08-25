import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'
import { decryptStringAESGCM, encryptStringAESGCM } from '@/lib/crypto'

export async function POST(req: Request) {
  const supabase = getAdminSupabase()
  const body = await req.json().catch(()=> ({})) as { orgId?: string; dryRun?: boolean }
  const orgId = body?.orgId || 'org-demo'
  const dryRun = !!body?.dryRun
  if (!supabase) return NextResponse.json({ ok: true, noop: true, message: 'Supabase not configured' })

  const oldKey = process.env.SECRETS_KEY || 'dev-key'
  const newKey = process.env.NEW_SECRETS_KEY
  if (!newKey) return NextResponse.json({ ok: true, noop: true, message: 'NEW_SECRETS_KEY not set; skipping' })

  const { data, error } = await supabase.from('org_provider_settings').select('org_id, provider_id, secrets').eq('org_id', orgId)
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  let rotated = 0
  for (const row of (data || [])) {
    const src = (row as any).secrets || {}
    const out: Record<string,string> = {}
    for (const [k,v] of Object.entries(src)) {
      try {
        const plain = await decryptStringAESGCM(String(v), oldKey)
        out[k] = await encryptStringAESGCM(plain, newKey)
      } catch {
        // if decrypt fails, keep as-is
        out[k] = String(v)
      }
    }
    if (!dryRun) {
      const { error: upErr } = await supabase.from('org_provider_settings').update({ secrets: out }).eq('org_id', (row as any).org_id).eq('provider_id', (row as any).provider_id)
      if (upErr) return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 })
    }
    rotated++
  }
  return NextResponse.json({ ok: true, rotated, dryRun })
}


