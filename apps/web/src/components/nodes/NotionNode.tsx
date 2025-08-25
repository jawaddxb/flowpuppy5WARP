"use client"
import React from 'react'
import { Handle, Position } from 'reactflow'

export default function NotionNode({ data }: { data: { label?: string; databaseId?: string; operation?: string } }) {
  return (
    <div className="relative rounded-[var(--radius-md)] border border-fp-border bg-white px-3 py-2 shadow-fp-1 min-w-48 max-w-[320px]">
      <div className="text-sm font-medium">{data?.label || 'Notion'}</div>
      <div className="text-xs text-slate-600 whitespace-normal break-words leading-snug">{data?.operation || 'createPage'}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500 whitespace-normal break-all leading-snug">DB: {data?.databaseId || '—'}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
}


