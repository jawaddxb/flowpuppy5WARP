"use client"
import { useSimStore } from '@/store/sim'
import { useGraphStore } from '@/store/graph'
export default function EmailNode({ data, id }: { data: { label?: string; to?: string; subject?: string }; id: string }) {
  const status = useSimStore((s)=> s.nodeStatus[id] || 'idle')
  const setGraph = useGraphStore(s => s.setGraph)
  const nodes = useGraphStore(s => s.nodes)
  const edges = useGraphStore(s => s.edges)
  const insertAfterEvent = (eventLabel: string) => {
    try {
      const me = (nodes as any[]).find((n:any)=> n.id===id)
      const x = (me?.position?.x ?? 0)
      const y = (me?.position?.y ?? 0)
      const newId = `action_${Math.random().toString(36).slice(2,7)}`
      const newNode = { id: newId, type: 'transform' as any, position: { x: Math.round(x/300)*300, y: y + 80 }, data: { label: 'Step' } }
      const newEdge = { id: `e_${Math.random().toString(36).slice(2,7)}`, source: id, target: newId, label: eventLabel }
      setGraph([...(nodes as any[]), newNode], [...(edges as any[]), newEdge])
    } catch {}
  }
  return (
    <div className={`relative rounded-[var(--radius-md)] px-3 py-2 shadow-fp-1 min-w-40 max-w-[320px] ${status==='ok' ? 'border border-emerald-400 bg-white' : status==='error' ? 'border border-rose-400 bg-rose-50' : 'border border-fp-border bg-white'}`}>
      {!data?.to && (
        <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">!</span>
      )}
      <div className="text-sm font-medium">{data.label || 'Email'}</div>
      <div className="text-xs text-slate-700 whitespace-normal break-all leading-snug">{data.to || 'user@example.com'}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Integration</div>
      {/* Event pills (AB-105) */}
      <div className="mt-2 flex items-center gap-2">
        {['After email sent','After reply received'].map((pill)=> (
          <div key={pill} className="flex items-center gap-1">
            <span className="h-[26px] inline-flex items-center px-3 rounded-full border border-[#e2e8f0] text-[12px] bg-white text-slate-700">{pill}</span>
            <button className="w-5 h-5 text-[13px] rounded-full border border-[#e2e8f0] bg-white hover:bg-slate-50 text-slate-700" title={`Add step for '${pill}'`} onClick={(e)=>{ e.stopPropagation(); insertAfterEvent(pill) }}>+</button>
          </div>
        ))}
      </div>
    </div>
  )
}

