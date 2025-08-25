"use client"
import { Handle, Position } from 'reactflow'
import { useSimStore } from '@/store/sim'

export default function MacroNode({ data, id }: { data: any; id: string }) {
  const status = useSimStore((s)=> s.nodeStatus[id] || 'idle')
  const label = data?.label || data?.title || 'Macro'
  return (
    <div className={`rounded-lg border ${status==='running'?'border-blue-400 animate-[pulse_2s_infinite]':'border-slate-200'} bg-slate-50 shadow-sm px-3 py-2 min-w-[160px]`}>
      <div className="text-xs text-slate-500">Macro</div>
      <div className="font-medium">{label}</div>
      <div className="text-[11px] text-slate-500">Double-click to open</div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}



