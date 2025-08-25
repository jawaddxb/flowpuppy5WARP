"use client"
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useGraphStore } from '@/store/graph'

export default function FloatingInspector({ open, selectedNodeId, onClose, onSnapBack }: { open: boolean; selectedNodeId?: string; onClose: () => void; onSnapBack: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try { const raw = localStorage.getItem('fp-floating-inspector'); if (raw) return JSON.parse(raw) } catch {}
    return { x: 200, y: 120 }
  })
  const [width, setWidth] = useState<number>(() => {
    try { const w = Number(localStorage.getItem('fp-floating-inspector-w') || '0'); return w > 0 ? w : 300 } catch { return 300 }
  })
  const dragging = useRef<{ dx: number; dy: number } | null>(null)
  const resizing = useRef<{ startX: number; startW: number } | null>(null)

  const recalc = useCallback(() => {
    if (!selectedNodeId) return
    const el = document.querySelector(`.react-flow__node[data-id="${CSS.escape(selectedNodeId)}"]`) as HTMLElement | null
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ x: Math.min(window.innerWidth - 320, r.right + 12), y: Math.max(12, r.top) })
  }, [selectedNodeId])

  useEffect(() => {
    if (!open) return
    recalc()
    const on = () => recalc()
    window.addEventListener('resize', on)
    window.addEventListener('scroll', on, true)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('scroll', on, true)
    }
  }, [open, recalc])

  useEffect(() => { if (open) recalc() }, [open, selectedNodeId, recalc])

  // basic focus management & trap
  useEffect(() => {
    if (!open) return
    const el = containerRef.current
    if (!el) return
    const focusables = Array.from(el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter((n) => !n.hasAttribute('disabled'))
    const first = focusables[0] || el
    if (first && 'focus' in first) (first as HTMLElement).focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (focusables.length === 0) return
      const active = document.activeElement as HTMLElement | null
      const idx = active ? focusables.indexOf(active) : -1
      if (!e.shiftKey && (idx === -1 || idx === focusables.length - 1)) {
        e.preventDefault()
        const f = focusables[0]
        if (f) f.focus()
      } else if (e.shiftKey && (idx <= 0)) {
        e.preventDefault()
        const f = focusables[focusables.length - 1]
        if (f) f.focus()
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !selectedNodeId) return null

  const startDrag = (e: React.MouseEvent) => {
    dragging.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
    window.addEventListener('mousemove', onDrag as any)
    window.addEventListener('mouseup', endDrag as any)
  }
  const onDrag = (e: MouseEvent) => {
    if (!dragging.current) return
    const nx = e.clientX - dragging.current.dx
    const ny = e.clientY - dragging.current.dy
    setPos({ x: nx, y: ny })
  }
  const endDrag = () => {
    window.removeEventListener('mousemove', onDrag as any)
    window.removeEventListener('mouseup', endDrag as any)
    dragging.current = null
    // snap-back to right drawer if near right edge
    if (window.innerWidth - pos.x < 80) onSnapBack()
    try { localStorage.setItem('fp-floating-inspector', JSON.stringify(pos)) } catch {}
  }

  const onResizeMove = (e: MouseEvent) => {
    if (!resizing.current) return
    const dx = e.clientX - resizing.current.startX
    const next = Math.max(240, Math.min(640, Math.round(resizing.current.startW + dx)))
    setWidth(next)
  }
  const endResize = () => {
    window.removeEventListener('mousemove', onResizeMove)
    window.removeEventListener('mouseup', endResize)
    if (width) try { localStorage.setItem('fp-floating-inspector-w', String(width)) } catch {}
    resizing.current = null
  }
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizing.current = { startX: e.clientX, startW: width }
    window.addEventListener('mousemove', onResizeMove)
    window.addEventListener('mouseup', endResize)
  }

  const node = (useGraphStore.getState().nodes as any[]).find((n:any)=> n.id===selectedNodeId)

  return (
    <div ref={containerRef} className="fixed z-[24]" role="dialog" aria-modal="true" style={{ left: pos.x, top: pos.y, width }} onKeyDown={(e)=>{ e.stopPropagation() }}>
      <div className="rounded-[var(--radius-md)] border border-fp-border bg-white shadow-fp-1">
        <div className="flex items-center justify-between px-2 py-1 border-b border-fp-border cursor-move" onMouseDown={startDrag}>
          <div className="text-xs font-medium">Inspector (Detached)</div>
          <div className="flex items-center gap-1">
            <button className="text-xs border border-fp-border rounded px-2 py-0.5" onClick={onSnapBack}>Snap back</button>
            <button className="text-xs border border-fp-border rounded px-2 py-0.5" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="p-2 text-sm">
          <div className="mb-2">
            <label className="block text-xs text-slate-500 mb-1">Node label</label>
            <input className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-xs" value={node?.data?.label || ''} onChange={(e)=> useGraphStore.getState().updateNode(selectedNodeId, { label: e.target.value })} />
          </div>
          <div className="text-[11px] text-slate-500">Type: {node?.type}</div>
        </div>
        <div className="absolute bottom-1 right-1 w-3 h-3 cursor-se-resize" onMouseDown={startResize} />
      </div>
    </div>
  )
}


