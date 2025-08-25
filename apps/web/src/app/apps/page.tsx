"use client"
import { useEffect, useState } from 'react'

type Mini = { name: string; slug: string; icon?: string; description?: string; manifest?: any }

export default function MiniAppsIndex() {
  const [items, setItems] = useState<Mini[]>([])
  useEffect(() => {
    const list: Mini[] = [{ name: 'Energy Optimizer', slug: 'demo', icon: '☀️', description: 'Sample app' }]
    try {
      const raw = localStorage.getItem('fp-mini-apps')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) arr.forEach((m:any)=> list.push(m))
      }
    } catch {}
    setItems(list)
  }, [])
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xl font-semibold">Mini Apps</div>
        <a className="px-3 py-1 rounded border border-fp-border bg-white" href="/apps/studio">Create mini app</a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((m)=> (
          <div key={m.slug} className="border border-fp-border rounded p-3 bg-white">
            <div className="font-medium flex items-center gap-2 mb-1"><span>{m.icon || '🐶'}</span><span>{m.name}</span></div>
            <div className="text-xs text-slate-600 mb-2">/{m.slug}</div>
            <div className="text-sm text-slate-700 mb-2">{m.description || '—'}</div>
            <div className="flex items-center gap-2 text-sm">
              <a className="px-2 py-1 rounded border border-fp-border" href={`/a/${encodeURIComponent(m.slug)}${m.manifest ? `?manifest=${encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(m.manifest)))))}&draft=1` : ''}`}>Open</a>
              <a className="px-2 py-1 rounded border border-fp-border" href={`/apps/new?slug=${encodeURIComponent(m.slug)}`}>Edit</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


