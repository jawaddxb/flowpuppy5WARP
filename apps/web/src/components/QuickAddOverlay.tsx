"use client"
import React, { useMemo, useState } from 'react'

type PaletteItem = { type: string; label: string; defaults?: Record<string, any> }
type PaletteSection = { title: string; items: PaletteItem[] }

const SECTIONS: PaletteSection[] = [
  { title: 'Core', items: [
    { type: 'http', label: 'HTTP Request', defaults: { url: 'https://api.example.com' } },
    { type: 'transform', label: 'Transform', defaults: { script: '// return input' } },
    { type: 'delay', label: 'Delay', defaults: { ms: 1000 } },
    { type: 'log', label: 'Log', defaults: { level: 'info', message: 'Hello' } },
  ]},
  { title: 'Logic', items: [
    { type: 'switch', label: 'Switch', defaults: { cases: ['A','B'] } },
    { type: 'parallel', label: 'Parallel', defaults: { branches: 2 } },
    { type: 'join', label: 'Join', defaults: { strategy: 'all' } },
    { type: 'trycatch', label: 'Try/Catch' },
    { type: 'loop', label: 'Loop', defaults: { iterations: 3 } },
    { type: 'subflow', label: 'Subflow', defaults: { subflowId: '' } },
  ]},
  { title: 'Integrations', items: [
    { type: 'email', label: 'Email', defaults: { to: '', subject: '' } },
    { type: 'slack', label: 'Slack', defaults: { channel: '#general', message: 'Hello' } },
    { type: 'notion', label: 'Notion', defaults: { databaseId: '' } },
    { type: 'sheets', label: 'Google Sheets', defaults: { spreadsheetId: '' } },
    { type: 'airtable', label: 'Airtable', defaults: { baseId: '' } },
    { type: 'discord', label: 'Discord', defaults: { channelId: '' } },
  ]},
  { title: 'Storage', items: [
    { type: 'kv', label: 'KV Store', defaults: { key: 'key', value: 'value' } },
    { type: 'cache', label: 'Cache', defaults: { key: 'key', ttl: 60 } },
    { type: 'secret', label: 'Secrets Ref', defaults: { name: 'API_KEY' } },
    { type: 'metrics', label: 'Metrics Counter', defaults: { name: 'counter', amount: 1 } },
  ]},
]

export default function QuickAddOverlay({ open, onClose, onChoose }: { open: boolean; onClose: () => void; onChoose: (item: PaletteItem) => void }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    if (!query.trim()) return SECTIONS
    const q = query.toLowerCase()
    return SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter((i) => i.label.toLowerCase().includes(q) || i.type.includes(q)),
    })).filter((s) => s.items.length > 0)
  }, [query])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-20 bg-black/30" onClick={onClose}>
      <div className="w-[720px] rounded-[var(--radius-lg)] border border-fp-border bg-white shadow-fp-1 p-4" onClick={(e)=> e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Quick Add</div>
          <button className="text-xs border border-fp-border rounded px-2 py-0.5" onClick={onClose}>Close</button>
        </div>
        <input autoFocus className="w-full mb-3 border border-fp-border rounded-[var(--radius-sm)] px-2 py-2 text-sm" placeholder="Search nodes…" value={query} onChange={(e)=> setQuery(e.target.value)} />
        <div className="space-y-4 max-h-[60vh] overflow-auto">
          {filtered.map(section => (
            <div key={section.title}>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">{section.title}</div>
              <div className="grid grid-cols-3 gap-2">
                {section.items.map(item => (
                  <button key={item.type+item.label} onClick={()=> onChoose(item)} className="flex items-start gap-2 px-3 py-2 rounded-[var(--radius-sm)] border border-fp-border bg-white hover:bg-slate-50 text-left">
                    <div className="w-8 h-8 rounded-[10px] bg-fp-primary/10 flex items-center justify-center text-[12px]">{item.label.substring(0,1)}</div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm leading-tight break-words">{item.label}</div>
                      <div className="text-[11px] text-slate-500 break-words">{item.type}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}



