"use client"
import React from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow'

export function ChipEdge(props: any) {
  const [path, labelX, labelY] = getBezierPath(props)
  const isPrimary = !!props?.data?.primary
  const hovered = !!props?.data?.hovered
  const stroke = hovered ? '#0f172a' : (isPrimary ? '#94a3b8' : 'rgba(148,163,184,0.65)')
  return (
    <>
      <BaseEdge path={path} style={{ stroke, strokeWidth: 1.6 }} {...props} />
      {props.label && (
        <EdgeLabelRenderer>
          <div style={{ position:'absolute', transform:`translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}>
            <span className={`rounded-full px-2 py-0.5 text-[11px] shadow ${props?.data?.hovered ? 'bg-[#0f172a] text-white' : 'bg-slate-800/90 text-white'}`}>{props.label}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}


