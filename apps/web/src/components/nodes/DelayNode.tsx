"use client"
import React from 'react'
import { Handle, Position } from 'reactflow'

export default function DelayNode({ data }: { data: { label?: string; ms?: number } }) {
  return (
    <div className="relative rounded-[var(--radius-md)] border border-fp-border bg-white px-3 py-2 shadow-fp-1 min-w-40 max-w-[320px]">
      <div className="text-sm font-medium">{data?.label || 'Delay'}</div>
      <div className="text-xs text-slate-700 whitespace-normal break-words leading-snug">{data?.ms ?? 1000} ms</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Core</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
}


