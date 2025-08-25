"use client"
import React from 'react'

export default function ZoomControls({ onZoomIn, onZoomOut, onFit }: { onZoomIn: () => void; onZoomOut: () => void; onFit: () => void }) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-fp-border bg-white shadow-fp-1 p-1">
      <button className="w-8 h-8 text-sm rounded border border-fp-border hover:bg-slate-50" title="Zoom in" onClick={onZoomIn}>＋</button>
      <button className="w-8 h-8 text-sm rounded border border-fp-border hover:bg-slate-50" title="Zoom out" onClick={onZoomOut}>－</button>
      <button className="w-8 h-8 text-[11px] rounded border border-fp-border hover:bg-slate-50" title="Fit view" onClick={onFit}>⤢</button>
    </div>
  )
}



