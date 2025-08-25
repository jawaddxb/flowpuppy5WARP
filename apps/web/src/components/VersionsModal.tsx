"use client"
import React, { useEffect, useState } from 'react'

type DraftItem = { id: string; name: string; created_at: string }

export default function VersionsModal({ open, onClose, onLoad, onSaveVersion }: {
  open: boolean
  onClose: () => void
  onLoad: (id: string) => void
  onSaveVersion: (name?: string) => void
}) {
  const [items, setItems] = useState<DraftItem[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [workflowVersions, setWorkflowVersions] = useState<Array<{ id: string; version: number; created_at: string }>>([])
  const [workflowId, setWorkflowId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/workflows')
        const data = await res.json()
        if (res.ok) setItems(data.items || [])
        const id = localStorage.getItem('fp-current-workflow-id')
        if (id) {
          setWorkflowId(id)
          const r2 = await fetch('/api/workflows?id=' + encodeURIComponent(id))
          // placeholder; real endpoint for versions list would differ
          if (r2.ok) setWorkflowVersions([])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [open])

  if (!open) return null

  const filtered = items.filter(i => !q.trim() || i.name.toLowerCase().includes(q.toLowerCase()) || i.id.includes(q))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-[var(--radius-lg)] border border-fp-border bg-white shadow-fp-1 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Versions</div>
          <button onClick={onClose} className="px-2 py-1 text-xs rounded border border-fp-border">Close</button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search drafts" className="flex-1 border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-sm" />
          <button onClick={()=> onSaveVersion()} className="px-3 py-1.5 rounded-[var(--radius-sm)] border border-fp-border bg-white text-xs">Save as version</button>
          <button onClick={async ()=>{
            try {
              const name = prompt('Version name', 'v1') || undefined
              const id = localStorage.getItem('fp-current-workflow-id')
              if (!id) return alert('No workflow selected')
              const dsl = (window as any).flowCanvasApi?.toDsl?.() || null
              if (!dsl) return alert('No graph')
              const res = await fetch('/api/workflows', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowId: id, versionName: name, dsl }) })
              if (res.ok) alert('Saved version to workflow')
            } catch {}
          }} className="px-3 py-1.5 rounded-[var(--radius-sm)] border border-fp-border bg-white text-xs">Save to workflow</button>
        </div>
        {workflowId && (
          <div className="mb-3 text-xs text-slate-600">Workflow: {workflowId} • Versions: {workflowVersions.length}</div>
        )}
        <div className="border border-fp-border rounded-[var(--radius-sm)] divide-y max-h-[50vh] overflow-auto">
          {loading && <div className="p-2 text-sm">Loading…</div>}
          {!loading && filtered.length === 0 && <div className="p-2 text-sm">No drafts</div>}
          {filtered.map((d)=> (
            <div key={d.id} className="p-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium text-sm">{d.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{d.id}</div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <button onClick={()=> onLoad(d.id)} className="px-2 py-1 text-xs rounded border border-fp-border">Load</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


