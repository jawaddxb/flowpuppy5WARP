"use client"
import React from 'react'

type RunItem = { id: string; status: string; created_at: string }
type StepItem = { id?: string; name?: string; node_id?: string; duration_ms?: number; durationMs?: number; error?: string }

export default function TasksPage() {
  const [runs, setRuns] = React.useState<RunItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const [steps, setSteps] = React.useState<Record<string, StepItem[]>>({})
  const [stepsLoading, setStepsLoading] = React.useState<Record<string, boolean>>({})

  // Poll for newest runs roughly every second to reflect near real-time
  React.useEffect(() => {
    let alive = true
    async function fetchRuns() {
      try {
        setLoading(true)
        const res = await fetch('/api/runs?limit=15', { cache: 'no-store' })
        const j = await res.json().catch(()=>({}))
        if (!alive) return
        setRuns(Array.isArray(j?.items) ? j.items : [])
      } catch {
      } finally {
        setLoading(false)
      }
      if (alive) setTimeout(fetchRuns, 1000)
    }
    fetchRuns()
    return () => { alive = false }
  }, [])

  async function toggle(id: string) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!steps[id]) {
      setStepsLoading(m => ({ ...m, [id]: true }))
      try {
        const res = await fetch(`/api/runs/${id}/steps`, { cache: 'no-store' })
        const j = await res.json().catch(()=>({}))
        setSteps(m => ({ ...m, [id]: Array.isArray(j?.items) ? j.items : [] }))
      } catch {
      } finally {
        setStepsLoading(m => ({ ...m, [id]: false }))
      }
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Tasks</div>
        <a href="/agent" className="text-[12px] rounded border border-[#e2e8f0] px-2 py-1 text-slate-700">Back to Builder</a>
      </div>
      {loading && runs.length===0 && (
        <div className="text-sm text-slate-600">Loading…</div>
      )}
      {!loading && runs.length===0 && (
        <div className="text-sm text-slate-600">No tasks yet.</div>
      )}
      <div className="space-y-2">
        {runs.map((it) => (
          <div key={it.id} className="rounded border border-[#e2e8f0] bg-white">
            <button className="w-full text-left px-3 py-2 flex items-center justify-between" onClick={()=> toggle(it.id)}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[#e2e8f0]">{it.status}</span>
                <div className="font-medium">Run {it.id.slice(0, 8)}</div>
              </div>
              <div className="text-[12px] text-slate-500">{new Date(it.created_at).toLocaleString()}</div>
            </button>
            {expanded === it.id && (
              <div className="px-3 pb-3">
                {stepsLoading[it.id] && <div className="text-[12px] text-slate-500">Loading steps…</div>}
                {!stepsLoading[it.id] && (steps[it.id]||[]).length===0 && (
                  <div className="text-[12px] text-slate-500">No steps found.</div>
                )}
                {!stepsLoading[it.id] && (steps[it.id]||[]).length>0 && (
                  <div className="space-y-1">
                    {(steps[it.id]||[]).map((s, idx)=> (
                      <div key={s.id || idx} className="rounded border border-[#e2e8f0] bg-slate-50 p-2">
                        <div className="flex items-center justify-between">
                          <div className="font-mono text-[12px]">{String(s.name || s.node_id || 'step')}</div>
                          <div className="text-[12px] text-slate-500">{(s.duration_ms||s.durationMs) ? `${s.duration_ms||s.durationMs} ms` : ''}</div>
                        </div>
                        {s.error && <div className="text-[12px] text-rose-600">{String(s.error)}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
