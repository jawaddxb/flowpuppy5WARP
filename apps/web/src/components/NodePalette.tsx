"use client"
import React, { useEffect, useMemo, useState } from 'react'

type PaletteItem = {
  type: string
  label: string
  defaults?: Record<string, any>
}

type PaletteSection = {
  title: string
  items: PaletteItem[]
}

const STATIC_SECTIONS: PaletteSection[] = [
  {
    title: 'Triggers',
    items: [
      { type: 'input', label: 'Webhook', defaults: { path: '/hook' } },
      { type: 'schedule', label: 'Schedule', defaults: { cron: '0 * * * *' } },
      { type: 'form', label: 'Form Submit', defaults: { formId: 'contact' } },
    ],
  },
  {
    title: 'Core',
    items: [
      { type: 'http', label: 'HTTP Request', defaults: { url: 'https://api.example.com' } },
      { type: 'transform', label: 'Transform', defaults: { script: '// return input' } },
      { type: 'delay', label: 'Delay', defaults: { ms: 1000 } },
      { type: 'parallel', label: 'Parallel', defaults: { branches: 2 } },
      { type: 'join', label: 'Join', defaults: { strategy: 'all' } },
      { type: 'switch', label: 'Switch', defaults: { cases: ['A','B'] } },
      { type: 'trycatch', label: 'Try/Catch' },
      { type: 'loop', label: 'Loop', defaults: { iterations: 3 } },
      { type: 'subflow', label: 'Subflow', defaults: { subflowId: '' } },
      { type: 'log', label: 'Log', defaults: { level: 'info', message: 'Hello' } },
      { type: 'assert', label: 'Assert', defaults: { expression: 'true' } },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { type: 'email', label: 'Email', defaults: { to: '', subject: '' } },
      { type: 'slack', label: 'Slack', defaults: { channel: '#general', message: 'Hello' } },
      { type: 'notion', label: 'Notion', defaults: { databaseId: '' } },
      { type: 'sheets', label: 'Google Sheets', defaults: { spreadsheetId: '' } },
      { type: 'airtable', label: 'Airtable', defaults: { baseId: '' } },
      { type: 'discord', label: 'Discord', defaults: { channelId: '' } },
      { type: 'stripe', label: 'Stripe', defaults: { operation: 'charge' } },
      { type: 'supabase', label: 'Supabase', defaults: { table: '' } },
    ],
  },
  {
    title: 'Storage',
    items: [
      { type: 'kv', label: 'KV Store', defaults: { key: 'key', value: 'value' } },
      { type: 'cache', label: 'Cache', defaults: { key: 'key', ttl: 60 } },
      { type: 'secret', label: 'Secrets Ref', defaults: { name: 'API_KEY' } },
      { type: 'metrics', label: 'Metrics Counter', defaults: { name: 'counter', amount: 1 } },
    ],
  },
]

export default function NodePalette() {
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<Record<string, boolean>>(()=>{
    if (typeof window==='undefined') return {}
    try { return JSON.parse(localStorage.getItem('fp-fav-nodes')||'{}') } catch { return {} }
  })
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const [showFavOnly, setShowFavOnly] = useState<boolean>(()=>{
    if (typeof window==='undefined') return false
    try { return localStorage.getItem('fp-fav-only') === '1' } catch { return false }
  })
  function toggleFav(type: string) {
    setFavorites((prev)=>{
      const next = { ...prev, [type]: !prev[type] }
      try { localStorage.setItem('fp-fav-nodes', JSON.stringify(next)) } catch {}
      return next
    })
  }
  const [dynamicIntegrations, setDynamicIntegrations] = useState<PaletteItem[]>([])
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/nodes/templates')
        const data = await res.json()
        const items: PaletteItem[] = (data.templates || []).map((t: any) => ({ type: t.type, label: t.label, defaults: t.defaults }))
        setDynamicIntegrations(items)
      } catch {}
    })()
  }, [])

  const sections = useMemo(() => {
    const base = [...STATIC_SECTIONS]
    if (dynamicIntegrations.length) {
      const dyn: PaletteSection = { title: 'Provider Templates', items: dynamicIntegrations }
      base.push(dyn)
    }
    return base
  }, [dynamicIntegrations])

  const filtered = useMemo(() => {
    if (!query.trim()) return sections
    const q = query.toLowerCase()
    return sections.map((s) => ({
      ...s,
      items: s.items.filter((i) => i.label.toLowerCase().includes(q) || i.type.includes(q)),
    })).filter((s) => s.items.length > 0)
  }, [query, sections])

  const flatItems = useMemo(() => {
    const arr: Array<{ key: string; item: PaletteItem }> = []
    for (const s of filtered) {
      for (const it of s.items) arr.push({ key: `${s.title}-${it.type}-${it.label}`, item: it })
    }
    return arr
  }, [filtered])

  const sectionsWithFavorites = useMemo(() => {
    const favSet = new Set(Object.entries(favorites).filter(([_,v])=>v).map(([k])=>k))
    const result: PaletteSection[] = []
    const favItems: PaletteItem[] = []
    for (const s of filtered) {
      for (const it of s.items) if (favSet.has(it.type)) favItems.push(it)
    }
    if (favItems.length > 0) {
      result.push({ title: 'Favorites', items: favItems })
    }
    for (const s of filtered) {
      const items = s.items.filter(it => !favSet.has(it.type))
      if (items.length > 0) result.push({ title: s.title, items })
    }
    if (showFavOnly) return result.filter(sec => sec.title === 'Favorites')
    return result
  }, [filtered, favorites, showFavOnly])

  function activate(delta: number) {
    setActiveIndex((idx) => {
      if (flatItems.length === 0) return 0
      const next = (idx + delta + flatItems.length) % flatItems.length
      return next
    })
  }

  function quickAddCurrent() {
    const entry = flatItems[activeIndex]
    if (!entry) return
    try { (window as any).flowCanvasApi?.quickAdd?.(entry.item) } catch {}
  }

  function jumpSection(delta: number) {
    // build section offsets from sectionsWithFavorites
    const offsets: number[] = []
    let acc = 0
    for (const s of sectionsWithFavorites) {
      offsets.push(acc)
      acc += s.items.length
    }
    if (offsets.length === 0) return
    // find current section
    let curSec = 0
    for (let i=0;i<offsets.length;i++) {
      const startVal = offsets[i] ?? 0
      const endVal = i===offsets.length-1 ? acc-1 : ((offsets[i+1] ?? acc) - 1)
      if (activeIndex >= startVal && activeIndex <= endVal) { curSec = i; break }
    }
    let nextSec = curSec + delta
    if (nextSec < 0) nextSec = 0
    if (nextSec > offsets.length -1) nextSec = offsets.length -1
    setActiveIndex(offsets[nextSec] || 0)
  }

  function onDragStart(e: React.DragEvent, item: PaletteItem) {
    e.dataTransfer.setData('application/reactflow', JSON.stringify(item))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-fp-border bg-fp-surface min-h-[70vh] p-4 shadow-fp-1"
      role="region"
      aria-label="Node palette"
      tabIndex={0}
      onKeyDown={(e)=>{
        if (e.key === 'ArrowDown') { e.preventDefault(); activate(1) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); activate(-1) }
        else if (e.key === 'ArrowRight') { e.preventDefault(); jumpSection(1) }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); jumpSection(-1) }
        else if (e.key === 'Home') { e.preventDefault(); setActiveIndex(0) }
        else if (e.key === 'End') { e.preventDefault(); if (flatItems.length) setActiveIndex(flatItems.length-1) }
        else if (e.key === 'Enter') { e.preventDefault(); quickAddCurrent() }
        else if (e.key.toLowerCase() === 'f') { e.preventDefault(); const cur = flatItems[activeIndex]; if (cur) toggleFav(cur.item.type) }
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium" aria-hidden>Nodes</div>
      </div>
      <input
        className="w-full mb-3 border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-sm"
        placeholder="Search nodes"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="flex items-center justify-between mb-2">
        <button className={`text-xs px-2 py-1 rounded border ${showFavOnly ? 'border-fp-primary text-fp-primary' : 'border-fp-border text-slate-600'}`} onClick={()=>{ const v=!showFavOnly; setShowFavOnly(v); try{localStorage.setItem('fp-fav-only', v?'1':'0')}catch{}}}>{showFavOnly?'Showing Favorites':'Show Favorites Only'}</button>
      </div>
      <div className="space-y-4">
        {sectionsWithFavorites.map((section) => (
          <div key={section.title}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wide text-slate-500">{section.title}</div>
            </div>
            <div className="grid grid-cols-2 gap-2" role="list">
              {section.items.map((item) => (
                <div key={`${section.title}-${item.type}-${item.label}`} className="group relative" role="listitem">
                  <div
                    className={`flex items-start gap-2 px-2 py-2 rounded-[var(--radius-sm)] border text-xs cursor-grab bg-white hover:bg-slate-50 shadow-fp-1 ${flatItems[activeIndex]?.key===`${section.title}-${item.type}-${item.label}` ? 'border-fp-primary ring-1 ring-fp-primary' : 'border-fp-border'}`}
                    draggable
                    onDragStart={(e) => onDragStart(e, item)}
                    title={item.type}
                    aria-label={`Node ${item.label}`}
                  >
                    <div className="w-7 h-7 rounded-[10px] bg-fp-primary/10 flex items-center justify-center text-[12px]">{item.label.substring(0,1)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.label}</div>
                      <div className="text-[11px] text-slate-500 truncate">{item.type}</div>
                    </div>
                    <button className={`text-[10px] px-1 py-0.5 rounded border ${favorites[item.type] ? 'border-fp-primary text-fp-primary' : 'border-fp-border text-slate-500'} opacity-0 group-hover:opacity-100`} onClick={(e)=>{ e.stopPropagation(); e.preventDefault(); toggleFav(item.type) }}>{favorites[item.type] ? '★' : '☆'}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


