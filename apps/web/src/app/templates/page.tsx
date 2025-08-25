"use client"
import { useMemo, useState } from 'react'

type Tmpl = { id: string; name: string; category: string; difficulty: 'simple'|'advanced' }
const data: Tmpl[] = [
  { id: 't1', name: 'Lead form → CRM + Slack', category: 'Sales/CRM', difficulty: 'simple' },
  { id: 't2', name: 'New ticket triage (LLM)', category: 'Support', difficulty: 'advanced' },
  { id: 't3', name: 'Order → fulfillment + notify', category: 'E‑commerce', difficulty: 'simple' },
  { id: 't4', name: 'Blog → social fanout', category: 'Marketing', difficulty: 'simple' },
  { id: 't5', name: 'Anomaly detection → alert', category: 'Data/ETL', difficulty: 'advanced' },
  { id: 't6', name: 'Audio → transcribe → publish', category: 'Content/AI', difficulty: 'advanced' },
]

export default function TemplatesPage() {
  const [cat, setCat] = useState<string>('All')
  const [diff, setDiff] = useState<string>('All')
  const cats = useMemo(() => ['All', ...Array.from(new Set(data.map(d => d.category)))], [])
  const diffs = ['All', 'simple', 'advanced']
  const filtered = data.filter(t => (cat === 'All' || t.category === cat) && (diff === 'All' || t.difficulty === diff))
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Templates</h1>
      <div className="flex items-center gap-2">
        <select value={cat} onChange={(e)=>setCat(e.target.value)} className="border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 bg-fp-surface">
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={diff} onChange={(e)=>setDiff(e.target.value)} className="border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 bg-fp-surface">
          {diffs.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((t) => (
          <div key={t.id} className="rounded-[var(--radius-lg)] border border-fp-border bg-fp-surface p-4 shadow-fp-1">
            <div className="font-medium">{t.name}</div>
            <div className="text-sm text-slate-500">{t.category} • {t.difficulty}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

