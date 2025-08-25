"use client"
import React, { useEffect, useRef, useState } from 'react'
import { useSimStore } from '@/store/sim'

type Corner = 'TL'|'TR'|'BL'|'BR'|null

export default function ControlDock() {
  const sim = useSimStore()
  const [corner, setCorner] = useState<Corner>(null)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 16, y: 16 })
  const [pinned, setPinned] = useState<boolean>(true)
  const [headerOffset, setHeaderOffset] = useState<number>(16)
  const dragging = useRef<{ dx: number; dy: number } | null>(null)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('fp-dock')
      if (raw) {
        const v = JSON.parse(raw)
        setCorner(v.corner ?? 'BR')
        setPos({ x: v.x ?? 16, y: v.y ?? 16 })
        setPinned(v.pinned ?? true)
      } else {
        setCorner('BR')
        setPos({ x: 16, y: 16 })
        setPinned(true)
      }
    } catch {}
  }, [])
  useEffect(() => { try { localStorage.setItem('fp-dock', JSON.stringify({ corner, x: pos.x, y: pos.y, pinned })) } catch {} }, [corner, pos, pinned])

  useEffect(() => {
    const calc = () => {
      const el = document.querySelector('[data-builder-header]') as HTMLElement | null
      if (!el) { setHeaderOffset(16); return }
      const r = el.getBoundingClientRect()
      setHeaderOffset(Math.max(16, Math.round(r.bottom + 12)))
    }
    calc()
    window.addEventListener('resize', calc)
    window.addEventListener('scroll', calc, true)
    return () => {
      window.removeEventListener('resize', calc)
      window.removeEventListener('scroll', calc, true)
    }
  }, [])

  const startDrag = (e: React.MouseEvent) => {
    if (pinned) return
    dragging.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
    window.addEventListener('mousemove', onDrag as any)
    window.addEventListener('mouseup', endDrag as any)
  }
  const onDrag = (e: MouseEvent) => {
    if (!dragging.current) return
    const nx = Math.max(16, Math.min(window.innerWidth - 200, e.clientX - dragging.current.dx))
    const ny = Math.max(16, Math.min(window.innerHeight - 120, e.clientY - dragging.current.dy))
    setPos({ x: nx, y: ny })
  }
  const endDrag = () => {
    window.removeEventListener('mousemove', onDrag as any)
    window.removeEventListener('mouseup', endDrag as any)
    dragging.current = null
  }

  const style: React.CSSProperties = pinned && corner ? (
    { position: 'fixed', right: corner.includes('R') ? 16 : undefined, left: corner.includes('L') ? 16 : undefined, top: corner.includes('T') ? headerOffset : undefined, bottom: corner.includes('B') ? 16 : undefined }
  ) : { position: 'fixed', left: pos.x, top: pos.y }

  return (
    <div style={style} className="z-[30] select-none pointer-events-none">
      <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-fp-border bg-white shadow-fp-1 px-2 py-1 pointer-events-auto" onMouseDown={startDrag} role="toolbar" aria-label="Canvas controls">
        <button className="px-1 py-0.5 text-xs border border-fp-border rounded" title="Run" onClick={()=> { const btn = document.querySelector('[data-run]') as HTMLButtonElement | null; btn?.click?.() }}>▶</button>
        <button className="px-1 py-0.5 text-xs border border-fp-border rounded" title="Pause" onClick={()=> useSimStore.getState().pause?.()}>⏸</button>
        <span className="text-xs text-slate-600 pl-1 pr-0.5">Speed</span>
        <button className="px-1 py-0.5 text-xs border border-fp-border rounded" onClick={()=> sim.setSpeed(Math.max(0.25, sim.speed - 0.25))}>–</button>
        <span className="text-xs w-8 text-center">{sim.speed.toFixed(2)}x</span>
        <button className="px-1 py-0.5 text-xs border border-fp-border rounded" onClick={()=> sim.setSpeed(Math.min(3, sim.speed + 0.25))}>+</button>
        <button className="px-1 py-0.5 text-xs border border-fp-border rounded" title="Fit" onClick={()=> (window as any).flowCanvasApi?.fitView?.()}>⤢</button>
        <button className="px-1 py-0.5 text-xs border border-fp-border rounded" title="Zoom in" onClick={()=> (window as any).flowCanvasApi?.zoomIn?.()}>＋</button>
        <button className="px-1 py-0.5 text-xs border border-fp-border rounded" title="Zoom out" onClick={()=> (window as any).flowCanvasApi?.zoomOut?.()}>－</button>
        <button className="px-1 py-0.5 text-xs border border-fp-border rounded" title="Zen" onClick={()=> (window as any).panelApi?.toggleZen?.()}>Zen</button>
        <button className="px-1 py-0.5 text-xs border border-fp-border rounded" title={pinned?'Unpin':'Pin'} onClick={()=> setPinned(p=>!p)}>{pinned?'📌':'📍'}</button>
      </div>
    </div>
  )
}


