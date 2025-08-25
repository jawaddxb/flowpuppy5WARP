"use client"
import React, { useEffect, useState } from 'react'

type Run = { id: string; status: string; started_at: string; finished_at?: string; duration_ms?: number }

export default function RunHistory({ workflowId }: { workflowId: string | null }) {
  const [items, setItems] = useState<Run[]>([])
  const [steps, setSteps] = useState<Record<string, any[]>>({})
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState<boolean>(true)
  useEffect(() => {
    if (!workflowId) return setItems([])
    ;(async () => {
      try {
        const res = await fetch('/api/runs?workflowId=' + encodeURIComponent(workflowId))
        const data = await res.json()
        if (res.ok) {
          setItems(data.items || [])
          setCursor(data.nextCursor || null)
          setHasMore(Boolean(data.nextCursor))
        }
      } catch {}
    })()
  }, [workflowId])
  return (
    <div className="space-y-1 text-sm">
      <div className="font-medium">Recent Runs</div>
      {items.length === 0 && <div className="text-xs text-slate-500">No runs</div>}
      {items.map(r => (
        <div key={r.id} className="border border-fp-border rounded-[var(--radius-sm)] bg-white px-2 py-1">
          <div className="flex items-center justify-between">
            <div>{new Date(r.started_at).toLocaleString()}</div>
            <div className="text-xs text-slate-600">{r.status} • {r.duration_ms ?? 0}ms</div>
          </div>
          <button className="text-[11px] underline text-slate-600" onClick={async ()=>{
            const res = await fetch('/api/runs/' + encodeURIComponent(r.id) + '/steps')
            const data = await res.json()
            if (res.ok) setSteps(prev => ({ ...prev, [r.id]: data.items || [] }))
          }}>View steps</button>
          {Array.isArray(steps[r.id]) && (steps[r.id] as any[]).length > 0 && (
            <div className="mt-1 border-t border-fp-border pt-1 text-xs">
              {(steps[r.id] || []).map((s:any)=> (
                <details key={s.id} className="border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 bg-slate-50">
                  <summary className="flex items-center justify-between cursor-pointer">
                    <div className="truncate">{s.name || s.node_id}</div>
                    <div className="text-slate-500">{s.status} • {s.duration_ms ?? 0}ms</div>
                  </summary>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-slate-500 mb-0.5">Input</div>
                      <pre className="text-[10px] p-1 bg-white border border-fp-border rounded overflow-auto max-h-36">{JSON.stringify(s.input_json ?? null, null, 2)}</pre>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 mb-0.5">Output</div>
                      <pre className="text-[10px] p-1 bg-white border border-fp-border rounded overflow-auto max-h-36">{JSON.stringify(s.output_json ?? null, null, 2)}</pre>
                    </div>
                  </div>
                  {s.error && <div className="mt-1 text-[11px] text-rose-600">Error: {s.error}</div>}
                </details>
              ))}
            </div>
          )}
        </div>
      ))}
      {hasMore && (
        <button className="text-[11px] underline text-slate-600" onClick={async ()=>{
          if (!workflowId || !cursor) return
          const res = await fetch(`/api/runs?workflowId=${encodeURIComponent(workflowId)}&cursor=${encodeURIComponent(cursor)}`)
          const data = await res.json()
          if (res.ok) {
            setItems(prev => [...prev, ...(data.items || [])])
            setCursor(data.nextCursor || null)
            setHasMore(Boolean(data.nextCursor))
          }
        }}>Load more</button>
      )}
    </div>
  )
}


