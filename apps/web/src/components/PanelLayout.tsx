"use client"
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { PanelGroup, Panel, PanelResizeHandle, type ImperativePanelHandle, type ImperativePanelGroupHandle } from 'react-resizable-panels'

type PanelLayoutProps = {
  left: React.ReactNode
  right: React.ReactNode
  children: React.ReactNode
}

export default function PanelLayout({ left, right, children }: PanelLayoutProps) {
  const [zen, setZen] = useState<boolean>(false)
  const [sizes, setSizes] = useState<number[]>([20, 56, 24])
  const hydrated = useRef(false)
  const leftRef = useRef<ImperativePanelHandle | null>(null)
  const rightRef = useRef<ImperativePanelHandle | null>(null)
  const groupRef = useRef<ImperativePanelGroupHandle | null>(null)
  const lastLeft = useRef<number>(20)
  const lastRight = useRef<number>(24)
  const lastLayout = useRef<number[] | null>(null)
  const savedBeforeZen = useRef<boolean>(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fp-panel-sizes')
      if (saved) setSizes(JSON.parse(saved))
      const z = localStorage.getItem('fp-zen')
      if (z !== null) setZen(z === '1')
    } catch {}
    hydrated.current = true
  }, [])

  useEffect(() => { if (hydrated.current) try { localStorage.setItem('fp-panel-sizes', JSON.stringify(sizes)) } catch {} }, [sizes])
  useEffect(() => { try { localStorage.setItem('fp-zen', zen ? '1' : '0') } catch {} }, [zen])

  // Keyboard: toggle zen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'z') { e.preventDefault(); setZen(v=>!v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Expose simple API for presets
  useEffect(() => {
    ;(window as any).panelApi = {
      setLeft: (pct: number) => leftRef.current?.resize(Math.max(4, Math.min(50, pct))),
      setRight: (pct: number) => rightRef.current?.resize(Math.max(4, Math.min(60, pct))),
      collapseLeft: () => { if (leftRef.current) { lastLeft.current = sizes[0] ?? 20; leftRef.current.collapse() } },
      expandLeft: () => { if (leftRef.current) { leftRef.current.resize(lastLeft.current || 20) } },
      collapseRight: () => { if (rightRef.current) { lastRight.current = sizes[2] ?? 24; rightRef.current.collapse() } },
      expandRight: () => { if (rightRef.current) { rightRef.current.resize(lastRight.current || 24) } },
      setZen: (v: boolean) => setZen(v),
      toggleZen: () => setZen((z)=> !z),
      presets: {
        left: { narrow: 16, comfort: 22, wide: 28 },
        right: { narrow: 20, comfort: 28, wide: 36 },
      },
    }
  }, [])

  // Apply zen by collapsing/expanding side panels
  useEffect(() => {
    if (!leftRef.current || !rightRef.current) return
    if (zen) {
      try { document.body.dataset['zen'] = '1' } catch {}
      if (!savedBeforeZen.current) {
        lastLeft.current = sizes[0] ?? lastLeft.current
        lastRight.current = sizes[2] ?? lastRight.current
        lastLayout.current = Array.isArray(sizes) ? [...sizes] : [20, 56, 24]
        savedBeforeZen.current = true
      }
      leftRef.current.collapse()
      rightRef.current.collapse()
    } else {
      try { delete document.body.dataset['zen'] } catch {}
      // Expand both first, then restore the full layout to previous sizes
      try { leftRef.current.expand?.() } catch {}
      try { rightRef.current.expand?.() } catch {}
      const layout = lastLayout.current || [lastLeft.current || 20, sizes[1] || 56, lastRight.current || 24]
      requestAnimationFrame(() => {
        try { groupRef.current?.setLayout?.(layout) } catch {}
        if (lastLeft.current) leftRef.current?.resize(lastLeft.current)
        if (lastRight.current) rightRef.current?.resize(lastRight.current)
      })
      savedBeforeZen.current = false
    }
  }, [zen])

  const handleClass = useMemo(() => 'w-2 bg-transparent hover:bg-slate-200 transition-colors cursor-col-resize relative', [])
  const handleGrip = useMemo(() => <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center"><div className="h-6 w-1 rounded bg-slate-300" /></div>, [])

  return (
    <div className="relative w-full h-full">
      <PanelGroup ref={groupRef} direction="horizontal" className="w-full h-full" onLayout={(next)=>{ setSizes(next) }}>
        <Panel ref={leftRef} defaultSize={sizes[0]} minSize={4} maxSize={50} order={1} collapsible collapsedSize={2} className="relative z-10 border-r border-fp-border bg-fp-surface">
          <div className="h-10 flex items-center justify-between px-2 border-b border-fp-border">
            <div className="text-xs text-slate-600">Nodes</div>
            <div className="flex items-center gap-1">
              <button title="Collapse" className="text-xs border border-fp-border rounded px-2 py-0.5" onClick={()=> (window as any).panelApi?.collapseLeft?.()}>‹</button>
              <button title="Preset" className="text-xs border border-fp-border rounded px-2 py-0.5" onClick={()=> (window as any).panelApi?.setLeft?.((window as any).panelApi?.presets?.left?.comfort || 22)}>⇆</button>
              <button title="Expand" className="text-xs border border-fp-border rounded px-2 py-0.5" onClick={()=> (window as any).panelApi?.expandLeft?.()}>›</button>
            </div>
          </div>
          <div className="h-[calc(100%-40px)] overflow-auto pr-1 text-[12px] leading-snug">{left}</div>
        </Panel>
        <PanelResizeHandle className={handleClass}>{handleGrip}</PanelResizeHandle>
        <Panel defaultSize={sizes[1]} minSize={10} order={2} className="relative z-0 bg-white overflow-hidden">
          <div className="absolute top-2 right-2 z-20 flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1 bg-white/90 backdrop-blur rounded border border-fp-border px-2 py-1 shadow-fp-1">
              <span>View</span>
              <select className="text-xs bg-transparent" onChange={(e)=>{ try { (window as any).flowCanvasApi?.setViewMode?.(e.target.value) } catch {} }}>
                <option value="swimlane">Swimlane</option>
                <option value="story">Story</option>
                <option value="graph">Graph</option>
              </select>
            </label>
          </div>
          <div className={`w-full h-full ${zen ? '' : ''}`}>{children}</div>
        </Panel>
        <PanelResizeHandle className={handleClass}>{handleGrip}</PanelResizeHandle>
        <Panel ref={rightRef} defaultSize={sizes[2]} minSize={4} maxSize={60} order={3} collapsible collapsedSize={2} className="relative z-10 border-l border-fp-border bg-fp-surface">
          <div className="h-10 flex items-center justify-between px-2 border-b border-fp-border">
            <div className="text-xs text-slate-600">Inspector</div>
            <div className="flex items-center gap-1">
              <button title="Collapse" className="text-xs border border-fp-border rounded px-2 py-0.5" onClick={()=> (window as any).panelApi?.collapseRight?.()}>›</button>
              <button title="Preset" className="text-xs border border-fp-border rounded px-2 py-0.5" onClick={()=> (window as any).panelApi?.setRight?.((window as any).panelApi?.presets?.right?.comfort || 28)}>⇆</button>
              <button title="Expand" className="text-xs border border-fp-border rounded px-2 py-0.5" onClick={()=> (window as any).panelApi?.expandRight?.()}>‹</button>
            </div>
          </div>
          <div className="h-[calc(100%-40px)] overflow-auto">{right}</div>
        </Panel>
      </PanelGroup>

      <div className="absolute top-2 right-1/2 translate-x-1/2 z-[21] pointer-events-none">
        <button className="px-2 py-1 text-xs rounded border border-fp-border bg-white shadow-fp-1 pointer-events-auto" onClick={()=> setZen(v=>!v)}>{zen ? 'Exit Zen' : 'Zen'}</button>
      </div>
    </div>
  )
}


