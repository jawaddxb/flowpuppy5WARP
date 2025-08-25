"use client"
import React, { useCallback, useMemo, useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from 'reactflow'
import { useSimStore } from '@/store/sim'

export default function LabeledEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    style,
    label,
    selected,
    data,
  } = props

  const [edgePath, labelX, labelY] = useMemo(
    () => getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }),
    [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]
  )
  const pulseType = useSimStore((s)=> s.pulsingEdges.get(id))
  const speed = useSimStore((s)=> s.speed)
  const tokenDur = Math.max(0.4, 0.9 / Math.max(0.25, Math.min(3, speed)))

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label as string | undefined)

  const onDoubleClick = useCallback(() => {
    setDraft((label as string) || '')
    setEditing(true)
  }, [label])

  const commit = useCallback(() => {
    setEditing(false)
    const next = (draft || '').trim()
    if (next === (label as string)) return
    data?.onLabelChange?.(id, next)
  }, [data, id, draft, label])

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditing(false)
      setDraft(label as string)
    }
  }

  return (
    <g>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, stroke: pulseType ? (pulseType==='error' ? '#f43f5e' : pulseType==='guarded' ? '#f59e0b' : '#14b8a6') : (style as any)?.stroke, strokeWidth: pulseType ? 2.5 : (style as any)?.strokeWidth }} />
      {pulseType && (
        <>
          <path d={edgePath} stroke={pulseType==='error' ? '#f87171' : '#10b981'} strokeWidth={3} fill="none" strokeDasharray="6 8" style={{ animation: 'fp-dash 0.9s linear infinite' }} />
          {/* moving token */}
          <circle r={4} fill={pulseType==='error' ? '#f43f5e' : '#10b981'} style={{
            // CSS motion path
            offsetPath: `path('${edgePath}')`,
            offsetDistance: '0%',
            animation: `fp-token ${tokenDur}s linear infinite`,
          } as any} />
        </>
      )}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            zIndex: 10,
          }}
        >
          {editing ? (
            <input
              autoFocus
              className="px-2 py-1 border border-fp-border rounded-[var(--radius-sm)] text-xs bg-white shadow-fp-1"
              value={draft || ''}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={onKeyDown}
              placeholder="Label"
            />
          ) : (
            <div className="flex items-center gap-1">
              <button
                onDoubleClick={onDoubleClick}
                onClick={onDoubleClick}
                className={`px-2 py-0.5 rounded-full border text-xs ${
                  selected ? 'border-fp-primary text-fp-primary bg-white' : 'border-fp-border text-slate-700 bg-white'
                } shadow-fp-1 whitespace-nowrap max-w-[220px] overflow-hidden text-ellipsis`}
                title="Edit label"
              >
                {(label as string) && (label as string).length > 0 ? (label as string) : 'Add label'}
              </button>
              <button
                onClick={() => data?.onDelete?.(id)}
                title="Delete edge"
                className="px-1 py-0.5 text-[10px] rounded border border-fp-border text-rose-600 bg-white"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </g>
  )
}


