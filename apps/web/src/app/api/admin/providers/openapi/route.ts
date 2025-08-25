import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'

type OpenApiSpec = { info?: { title?: string }; servers?: Array<{ url: string }>; paths?: Record<string, unknown> }

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({})) as { spec?: any; id?: string; name?: string; category?: string }
    const spec: OpenApiSpec = typeof body.spec === 'string' ? JSON.parse(body.spec) : (body.spec || {})
    const id = (body.id || (spec?.info?.title || 'openapi').toLowerCase().replace(/[^a-z0-9]+/g,'-')).slice(0,50)
    const name = body.name || spec?.info?.title || 'OpenAPI Provider'
    const descriptor: { id: string; name: string; category: string; auth_type: string; required_secrets: string[]; config_schema: any; capabilities: string[] } = {
      id,
      name,
      category: String(body.category || 'http'),
      auth_type: 'apiKey',
      required_secrets: ['API_KEY'],
      config_schema: { openapi: true, servers: spec?.servers || [], pathsCount: spec?.paths ? Object.keys(spec.paths).length : 0 },
      capabilities: ['http'],
    }
    const supabase = getAdminSupabase()
    if (supabase) {
      const { error } = await supabase.from('providers').insert({
        id: descriptor.id,
        name: descriptor.name,
        category: descriptor.category,
        auth_type: descriptor.auth_type,
        required_secrets: descriptor.required_secrets,
        config_schema: descriptor.config_schema,
        capabilities: descriptor.capabilities,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ provider: descriptor })
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 })
  }
}


