import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json().catch(()=>({}))
  const nodes = body?.nodes ?? []
  const edges = body?.edges ?? []
  // Minimal validation
  const errors: string[] = []
  if (!nodes.length) errors.push('No nodes provided')
  if (!edges.length) errors.push('No edges provided')
  if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 400 })
  // Simulation stub
  const path = edges.map((e: any) => `${e.source}->${e.target}`)
  return NextResponse.json({ ok: true, path, latencyMs: 1234 })
}

