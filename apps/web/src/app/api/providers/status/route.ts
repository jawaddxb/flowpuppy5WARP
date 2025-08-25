import { NextResponse } from 'next/server'
import { deriveRequiredProviders } from '@/lib/connections'
import { getStatusForProviders, hasEnvSecret } from '@/lib/providerRegistry'
import { loadRegistryFromDb } from '@/lib/registryLoader'
import { linearFlow } from '@/lib/flowdoc/fixtures'
import { getAdminSupabase } from '@/lib/supabaseClient'

// Status via provider registry + env secrets OR vault (future)
export async function GET() {
  try {
    // In a real request, we would compute from current FlowDoc in session or DB.
    // For now, derive requirements from a minimal fixture to drive tiles.
    const required = deriveRequiredProviders(linearFlow as any)
    // Secrets from vault (if configured)
    const supabase = getAdminSupabase()
    let names = new Set<string>()
    if (supabase) {
      try {
        const { data } = await supabase.from('secrets').select('name')
        if (Array.isArray(data)) {
          names = new Set<string>(data.map((r: any)=> String(r.name)))
        }
      } catch {}
    }
    const hasSecret = (n: string) => names.has(n) || hasEnvSecret(n)
    // Prefer DB-backed registry when available
    const reg = await loadRegistryFromDb().catch(()=> null)
    const status = await getStatusForProviders(required, hasSecret)
    return NextResponse.json({ status })
  } catch (e:any) {
    return NextResponse.json({ status: {}, error: String(e?.message || e) }, { status: 500 })
  }
}

// Accept client-provided requirements or a FlowDoc to compute dynamically
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({})) as any
    const flowDoc = body?.flowDoc
    const requiredIn: string[] = Array.isArray(body?.required) ? (body.required as string[]) : []
    let required: string[] = []
    if (flowDoc && typeof flowDoc === 'object') required = deriveRequiredProviders(flowDoc as any)
    else if (requiredIn.length) required = requiredIn.map(String)
    else required = deriveRequiredProviders(linearFlow as any)

    const supabase = getAdminSupabase()
    let names = new Set<string>()
    if (supabase) {
      try {
        const { data } = await supabase.from('secrets').select('name')
        if (Array.isArray(data)) {
          names = new Set<string>(data.map((r: any)=> String(r.name)))
        }
      } catch {}
    }
    const hasSecret = (n: string) => names.has(n) || hasEnvSecret(n)
    const reg = await loadRegistryFromDb().catch(()=> null) // loaded for side-effects/future
    const status = await getStatusForProviders(required, hasSecret)
    return NextResponse.json({ status })
  } catch (e:any) {
    return NextResponse.json({ status: {}, error: String(e?.message || e) }, { status: 500 })
  }
}


