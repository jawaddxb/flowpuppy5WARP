"use client"
import React, { useState } from 'react'
import { NodeResizer } from 'reactflow'
import { useGraphStore } from '@/store/graph'

export default function FrameNode({ id, data, selected }: { id: string; data: { label?: string }, selected?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState<string>(data?.label || 'Group')

  function commit() {
    const v = value.trim() || 'Group'
    useGraphStore.getState().updateNode(id, { label: v })
    setEditing(false)
  }

  return (
    <div className="relative" style={{ width: '100%', height: '100%' }}>
      <NodeResizer isVisible minWidth={200} minHeight={120} handleStyle={{ width: 8, height: 8, borderRadius: 9999, background: '#94a3b8' }} lineStyle={{ stroke: '#e2e8f0' }} />
      <div className={`absolute -top-6 left-2 text-xs ${selected ? 'text-fp-primary' : 'text-slate-500'}`} onDoubleClick={()=>{ setValue(data?.label || 'Group'); setEditing(true) }}>
        {editing ? (
          <input
            autoFocus
            value={value}
            onChange={(e)=> setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e)=>{ if (e.key==='Enter') commit(); if (e.key==='Escape') setEditing(false) }}
            className="border border-fp-border rounded-[var(--radius-sm)] px-1 py-0.5 bg-white"
            style={{ minWidth: 80 }}
          />
        ) : (
          <span>{data?.label || 'Group'}</span>
        )}
      </div>
      {/* Visual chrome without ReactFlow selection box */}
      <div className="absolute inset-0 pointer-events-none rounded-[12px]" style={{ boxShadow: 'inset 0 0 0 1px #e2e8f0', background: 'rgba(248,250,252,0.7)' }} />
    </div>
  )
}


