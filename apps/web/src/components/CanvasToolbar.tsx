"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { toDsl, validateDsl } from '@/lib/dsl'
import { useGraphStore } from '@/store/graph'

type CanvasToolbarProps = { onAction: (action: string) => void }

export default function CanvasToolbar({ onAction, inline = false }: CanvasToolbarProps & { inline?: boolean }) {
  const graph = useGraphStore(s => ({ nodes: s.nodes, edges: s.edges }))
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const v = window.localStorage.getItem('fp-toolbar-open')
    return v === null ? true : v === '1'
  })
  useEffect(()=>{ try { window.localStorage.setItem('fp-toolbar-open', open ? '1' : '0') } catch {} }, [open])

  const sections = useMemo(() => ([
    {
      title: 'Primary',
      items: [
        { id: 'save', label: 'Save' },
        { id: 'drafts', label: 'Drafts' },
        { id: 'versions', label: 'Versions' },
        { id: 'templates', label: 'Templates' },
      ]
    },
    {
      title: 'View',
      items: [
        { id: 'fit', label: 'Fit' },
        { id: 'fitSel', label: 'Fit Sel' },
        { id: 'zoomIn', label: 'Zoom +' },
        { id: 'zoomOut', label: 'Zoom -' },
        { id: 'layout', label: 'Layout' },
        { id: 'snap', label: 'Snap' },
      ]
    },
    {
      title: 'Graph',
      items: [
        { id: 'copyDsl', label: 'Copy DSL' },
      ]
    },
    {
      title: 'History',
      items: [
        { id: 'undo', label: 'Undo' },
        { id: 'redo', label: 'Redo' },
      ]
    }
  ]), [])

  function handleClick(id: string) {
    if (id === 'snap') return onAction('snap')
    if (id === 'copyDsl') {
      const dsl = toDsl(graph.nodes as any, graph.edges as any)
      const val = validateDsl(dsl)
      if (!val.ok) return alert('Validation errors: ' + val.errors.join(', '))
      navigator.clipboard.writeText(JSON.stringify(dsl, null, 2))
      alert('DSL copied')
      return
    }
    onAction(id)
  }

  if (inline) {
    return (
      <div className="ml-2 relative z-[28]">
        {!open && (
          <button className="px-2 py-1 rounded-[var(--radius-sm)] border border-fp-border bg-white text-xs shadow-fp-1" onClick={()=> setOpen(true)}>Toolbar</button>
        )}
        {open && (
          <div className="rounded-[var(--radius-md)] border border-fp-border bg-white shadow-fp-1 p-2 w-[260px] absolute right-0 mt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-sm">Canvas</div>
              <button className="px-2 py-0.5 text-xs rounded border border-fp-border" onClick={()=> setOpen(false)}>Close</button>
            </div>
            <div className="space-y-2">
              {sections.map(sec => (
                <div key={sec.title}>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">{sec.title}</div>
                  <div className="flex flex-wrap gap-1">
                    {sec.items.map(it => (
                      <button key={it.id} onClick={()=> handleClick(it.id)} className="px-2 py-1 text-xs rounded border border-fp-border bg-white hover:bg-slate-50">
                        {it.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="absolute top-3 right-3 z-[28] pointer-events-auto">
      {!open && (
        <button className="px-2 py-1 rounded-[var(--radius-sm)] border border-fp-border bg-white text-xs shadow-fp-1" onClick={()=> setOpen(true)}>Toolbar</button>
      )}
      {open && (
        <div className="rounded-[var(--radius-md)] border border-fp-border bg-white shadow-fp-1 p-2 w-[260px]">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-sm">Canvas</div>
            <button className="px-2 py-0.5 text-xs rounded border border-fp-border" onClick={()=> setOpen(false)}>Collapse</button>
          </div>
          <div className="space-y-2">
            {sections.map(sec => (
              <div key={sec.title}>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">{sec.title}</div>
                <div className="flex flex-wrap gap-1">
                  {sec.items.map(it => (
                    <button key={it.id} onClick={()=> handleClick(it.id)} className="px-2 py-1 text-xs rounded border border-fp-border bg-white hover:bg-slate-50">
                      {it.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


