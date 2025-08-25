"use client"
import { useState } from 'react'

type ColumnKey = 'trigger'|'steps'|'output'

export default function SimpleModePage() {
  const [columns, setColumns] = useState<Record<ColumnKey, string[]>>({
    trigger: ['Webhook trigger'],
    steps: ['HTTP call', 'Transform data'],
    output: ['Send email'],
  })
  // persist to localStorage
  useState(() => {
    try {
      const saved = window.localStorage.getItem('fp-simple')
      if (saved) {
        const parsed = JSON.parse(saved) as Record<ColumnKey,string[]>
        setColumns(parsed)
      }
    } catch {}
    return undefined
  })

  function onDragStart(e: React.DragEvent, from: ColumnKey, idx: number) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ from, idx }))
  }
  function onDrop(e: React.DragEvent, to: ColumnKey) {
    const data = e.dataTransfer.getData('text/plain')
    if (!data) return
    const { from, idx } = JSON.parse(data) as { from: ColumnKey; idx: number }
    if (from === to) return
    setColumns((prev) => {
      const moved = prev[from][idx]
      const src = prev[from].filter((_, i) => i !== idx)
      const dst = [...prev[to], moved]
      const next = { ...prev, [from]: src, [to]: dst }
      try { window.localStorage.setItem('fp-simple', JSON.stringify(next)) } catch {}
      return next
    })
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {(['trigger','steps','output'] as ColumnKey[]).map((key) => (
        <Column key={key} title={key === 'trigger' ? 'Trigger' : key === 'steps' ? 'Steps' : 'Output'}
          items={columns[key]}
          onDragStart={(e, idx) => onDragStart(e, key, idx)}
          onDrop={(e) => onDrop(e, key)}
        />
      ))}
    </div>
  )
}

function Column({ title, items, onDrop, onDragStart }: { title: string; items: string[]; onDrop: (e: React.DragEvent) => void; onDragStart: (e: React.DragEvent, idx: number) => void }) {
  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className="rounded-[var(--radius-lg)] border border-fp-border bg-fp-surface p-4 min-h-[60vh] shadow-fp-1">
      <div className="font-medium mb-2">{title}</div>
      {items.map((label, i) => (
        <Card key={label + i} label={label} draggable onDragStart={(e) => onDragStart(e, i)} />
      ))}
    </div>
  )
}

function Card({ label, draggable, onDragStart }: { label: string; draggable?: boolean; onDragStart?: (e: React.DragEvent) => void }) {
  return (
    <div draggable={draggable} onDragStart={onDragStart} className="rounded-[var(--radius-md)] border border-fp-border p-3 mb-2 bg-slate-50 cursor-move">
      {label}
    </div>
  )
}

