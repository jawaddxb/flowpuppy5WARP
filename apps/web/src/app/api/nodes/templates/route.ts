import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'
import { registry } from '@/lib/providerRegistry'

type Template = { type: string; label: string; defaults?: Record<string, any> }

export async function GET() {
  try {
    const supabase = getAdminSupabase()
    const templates: Template[] = []

    // Static registry-derived templates (scaffold)
    if (registry.openweather) templates.push({ type: 'openweather.fetch', label: 'Weather: Get current', defaults: { city: 'London' } })
    if (registry.gmail) templates.push({ type: 'gmail.send', label: 'Gmail: Send Email', defaults: { to: '', subject: '', body: '' } })
    if (registry.scrapingbee) templates.push({ type: 'scrapingbee.fetch', label: 'ScrapingBee: Fetch Page', defaults: { url: 'https://example.com' } })
    if (registry.apify) templates.push({ type: 'apify.run', label: 'Apify: Run Actor', defaults: { actorId: '' } })

    // DB-backed: OpenAPI providers → generic HTTP request template
    if (supabase) {
      const { data } = await supabase.from('providers').select('id,name,category,config_schema,capabilities')
      for (const row of (data || [])) {
        const cfg = (row as any).config_schema || {}
        const caps: string[] = (row as any).capabilities || []
        if (cfg?.openapi) {
          const base = Array.isArray(cfg.servers) && cfg.servers[0]?.url ? cfg.servers[0].url : 'https://api.example.com'
          templates.push({ type: `http.${row.id}`, label: `HTTP: ${row.name}`, defaults: { method: 'get', url: `${base}/path` } })
        }
        if (caps.includes('mcp')) {
          templates.push({ type: `mcp.${row.id}.call`, label: `MCP: Call Tool (${row.name})`, defaults: { tool: '', input: {} } })
        }
      }
    }

    return NextResponse.json({ templates })
  } catch (e: any) {
    return NextResponse.json({ templates: [], error: String(e?.message || e) }, { status: 500 })
  }
}


