"use client"
import React from 'react'
import { useGraph } from '@/agentStage/graph/store'

export function EventPillRF({ nodeId, pill }: { nodeId:string; pill:{id:string; label:string} }) {
  const uiMode = (useGraph as any).getState?.().uiMode as 'beginner'|'pro'
  const cls = uiMode==='pro' ? 'px-2 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${cls} text-slate-600 bg-white`}>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#94a3b8' }} />
        {pill.label}
      </span>
      <button
        aria-label={`Add after ${pill.label}`}
        title={`Add after ${pill.label}`}
        className="rounded-full border px-1 leading-none bg-white"
        onClick={(e)=>{
          e.stopPropagation()
          try {
            const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
            useGraph.getState().openAdd({ kind:"pill", nodeId, pillId: pill.id, ui: { x: r.left + r.width/2, y: r.top + r.height/2 } })
          } catch {
            useGraph.getState().openAdd({ kind:"pill", nodeId, pillId: pill.id })
          }
        }}
      >+</button>
    </span>
  )
}


