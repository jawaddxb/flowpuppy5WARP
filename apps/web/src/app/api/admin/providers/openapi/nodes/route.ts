import { NextResponse } from 'next/server'

// Very light scaffold: accept a stored OpenAPI descriptor or raw spec and return example node templates
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({})) as { spec?: any; providerId?: string }
    const spec = typeof body.spec === 'string' ? JSON.parse(body.spec) : (body.spec || {})
    const nodes = Object.entries(spec.paths || {}).slice(0, 5).flatMap(([p, ops]: any, i: number) => {
      const methods = Object.keys(ops || {})
      return methods.map((m: string) => ({
        id: `http-${i+1}-${m}`,
        kind: 'http.request',
        title: `HTTP ${m.toUpperCase()} ${p}`,
        data: {
          method: m,
          url: (spec.servers?.[0]?.url || '') + p,
          params: (Array.isArray((ops as any)?.parameters) ? ((ops as any).parameters as any[]).filter(x=>x?.in==='query').map(x=>x?.name) : []),
          bodySchema: (ops as any)?.requestBody?.content?.['application/json']?.schema || null,
        },
      }))
    })
    return NextResponse.json({ nodes })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 })
  }
}


