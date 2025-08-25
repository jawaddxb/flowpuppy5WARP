"use client"
import React from 'react'
import { Handle, Position } from 'reactflow'
import { EventPillRF } from '@/agentStage/components/EventPillRF'
import { AnchorPlus } from '@/agentStage/components/AnchorPlus'
import { useGraph } from '@/agentStage/graph/store'

export default function NodeCard(props: any) {
  const { id, data } = props
  const openAdd = useGraph(s=>s.openAdd)
  const status = useGraph(s=> s.nodeStatus?.[id] || 'idle')
  const ring = status==='running' ? 'ring-2 ring-amber-300 ring-offset-1 ring-offset-white' : status==='ok' ? 'ring-2 ring-emerald-300 ring-offset-1 ring-offset-white' : status==='error' ? 'ring-2 ring-rose-300 ring-offset-1 ring-offset-white' : ''
  const isHoverNode = !!(props?.data?.hover)
  const hoverRing = (ring === '' && isHoverNode) ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white' : ''
  // Dynamic border color for maximum visibility + state feedback; plan-hover uses orange
  const border = status==='running' || status==='ok' ? 'border-green-600' : status==='error' ? 'border-rose-600' : (isHoverNode ? 'border-amber-500' : 'border-black')
  const borderWidth = status==='running' ? 'border-[6px]' : 'border-[3px]'
  const uiMode = useGraph(s=> s.uiMode)
  const dense = uiMode === 'pro'
  return (
    <div
      className={`relative rounded-[12px] ${borderWidth} ${border} overflow-visible bg-white ${ring || hoverRing} transition-colors ${data?.dim?'opacity-40':''}`}
      style={{ boxShadow: `0 0 0 2px ${status==='running'||status==='ok' ? '#16a34a' : (status==='error' ? '#dc2626' : (isHoverNode ? '#f59e0b' : '#000'))}, 0 1px 2px rgba(0,0,0,.05), 0 8px 16px rgba(0,0,0,.04)` }}
    >
      <div className="px-3 py-2 flex items-center justify-between" role="group" aria-label="Node header">
        <div className="flex items-center gap-2">
          <span className="text-[14px]" aria-hidden>{data.icon || '⚙️'}</span>
          <div className={`font-semibold ${dense?'text-[13px]':'text-[15px]'} leading-tight`}>{data.title}</div>
        </div>
      </div>
      {!dense && data.subtitle && <div className="px-3 pb-2 text-[12px] text-slate-600 truncate" aria-label="Node subtitle">{data.subtitle}</div>}
      {data.kind==='output' && (
        <div className="px-3 pb-2 text-[11px] text-slate-600">Events:</div>
      )}
      {Array.isArray(data.eventPills) && data.eventPills.length>0 && (
        <div className={`px-3 pb-3 flex gap-3 flex-wrap ${dense?'hidden':''}`}>
          {data.eventPills.map((p:any)=> <EventPillRF key={p.id} nodeId={id} pill={p} />)}
        </div>
      )}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <AnchorPlus
        onClick={(e) => {
          e.stopPropagation()
          try {
            const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
            openAdd({ kind: 'node', nodeId: id, ui: { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
          } catch {
            openAdd({ kind: 'node', nodeId: id })
          }
        }}
      />
    </div>
  )
}


