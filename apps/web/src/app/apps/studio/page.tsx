"use client"
import { useEffect, useMemo, useRef, useState } from 'react'

type Manifest = { name: string; slug: string; icon?: string; description?: string; inputs: Array<{ name: string; label: string; type: string; required?: boolean; default?: any; help?: string }>; theme?: { accent?: string }; auth?: any; wallet?: any; distribution?: any }

export default function Studio() {
  const [manifest, setManifest] = useState<Manifest>({ name: 'Untitled App', slug: 'untitled-app', icon: '🐶', description: 'Describe what your app does', inputs: [ { name:'query', label:'Query', type:'string', required:true } ], theme: { accent: '#10b981' }, distribution: { web:true, embed:true } })
  const [msgs, setMsgs] = useState<Array<{ role: 'user'|'assistant'; text: string }>>([
    { role: 'assistant', text: 'Tell me what you want your mini app to do. Mention inputs, auth (Google login), wallet/NFT gate, theme, and whether you want Telegram or Discord options.' }
  ])
  const [input, setInput] = useState('Make an app from my Energy Trading workflow. Inputs: homeZip (string), sellThreshold (number, default 25). Require Google login. Add wallet connect with optional NFT gate. Theme emerald. Offer Telegram and Discord options.')
  const iframeSrc = useMemo(()=> `/a/${encodeURIComponent(manifest.slug)}?manifest=${encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(manifest)))))}&draft=1`, [manifest])
  const busyRef = useRef(false)

  async function send() {
    if (!input.trim() || busyRef.current) return
    busyRef.current = true
    const userText = input.trim()
    setMsgs(m=> [...m, { role: 'user', text: userText }])
    setInput('')
    try {
      const res = await fetch('/api/apps/studio/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userText, manifest }) })
      const data = await res.json()
      if (res.ok && data?.manifest) {
        setManifest(data.manifest)
        setMsgs(m=> [...m, { role: 'assistant', text: data?.summary || 'Updated the mini app draft.' }])
      } else {
        setMsgs(m=> [...m, { role: 'assistant', text: data?.error || 'I could not update the draft.' }])
      }
    } catch {
      setMsgs(m=> [...m, { role: 'assistant', text: 'Network error; please try again.' }])
    } finally {
      busyRef.current = false
    }
  }

  function saveDraft() {
    try {
      const raw = localStorage.getItem('fp-mini-apps')
      const arr = raw ? JSON.parse(raw) : []
      const idx = Array.isArray(arr) ? arr.findIndex((m:any)=> m.slug===manifest.slug) : -1
      const item = { name: manifest.name, slug: manifest.slug, icon: manifest.icon, description: manifest.description, manifest }
      if (idx>=0) arr[idx] = item; else arr.push(item)
      localStorage.setItem('fp-mini-apps', JSON.stringify(arr))
      alert('Saved to Mini Apps')
    } catch {}
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="text-xl font-semibold mb-2">Mini App Studio (AI‑guided)</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-fp-border rounded p-3 bg-white flex flex-col h-[72vh]">
          <div className="text-sm text-slate-600 mb-2">Chat with the assistant to design your app. The preview updates instantly.</div>
          <div className="flex-1 overflow-auto space-y-2">
            {msgs.map((m, i)=> (
              <div key={i} className={`text-sm ${m.role==='assistant' ? 'bg-slate-50' : 'bg-fp-surface'} border border-fp-border rounded px-2 py-1`}>{m.text}</div>
            ))}
          </div>
          <div className="mt-2 flex items-start gap-2">
            <textarea className="flex-1 border border-fp-border rounded px-2 py-1 text-sm" rows={3} value={input} onChange={(e)=> setInput(e.target.value)} placeholder="Describe the app…" onKeyDown={(e)=>{ if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send() } }} />
            <div className="flex flex-col gap-1">
              <button onClick={send} disabled={busyRef.current} className="px-3 py-1 rounded bg-fp-primary text-white">{busyRef.current ? 'Thinking…' : 'Apply'}</button>
              <button onClick={saveDraft} className="px-3 py-1 rounded border border-fp-border bg-white">Save Draft</button>
              <a className="px-3 py-1 rounded border border-fp-border bg-white text-center" href={`/a/${encodeURIComponent(manifest.slug)}`} target="_blank">Open Hosted</a>
            </div>
          </div>
        </div>
        <div className="border border-fp-border rounded p-3 bg-white">
          <div className="font-medium mb-2">Live Preview</div>
          <iframe title="preview" sandbox="allow-scripts allow-same-origin allow-forms" className="w-full h-[72vh] border border-fp-border rounded" src={iframeSrc} />
        </div>
      </div>
    </div>
  )
}


