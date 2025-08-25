"use client"
import React from 'react'
import { useSimStore } from '@/store/sim'
import StepCallout from '@/components/StepCallout'
import { describeNode } from '@/lib/simExplain'
import { Handle, Position } from 'reactflow'

export default function GenericNode({ data, id }: { data: any; id: string }) {
  const status = useSimStore((s)=> s.nodeStatus[id] || 'idle')
  const activeNodeId = useSimStore((s)=> s.activeNodeId)
  const active = activeNodeId === id
  return (
    <div className={`relative rounded-[var(--radius-sm)] px-3 py-2 text-xs shadow-fp-1 min-w-[200px] max-w-[420px] transition-all duration-300 ${status==='running' ? 'border-2 border-teal-400 bg-teal-50 shadow-[0_0_0_4px_rgba(20,184,166,0.15)] scale-[1.02]' : status==='ok' ? 'border border-emerald-400 bg-white' : status==='error' ? 'border border-rose-400 bg-rose-50' : 'border border-fp-border bg-white'}`}>
      <div className="font-semibold text-[13px] whitespace-normal break-words leading-snug">{data?.label || 'Node'}</div>
      <div className="text-[11px] text-slate-500 whitespace-normal break-words leading-snug">{String(data?.subtitle || data?.provider || 'Generic')}</div>
      {status==='running' && (
        <div className="absolute -inset-1 rounded-[12px] pointer-events-none" style={{ background:
          'conic-gradient(#14b8a6 0, #14b8a6 25%, transparent 25% 100%)', mask:
          'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))', WebkitMask:
          'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
          animation: 'fp-spin 1.2s linear infinite' as any }} />
      )}
      {status!=='idle' && (
        <div className="absolute -top-1 -right-1 text-[10px] px-1 rounded bg-white border">
          {status==='running' ? '…' : status==='ok' ? '✓' : '!'}
        </div>
      )}
      {active && (
        <div className="absolute left-full top-1 ml-2">
          <StepCallout {...describeNode({ type: 'generic', data })} />
        </div>
      )}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
}


