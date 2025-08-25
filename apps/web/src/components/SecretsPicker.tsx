"use client"
import React, { useEffect, useState } from 'react'

type SecretItem = { name: string; value?: string }

export default function SecretsPicker({ onPick }: { onPick: (secret: SecretItem) => void }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<SecretItem[]>([])
  const [q, setQ] = useState('')
  const fetchSecrets = async () => {
    try {
      const res = await fetch('/api/secrets')
      const data = await res.json()
      if (res.ok) setItems(data.items || [])
    } catch {
      setItems([{ name: 'API_KEY' }, { name: 'SLACK_TOKEN' }])
    }
  }

  useEffect(() => {
    ;(async () => { await fetchSecrets() })()
    const onUpdated = () => { fetchSecrets() }
    window.addEventListener('secrets:updated', onUpdated as any)
    return () => window.removeEventListener('secrets:updated', onUpdated as any)
  }, [])

  const filtered = items.filter(i => !q.trim() || i.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="relative inline-block">
      <button onClick={()=> setOpen(v=>!v)} className="px-2 py-1 text-xs rounded border border-fp-border">Secrets…</button>
      {open && (
        <div className="absolute z-50 mt-1 w-64 rounded-[var(--radius-sm)] border border-fp-border bg-white shadow-fp-1 p-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search secrets" className="w-full mb-2 border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-xs" />
          <div className="max-h-48 overflow-auto divide-y">
            {filtered.map((s) => (
              <button key={s.name} onClick={()=> { onPick(s); setOpen(false) }} className="w-full text-left px-2 py-1 text-xs hover:bg-slate-50">
                {s.name}
              </button>
            ))}
            {filtered.length === 0 && <div className="px-2 py-1 text-xs text-slate-500">No secrets</div>}
          </div>
        </div>
      )}
    </div>
  )
}


