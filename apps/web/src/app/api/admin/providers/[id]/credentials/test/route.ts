import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'
import { decryptStringAESGCM } from '@/lib/crypto'
import { registry } from '@/lib/providerRegistry'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await req.json().catch(()=> ({})) as { orgId?: string }
    const supabase = getAdminSupabase()
    const id = params.id
    let secrets: Record<string, string> = {}
    if (supabase) {
      const { data } = await supabase.from('org_provider_settings').select('secrets').eq('org_id', orgId || 'org-demo').eq('provider_id', id).maybeSingle()
      const pass = process.env.SECRETS_KEY || process.env.NEXTAUTH_SECRET || 'dev-key'
      for (const [k,v] of Object.entries((data?.secrets as any) || {})) {
        try { secrets[k] = await decryptStringAESGCM(String(v), pass) } catch { secrets[k] = String(v) }
      }
    }
    const d = registry[id]
    if (d?.testConnection) {
      const r = await d.testConnection(secrets)
      return NextResponse.json(r)
    }
    return NextResponse.json({ ok: true, message: 'No test available; using presence check', present: Object.keys(secrets).length })
  } catch (e:any) {
    return NextResponse.json({ ok: false, message: String(e?.message || e) }, { status: 400 })
  }
}


