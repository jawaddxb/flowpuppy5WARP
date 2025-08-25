"use client"
import React, { useEffect, useState } from 'react'

export default function VersionsSidebar({ workflowId, onRestore }: { workflowId: string | null; onRestore: (id: string) => void }) {
  const [items, setItems] = useState<Array<{ id: string; version: number; created_at: string }>>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!workflowId) return setItems([])
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/workflow-versions?workflowId=' + encodeURIComponent(workflowId))
        const data = await res.json()
        if (res.ok) setItems(data.items || [])
      } finally { setLoading(false) }
    })()
  }, [workflowId])
  return (
    <div className="rounded-[var(--radius-lg)] border border-fp-border bg-fp-surface p-3">
      <div className="font-medium mb-2">Versions</div>
      {!workflowId && <div className="text-xs text-slate-500">No workflow selected</div>}
      {workflowId && loading && <div className="text-xs">Loading…</div>}
      {workflowId && !loading && (
        <div className="space-y-1 max-h-72 overflow-auto">
          {items.map((v)=> (
            <div key={v.id} className="flex items-center justify-between text-sm border border-fp-border rounded-[var(--radius-sm)] bg-white px-2 py-1">
              <div>v{v.version} <span className="text-xs text-slate-500">{new Date(v.created_at).toLocaleString()}</span></div>
              <div className="flex items-center gap-2">
                <button onClick={()=> onRestore(v.id)} className="px-2 py-0.5 text-xs rounded border border-fp-border">Preview</button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="text-xs text-slate-500">No versions</div>}
        </div>
      )}
    </div>
  )
}


