"use client"
import React from 'react'
import { Handle, Position } from 'reactflow'
import { useSimStore } from '@/store/sim'
import StepCallout from '@/components/StepCallout'
import { describeNode } from '@/lib/simExplain'

export default function TransformNode({ data, id }: { data: { label?: string; script?: string }, id: string }) {
  const status = useSimStore((s)=> s.nodeStatus[id] || 'idle')
  const activeNodeId = useSimStore((s)=> s.activeNodeId)
  const active = activeNodeId === id
  return (
    <div className={`relative rounded-[var(--radius-md)] border px-3 py-2 shadow-fp-1 min-w-48 max-w-[320px] transition-all duration-300 ${status==='running' ? 'border-2 border-teal-400 bg-teal-50 shadow-[0_0_0_4px_rgba(20,184,166,0.15)] scale-[1.02]' : status==='ok' ? 'border border-emerald-400 bg-white' : status==='error' ? 'border border-rose-400 bg-rose-50' : 'border border-fp-border bg-white'}`}>
      <div className="text-sm font-medium">{data?.label || 'Transform'}</div>
      <div className="font-mono text-[11px] text-slate-600 whitespace-pre-wrap break-words leading-snug max-h-20 overflow-auto">{data?.script || '// transform'}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Core</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      {active && (
        <div className="absolute left-full top-1 ml-2">
          <StepCallout {...describeNode({ type: 'transform', data })} />
        </div>
      )}
    </div>
  )
}


