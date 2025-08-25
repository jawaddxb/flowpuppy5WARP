"use client"
import React, { useState } from 'react'
import { useGraphStore } from '@/store/graph'

export default function FrameHUD({ frameId, x, y, label }: { frameId: string; x: number; y: number; label: string }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(label)
  function commit() {
    useGraphStore.getState().updateNode(frameId, { label: value.trim() || 'Group' })
    setEditing(false)
  }
  return (
    <div className="absolute z-[23]" style={{ left: x, top: y }}>
      <div className="inline-flex items-center gap-2 rounded-full border border-fp-border bg-white shadow-fp-1 px-2 py-1">
        {!editing ? (
          <button className="text-xs" onClick={()=> setEditing(true)}>{label || 'Group'}</button>
        ) : (
          <input autoFocus className="text-xs border border-fp-border rounded px-1 py-0.5" value={value} onChange={(e)=> setValue(e.target.value)} onBlur={commit} onKeyDown={(e)=>{ if (e.key==='Enter') commit(); if (e.key==='Escape') setEditing(false) }} />
        )}
        <button className="text-xs border border-fp-border rounded px-2 py-0.5" onClick={()=> selectInside(frameId)}>Select inside</button>
        <button className="text-xs border border-fp-border rounded px-2 py-0.5" onClick={()=> ungroup(frameId)}>Ungroup</button>
      </div>
    </div>
  )
}

function selectInside(frameId: string) {
  const s = useGraphStore.getState()
  const nodes = s.nodes as any[]
  const frame = nodes.find((n:any)=> n.id===frameId)
  if (!frame) return
  const fx = frame.position?.x ?? 0
  const fy = frame.position?.y ?? 0
  const fw = (frame as any).style?.width ?? 0
  const fh = (frame as any).style?.height ?? 0
  const inside = nodes.filter((n:any)=> n.type!=='frame' && (n.position?.x ?? 0) >= fx && (n.position?.y ?? 0) >= fy && (n.position?.x ?? 0) <= fx+fw && (n.position?.y ?? 0) <= fy+fh)
  s.setGraph(nodes.map((n:any)=> ({ ...n, selected: inside.some((m:any)=> m.id===n.id) })), s.edges as any)
}

function ungroup(frameId: string) {
  const s = useGraphStore.getState()
  const prev = s.nodes as any[]
  const updated = prev.map((n:any)=> (n as any).parentNode === frameId ? { ...n, parentNode: undefined, extent: undefined } : n)
  const filtered = updated.filter((n:any)=> n.id !== frameId)
  s.setGraph(filtered as any, s.edges as any)
}


