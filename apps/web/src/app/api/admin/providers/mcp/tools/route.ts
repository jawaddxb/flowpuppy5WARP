import { NextResponse } from 'next/server'

// MCP tool discovery scaffold: accept a URL, return a mock tool list for now
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({})) as { url?: string }
    if (!body.url) return NextResponse.json({ error: 'url required' }, { status: 400 })
    // TODO: fetch MCP manifest and enumerate tools; for now return a stub with schema-like inputs
    return NextResponse.json({ tools: [
      { name: 'search', input: { type: 'object', properties: { query: { type: 'string' } } } },
      { name: 'get_doc', input: { type: 'object', properties: { id: { type: 'string' } } } },
    ] })
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 })
  }
}


