import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'
import { encryptStringAESGCM } from '@/lib/crypto'
import { registry } from '@/lib/providerRegistry'

type Field = { name: string; label?: string; type?: 'string'|'password'|'number'; placeholder?: string; required?: boolean }

function buildDefaultSchema(required: string[] | null | undefined): { fields: Field[] } {
  const fields: Field[] = (required || []).map(n => ({ name: String(n), label: String(n).replace(/[_-]/g, ' ').replace(/\b\w/g, c=>c.toUpperCase()), type: 'password' }))
  return { fields }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = getAdminSupabase()
  if (!supabase) {
    const d = registry[params.id]
    const schema = d?.credentials?.fields?.length ? { fields: d.credentials.fields } : (d?.required_secrets?.length ? buildDefaultSchema(d.required_secrets) : buildDefaultSchema([]))
    return NextResponse.json({ schema, present: {} })
  }
  const id = params.id
  // Load provider descriptor
  const { data: prov } = await supabase.from('providers').select('required_secrets, config_schema').eq('id', id).single()
  const required = (prov as any)?.required_secrets as string[] | undefined
  const cfg = (prov as any)?.config_schema as any | undefined
  const schema: { fields: Field[] } = cfg?.credentials && Array.isArray(cfg.credentials?.fields)
    ? { fields: cfg.credentials.fields as Field[] }
    : buildDefaultSchema(required)
  // Load org settings (demo org for now)
  const url = new URL(req.url)
  const orgId = url.searchParams.get('org') || 'org-demo'
  const { data: orgRow } = await supabase.from('org_provider_settings').select('secrets').eq('org_id',orgId).eq('provider_id', id).maybeSingle()
  const present = orgRow?.secrets ? Object.fromEntries(Object.keys(orgRow.secrets || {}).map(k => [k, true])) : {}
  return NextResponse.json({ schema, present })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = getAdminSupabase()
  if (!supabase) return NextResponse.json({ ok: true })
  const id = params.id
  const body = await req.json().catch(()=> ({})) as { values?: Record<string,string>, clear?: string[], orgId?: string }
  const vals = body?.values || {}
  const clear = Array.isArray(body?.clear) ? body?.clear : []
  // Encrypt values
  const pass = process.env.SECRETS_KEY || process.env.NEXTAUTH_SECRET || 'dev-key'
  const encrypted: Record<string,string> = {}
  for (const [k,v] of Object.entries(vals)) {
    try { encrypted[k] = await encryptStringAESGCM(String(v || ''), pass) } catch { encrypted[k] = String(v || '') }
  }
  // Merge with existing
  const orgId = body?.orgId || 'org-demo'
  const { data: existingRow } = await supabase.from('org_provider_settings').select('secrets').eq('org_id',orgId).eq('provider_id', id).maybeSingle()
  const merged: Record<string,string> = { ...(existingRow?.secrets || {}) }
  for (const key of clear) delete merged[key]
  Object.assign(merged, encrypted)

  // Upsert
  const payload = { org_id: orgId, provider_id: id, secrets: merged, updated_at: new Date().toISOString() }
  const { error } = await supabase.from('org_provider_settings').upsert(payload, { onConflict: 'org_id,provider_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}


