"use client"
import React from 'react'

type SelectionToolbarProps = {
  bbox: { x: number; y: number } | null
  onAlign: (dir: 'L'|'R'|'T'|'B') => void
  onDistribute: (dir: 'H'|'V') => void
  onGroup: () => void
  onUngroup: () => void
}

export default function SelectionToolbar({ bbox, onAlign, onDistribute, onGroup, onUngroup }: SelectionToolbarProps) {
  if (!bbox) return null
  return (
    <div className="absolute z-20" style={{ left: bbox.x, top: bbox.y - 36 }}>
      <div className="rounded-[var(--radius-sm)] border border-fp-border bg-white shadow-fp-1 px-2 py-1 flex items-center gap-1">
        <button className="px-2 py-0.5 text-xs border border-fp-border rounded" onClick={()=> onAlign('L')}>Align L</button>
        <button className="px-2 py-0.5 text-xs border border-fp-border rounded" onClick={()=> onAlign('R')}>Align R</button>
        <button className="px-2 py-0.5 text-xs border border-fp-border rounded" onClick={()=> onAlign('T')}>Align T</button>
        <button className="px-2 py-0.5 text-xs border border-fp-border rounded" onClick={()=> onAlign('B')}>Align B</button>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <button className="px-2 py-0.5 text-xs border border-fp-border rounded" onClick={()=> onDistribute('H')}>Distribute H</button>
        <button className="px-2 py-0.5 text-xs border border-fp-border rounded" onClick={()=> onDistribute('V')}>Distribute V</button>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <button className="px-2 py-0.5 text-xs border border-fp-border rounded" onClick={onGroup}>Group</button>
        <button className="px-2 py-0.5 text-xs border border-fp-border rounded" onClick={onUngroup}>Ungroup</button>
      </div>
    </div>
  )
}



