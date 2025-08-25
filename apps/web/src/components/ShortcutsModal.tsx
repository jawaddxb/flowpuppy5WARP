"use client"
import React, { useEffect } from 'react'

export default function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[40]" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute left-1/2 top-24 -translate-x-1/2 w-[520px] rounded-[var(--radius-lg)] border border-fp-border bg-white shadow-fp-1 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Keyboard shortcuts</div>
          <button className="text-xs border border-fp-border rounded px-2 py-0.5" onClick={onClose} aria-label="Close shortcuts">Close</button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <Row k="?" v="Show shortcuts" />
            <Row k="Cmd/Ctrl + K" v="Command palette" />
            <Row k="N" v="Quick add node" />
            <Row k="Z" v="Toggle Zen mode" />
            <Row k="Cmd/Ctrl + 0" v="Fit view" />
            <Row k="Cmd/Ctrl + Shift + F" v="Fit selection" />
          </div>
          <div className="space-y-1">
            <Row k="1 / 2 / 3" v="Zoom presets" />
            <Row k="Space" v="Pan" />
            <Row k="Cmd/Ctrl + D" v="Duplicate selection" />
            <Row k="Delete / Backspace" v="Delete selection" />
            <Row k="Arrow keys" v="Palette navigation" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-slate-600">{v}</div>
      <kbd className="text-xs border border-fp-border rounded bg-slate-50 px-2 py-0.5">{k}</kbd>
    </div>
  )
}



