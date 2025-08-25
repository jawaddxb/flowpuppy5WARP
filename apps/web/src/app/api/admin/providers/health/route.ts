import { NextResponse } from 'next/server'
import { providers } from '@/lib/providers'

export async function GET() {
  try {
    const list = Object.values(providers)
    const items = await Promise.all(list.map(async (p) => {
      try { const h = await p.health(); return { name: p.name, ok: h.ok, latencyMs: h.latencyMs ?? null } } catch { return { name: p.name, ok: false, latencyMs: null } }
    }))
    return NextResponse.json({ items })
  } catch (e:any) {
    return NextResponse.json({ items: [], error: String(e?.message || e) }, { status: 500 })
  }
}



