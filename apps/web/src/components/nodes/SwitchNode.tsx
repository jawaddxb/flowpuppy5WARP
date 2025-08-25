"use client"
import React from 'react'
import { Handle, Position } from 'reactflow'
import { useGraphStore } from '@/store/graph'

export default function SwitchNode({ data, id }: { data: { label?: string; cases?: string[] }; id: string }) {
  const cases = (Array.isArray(data?.cases) && data.cases!.length > 0) ? data.cases! : ['Yes', 'No']
  const setGraph = useGraphStore(s => s.setGraph)
  const nodes = useGraphStore(s => s.nodes)
  const edges = useGraphStore(s => s.edges)
  const insertBelow = (branch: string) => {
    try {
      const me = (nodes as any[]).find((n:any)=> n.id===id)
      const x = (me?.position?.x ?? 0)
      const y = (me?.position?.y ?? 0)
      const newId = `action_${Math.random().toString(36).slice(2,7)}`
      const newNode = { id: newId, type: 'transform' as any, position: { x: Math.round(x/300)*300, y: y + 80 }, data: { label: 'Step' } }
      const newEdge = { id: `e_${Math.random().toString(36).slice(2,7)}`, source: id, target: newId, label: branch }
      setGraph([...(nodes as any[]), newNode], [...(edges as any[]), newEdge])
    } catch {}
  }
  return (
    <div className="relative rounded-[var(--radius-md)] border border-teal-300 bg-white px-3 py-2 shadow-fp-1 min-w-44 max-w-[360px]">
      <div className="text-sm font-medium">{data?.label || 'Switch'}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {cases.map((c)=> (
          <div key={c} className="flex items-center gap-1">
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-[#e2e8f0] bg-white text-slate-700">{c}</span>
            <button title={`Add on '${c}'`} className="w-5 h-5 leading-[18px] text-[13px] rounded-full border border-[#e2e8f0] bg-white hover:bg-slate-50 text-slate-700" onClick={(e)=>{ e.stopPropagation(); insertBelow(c) }}>+</button>
          </div>
        ))}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-teal-600">Logic</div>

      {/* Input handle */}
      <Handle type="target" position={Position.Left} />

      {/* One source handle per case */}
      {cases.map((c, idx) => (
        <Handle
          key={c}
          type="source"
          position={Position.Right}
          id={`case:${encodeURIComponent(c)}`}
          style={{ top: `${((idx + 1) * 100) / (cases.length + 1)}%`, transform: 'translateY(-50%)' }}
        />
      ))}
    </div>
  )
}

