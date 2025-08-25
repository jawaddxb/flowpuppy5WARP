"use client"
import React, { useEffect, useMemo, useState } from 'react'

type Command = { id: string; label: string; shortcut?: string }

export default function CommandPalette({ open, onClose, onRun }: { open: boolean; onClose: () => void; onRun: (id: string) => void }) {
  const commands: Command[] = useMemo(() => [
    { id: 'save', label: 'Save' },
    { id: 'layout', label: 'Auto-layout' },
    { id: 'fit', label: 'Fit view' },
    { id: 'fitSel', label: 'Fit selection' },
    { id: 'copyDsl', label: 'Copy DSL' },
    { id: 'snap', label: 'Toggle snap' },
    { id: 'quickAdd', label: 'Quick-Add new node at center' },
    { id: 'left:narrow', label: 'Left panel width: Narrow' },
    { id: 'left:comfort', label: 'Left panel width: Comfort' },
    { id: 'left:wide', label: 'Left panel width: Wide' },
    { id: 'right:narrow', label: 'Right panel width: Narrow' },
    { id: 'right:comfort', label: 'Right panel width: Comfort' },
    { id: 'right:wide', label: 'Right panel width: Wide' },
  ], [])
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return commands.filter(c => c.label.toLowerCase().includes(q))
  }, [commands, query])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-32 bg-black/20" onClick={onClose}>
      <div className="w-[480px] rounded-[var(--radius-md)] border border-fp-border bg-white shadow-fp-1 p-2" onClick={(e)=> e.stopPropagation()}>
        <input autoFocus className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 mb-2" placeholder="Type a command…" value={query} onChange={(e)=> setQuery(e.target.value)} />
        <div className="max-h-64 overflow-y-auto">
          {filtered.map(c => (
          <button key={c.id} onClick={()=> onRun(c.id)} className="w-full text-left px-2 py-1 rounded-[var(--radius-sm)] hover:bg-slate-50">
              {c.label}
            </button>
          ))}
          {filtered.length === 0 && <div className="text-sm text-slate-500 px-2 py-2">No results</div>}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
          <span>Widths: left/right Narrow/Comfort/Wide</span>
        </div>
      </div>
    </div>
  )
}


