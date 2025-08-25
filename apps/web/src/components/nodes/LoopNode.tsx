"use client"
import React from 'react'
import { Handle, Position } from 'reactflow'

export default function LoopNode({ data }: { data: { label?: string; iterations?: number } }) {
  return (
    <div className="relative rounded-[var(--radius-md)] border border-teal-300 bg-white px-3 py-2 shadow-fp-1 min-w-44 max-w-[320px]">
      <div className="text-sm font-medium">{data?.label || 'Loop'}</div>
      <div className="text-xs text-slate-700 whitespace-normal break-words leading-snug">iterations: {data?.iterations ?? 3}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-teal-600">Logic</div>

      <Handle type="target" position={Position.Left} />
      <Handle type="source" id="body" position={Position.Right} style={{ top: '45%', transform: 'translateY(-50%)' }} />
      <Handle type="source" id="after" position={Position.Right} style={{ top: '75%', transform: 'translateY(-50%)' }} />
    </div>
  )
}


