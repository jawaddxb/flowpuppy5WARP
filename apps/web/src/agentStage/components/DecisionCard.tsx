"use client"
import React from 'react'
import { Handle, Position } from 'reactflow'
import { useGraph } from '@/agentStage/graph/store'
import { AnchorPlus } from '@/agentStage/components/AnchorPlus'

export default function DecisionCard({ id, data }: any) {
  const branches: string[] = Array.isArray(data?.branches) && data.branches.length ? data.branches : ['No','Yes']
  const uiMode = (useGraph as any).getState?.().uiMode as 'beginner'|'pro'
  const chipCls = uiMode==='pro' ? 'px-2 h-5 text-[11px]' : 'px-3 h-6 text-[12px]'
  const open = useGraph(s=>s.openAdd)
  return (
    <div className="relative rounded-[12px] border-[3px] border-black bg-white" style={{ boxShadow:'0 0 0 2px #000, 0 1px 2px rgba(0,0,0,.05), 0 8px 16px rgba(0,0,0,.04)' }}>
      <div className="px-3 py-2 font-semibold text-slate-900 text-[15px]">Decision</div>
      <div className="px-3 pb-3 flex gap-2 flex-wrap">
        {branches.map((b)=> (
          <button data-testid={`branch-chip-${b}`} aria-label={`Add branch ${b}`} title={`Add branch ${b}`} key={b} className={`inline-flex items-center gap-1 rounded-full leading-5 text-white ${chipCls}`} style={{ background:'#0f172a' }} onClick={(e)=> {
            e.stopPropagation();
            try {
              const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
              open({ kind:'branch', nodeId: id, label: b, ui: { x: r.left + r.width/2, y: r.top + r.height/2 } })
            } catch { open({ kind:'branch', nodeId: id, label: b }) }
          }}>{b}<span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#e2e8f0] bg-white text-[#0f172a]">+</span></button>
        ))}
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <AnchorPlus
        onClick={(e)=>{
          e.stopPropagation()
          try {
            const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
            useGraph.getState().openAdd({ kind:'node', nodeId: id, ui: { x: r.left + r.width/2, y: r.top + r.height/2 } } as any)
          } catch {
            useGraph.getState().openAdd({ kind:'node', nodeId: id } as any)
          }
        }}
      />
    </div>
  )
}


