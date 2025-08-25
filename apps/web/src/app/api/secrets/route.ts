import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'
import { encryptStringAESGCM, getVaultClient } from '@/lib/crypto'
import { logAudit, withRequest } from '@/lib/log'

export async function GET(req: Request) {
  const supabase = getAdminSupabase()
  if (!supabase) {
    return NextResponse.json({ items: [
      { name: 'API_KEY' },
      { name: 'SLACK_TOKEN' },
      { name: 'STRIPE_SECRET' },
    ] })
  }
  const { data, error } = await supabase.from('secrets').select('name').order('name', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: (data || []).map((r: any) => ({ name: r.name })) })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { name, value } = body || {}
  if (!name || !value) return NextResponse.json({ error: 'name and value required' }, { status: 400 })
  const supabase = getAdminSupabase()
  const vault = getVaultClient()
  if (!supabase) { logAudit('secrets.write.stub', withRequest(req, { name })); return NextResponse.json({ ok: true }) }
  if (vault) {
    try {
      await vault.write(`secrets/${name}`, { value: String(value) })
      logAudit('secrets.write.vault', withRequest(req, { name }))
      return NextResponse.json({ ok: true, backend: 'vault' })
    } catch (e: any) {
      return NextResponse.json({ error: 'vault write failed', detail: String(e?.message||e) }, { status: 500 })
    }
  }
  let ciphertext = String(value)
  try {
    const pass = process.env.SECRETS_KEY || process.env.NEXTAUTH_SECRET || 'dev-key'
    ciphertext = await encryptStringAESGCM(String(value), pass)
  } catch {}
  const { error } = await supabase.from('secrets').insert({ name, value_encrypted: ciphertext })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  logAudit('secrets.write.db', withRequest(req, { name }))
  return NextResponse.json({ ok: true, backend: 'db' })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const supabase = getAdminSupabase()
  const vault = getVaultClient()
  if (!supabase) { logAudit('secrets.delete.stub', withRequest(req, { name })); return NextResponse.json({ ok: true }) }
  try {
    if (vault) { try { await vault.write(`secrets/${name}`, { value: '' }) } catch {} }
  } catch {}
  const { error } = await supabase.from('secrets').delete().eq('name', name)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  logAudit('secrets.delete.db', withRequest(req, { name }))
  return NextResponse.json({ ok: true })
}


