"use client"
import React from 'react'
import { Handle, Position } from 'reactflow'

export default function TryCatchNode({ data }: { data: { label?: string } }) {
  return (
    <div className="relative rounded-[var(--radius-md)] border border-teal-300 bg-white px-3 py-2 shadow-fp-1 min-w-44 max-w-[320px]">
      <div className="text-sm font-medium">{data?.label || 'Try/Catch'}</div>
      <div className="text-xs text-slate-700 whitespace-normal break-words leading-snug">try → catch</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-teal-600">Logic</div>

      {/* Input */}
      <Handle type="target" position={Position.Left} />
      {/* Outputs */}
      <Handle type="source" id="try" position={Position.Right} style={{ top: '40%', transform: 'translateY(-50%)' }} />
      <Handle type="source" id="catch" position={Position.Right} style={{ top: '70%', transform: 'translateY(-50%)' }} />
    </div>
  )
}


