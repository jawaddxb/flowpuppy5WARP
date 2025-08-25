import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'

export async function GET() {
  const supabase = getAdminSupabase()
  const self = "'self'"
  const csp = [
    `default-src ${self}`,
    `script-src ${self} https: http:`,
    `style-src ${self} 'unsafe-inline' https: http:`,
    `img-src ${self} data: https: http:`,
    `font-src ${self} data: https:`,
    `connect-src ${self} https: http: ws: wss:`,
    `frame-ancestors ${self}`,
    `base-uri ${self}`,
    `form-action ${self}`,
  ].join('; ')
  if (!supabase) {
    const res = NextResponse.json({ orgs: [{ id: 'org-demo', name: 'Demo Org' }] })
    res.headers.set('Content-Security-Policy', csp)
    return res
  }
  const { data, error } = await supabase.from('orgs').select('id,name').limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const res = NextResponse.json({ orgs: data })
  res.headers.set('Content-Security-Policy', csp)
  return res
}

