"use client"
import Link from 'next/link'
import { useEffect, useState } from 'react'

type Manifest = { name: string; slug: string; icon?: string; description?: string; inputs: Array<{ name: string; label: string; type: string; required?: boolean; default?: any; help?: string }>; theme?: { accent?: string } }

export default function MiniAppPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const [m, setM] = useState<Manifest | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [stream, setStream] = useState<string[]>([])
  const [running, setRunning] = useState(false)

  useEffect(() => {
    ;(async () => {
      const url = new URL(window.location.href)
      const draft = url.searchParams.get('manifest')
      const data = draft ? JSON.parse(decodeURIComponent(escape(atob(draft)))) : await fetch(`/apps/${encodeURIComponent(slug)}/manifest`).then(r=>r.json())
      setM(data)
      const v: Record<string, any> = {}
      for (const inp of data.inputs || []) v[inp.name] = inp.default ?? ''
      setValues(v)
    })()
  }, [slug])

  async function run() {
    setRunning(true)
    setStream((s)=> [...s, 'Starting…'])
    try {
      const res = await fetch(`/api/run/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowId: null, dsl: null, input: values, options: { maxRuntimeMs: 60000 } }) })
      const reader = res.body?.getReader()
      if (!reader) return
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() || ''
        for (const p of parts) {
          const line = p.replace(/^data:\s*/, '')
          if (!line) continue
          try { const ev = JSON.parse(line); if (ev.type==='step') setStream(s=>[...s, `Step ${ev.nodeId}: ${ev.status}`]); if (ev.type==='end') setStream(s=>[...s, 'Done.']) } catch {}
        }
      }
    } finally { setRunning(false) }
  }

  if (!m) return <div className="p-6">Loading…</div>
  const accent = m?.theme?.accent || '#0ea5e9'
  return (
    <div className="min-h-screen" style={{ ['--fp-accent' as any]: accent }}>
      <div className="mx-auto max-w-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xl font-semibold"><span>{m.icon || '🐶'}</span><span>{m.name}</span></div>
          <Link href="/" className="text-sm text-slate-600">FlowPuppy</Link>
        </div>
        {m.description && <div className="text-slate-600 mb-4">{m.description}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 border border-fp-border rounded p-3 bg-white">
            <div className="font-medium mb-2">Inputs</div>
            <div className="space-y-2">
              {(m.inputs||[]).map((inp)=> (
                <label key={inp.name} className="block text-sm">
                  <div className="text-slate-700 mb-1">{inp.label}{inp.required ? ' *' : ''}</div>
                  <input className="w-full border border-fp-border rounded px-2 py-1 text-sm" value={values[inp.name] ?? ''} onChange={(e)=> setValues(v=> ({ ...v, [inp.name]: e.target.value }))} placeholder={inp.help || ''} />
                </label>
              ))}
              <button onClick={run} disabled={running} className="w-full px-3 py-2 rounded text-white" style={{ backgroundColor: accent }}>{running ? 'Running…' : 'Run'}</button>
            </div>
          </div>
          <div className="md:col-span-2 border border-fp-border rounded p-3 bg-white">
            <div className="font-medium mb-2">Preview</div>
            <div className="text-xs text-slate-600 mb-2">This is a mocked preview of the run stream. In the full version, you’ll see the canvas animation and step callouts.</div>
            <div className="text-xs bg-slate-50 border border-fp-border rounded p-2 h-[320px] overflow-auto">
              {stream.map((s,i)=> <div key={i}>{s}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


