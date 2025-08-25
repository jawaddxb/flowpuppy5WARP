"use client"
import React from 'react'

type NodeLite = { id: string; type: string }
type EdgeLite = { source: string; target: string; label?: string }

export default function DiffPreview({ current, next }: { current: { nodes: NodeLite[]; edges: EdgeLite[] }, next: { nodes: NodeLite[]; edges: EdgeLite[] } }) {
  const curIds = new Set(current.nodes.map(n => n.id))
  const nextIds = new Set(next.nodes.map(n => n.id))
  const addedNodes = next.nodes.filter(n => !curIds.has(n.id))
  const removedNodes = current.nodes.filter(n => !nextIds.has(n.id))

  const edgeKey = (e: EdgeLite) => `${e.source}->${e.target}:${e.label ?? ''}`
  const curEdgeKeys = new Set(current.edges.map(edgeKey))
  const nextEdgeKeys = new Set(next.edges.map(edgeKey))
  const addedEdges = next.edges.filter(e => !curEdgeKeys.has(edgeKey(e)))
  const removedEdges = current.edges.filter(e => !nextEdgeKeys.has(edgeKey(e)))

  const [summary, setSummary] = React.useState<string>('')
  const [summErr, setSummErr] = React.useState<string>('')
  const [loading, setLoading] = React.useState<boolean>(false)
  const [showDetails, setShowDetails] = React.useState<boolean>(false)

  React.useEffect(() => {
    const total = addedNodes.length + removedNodes.length + addedEdges.length + removedEdges.length
    if (total === 0) { setSummary('No changes proposed.'); setSummErr(''); return }
    let alive = true
    setLoading(true)
    setSummErr('')
    setSummary('')
    fetch('/api/agent/diff/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addedNodes: addedNodes.map(n => ({ id: n.id, type: n.type })),
        removedNodes: removedNodes.map(n => ({ id: n.id, type: n.type })),
        addedEdges,
        removedEdges,
      }),
    }).then(async (res) => {
      const j = await res.json().catch(() => ({}))
      if (!alive) return
      if (!res.ok) {
        const errMsg = String(j?.error || `HTTP ${res.status}`)
        setSummErr(errMsg)
        setSummary('Here’s what will change when you apply this update:')
      } else {
        const s = String(j?.summary || '').trim()
        setSummary(s || 'Here’s what will change when you apply this update:')
      }
    }).catch((e) => {
      if (!alive) return
      setSummErr(String(e?.message || e))
      setSummary('Here’s what will change when you apply this update:')
    }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [addedNodes.length, removedNodes.length, addedEdges.length, removedEdges.length])

  return (
    <div className="text-xs space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-medium">What will change</div>
        <div className="rounded-md border border-slate-200 bg-white p-2">
          {loading ? (
            <div className="text-slate-500">Summarizing…</div>
          ) : (
            <div data-testid="diff-summary" className="text-slate-800">{summary}</div>
          )}
          {summErr && <div className="mt-1 text-[10px] text-amber-700">AI summary unavailable: {summErr}</div>}
        </div>
      </div>

      <div>
        <button
          type="button"
          className="text-[11px] text-slate-600 hover:text-slate-900 underline"
          onClick={() => setShowDetails(s => !s)}
          data-testid="toggle-diff-details"
        >
          {showDetails ? 'Hide technical details' : 'Show technical details'}
        </button>
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-emerald-700 mb-1">Add</div>
            {addedNodes.length === 0 && addedEdges.length === 0 && <div className="text-slate-500">No additions</div>}
            {addedNodes.map(n => <div key={`an_${n.id}`} className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 mb-1">+ node {n.id} ({n.type})</div>)}
            {addedEdges.map((e, i) => <div key={`ae_${i}`} className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 mb-1">+ edge {e.source} → {e.target}{e.label ? ` (${e.label})` : ''}</div>)}
          </div>
          <div>
            <div className="text-rose-700 mb-1">Remove</div>
            {removedNodes.length === 0 && removedEdges.length === 0 && <div className="text-slate-500">No removals</div>}
            {removedNodes.map(n => <div key={`rn_${n.id}`} className="rounded border border-rose-200 bg-rose-50 px-2 py-1 mb-1">- node {n.id} ({n.type})</div>)}
            {removedEdges.map((e, i) => <div key={`re_${i}`} className="rounded border border-rose-200 bg-rose-50 px-2 py-1 mb-1">- edge {e.source} → {e.target}{e.label ? ` (${e.label})` : ''}</div>)}
          </div>
        </div>
      )}
    </div>
  )
}



