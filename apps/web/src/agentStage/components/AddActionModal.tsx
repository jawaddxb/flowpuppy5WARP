"use client"
import React from 'react'
import { useGraph } from '@/agentStage/graph/store'

const TABS = ['Top', 'Apps', 'Chat', 'AI', 'Logic', 'Scrapers', 'By FlowPuppy'] as const
type TabId = typeof TABS[number]

type Item = { id: string; label: string; sub?: string; kind: 'Logic'|'AI'|'Apps'|'Chat'|'Scrapers'|'By FlowPuppy'; icon?: React.ReactNode }

const CATALOG: Record<TabId, Item[]> = {
  'Top': [
    { id: 'logic:condition', label: 'Condition', sub: 'Route by condition', kind: 'Logic', icon: '⚖️' },
    { id: 'ai:agent-step', label: 'Agent Step', sub: 'Use LLM step', kind: 'AI', icon: '🤖' },
    { id: 'apps:gmail', label: 'Gmail', sub: 'Send mail', kind: 'Apps', icon: '✉️' },
    { id: 'flow:http', label: 'HTTP', sub: 'Call API', kind: 'By FlowPuppy', icon: '🌐' },
  ],
  'Apps': [
    { id: 'apps:gmail', label: 'Gmail', sub: 'Send mail', kind: 'Apps', icon: '✉️' },
    { id: 'apps:sheets', label: 'Google Sheets', sub: 'Append rows', kind: 'Apps', icon: '📊' },
    { id: 'apps:drive', label: 'Google Drive', sub: 'Upload file', kind: 'Apps', icon: '🗂️' },
    { id: 'apps:calendar', label: 'Google Calendar', sub: 'Create event', kind: 'Apps', icon: '📅' },
    { id: 'apps:hubspot', label: 'HubSpot', sub: 'CRM action', kind: 'Apps', icon: '📇' },
  ],
  'Chat': [
    { id: 'chat:slack', label: 'Slack', sub: 'Post message', kind: 'Chat', icon: '💬' },
    { id: 'chat:telegram', label: 'Telegram', sub: 'Send message', kind: 'Chat', icon: '📨' },
    { id: 'chat:outlook', label: 'Outlook', sub: 'Send email', kind: 'Chat', icon: '📧' },
  ],
  'AI': [
    { id: 'ai:agent-step', label: 'Agent Step', sub: 'Use LLM step', kind: 'AI', icon: '🤖' },
    { id: 'ai:kbase', label: 'Knowledge Base', sub: 'Grounding', kind: 'AI', icon: '📚' },
    { id: 'ai:kbase-website', label: 'Search knowledge base', sub: 'Website', kind: 'AI', icon: '🔎' },
  ],
  'Logic': [
    { id: 'logic:condition', label: 'Condition', sub: 'Route by condition', kind: 'Logic', icon: '⚖️' },
    { id: 'logic:loop', label: 'Enter Loop', sub: 'Process items in parallel', kind: 'Logic', icon: '🔁' },
  ],
  'Scrapers': [
    { id: 'scrape:web', label: 'Web Scraper', sub: 'Extract data', kind: 'Scrapers', icon: '🕸️' },
  ],
  'By FlowPuppy': [
    { id: 'flow:http', label: 'HTTP', sub: 'Call API', kind: 'By FlowPuppy', icon: '🌐' },
    { id: 'flow:code', label: 'Run Code', sub: 'Custom logic', kind: 'By FlowPuppy', icon: '🧩' },
    { id: 'flow:computer', label: 'Computer', sub: 'Local actions', kind: 'By FlowPuppy', icon: '💻' },
    { id: 'flow:phone', label: 'Phone', sub: 'Call/SMS', kind: 'By FlowPuppy', icon: '📱' },
    { id: 'flow:utils', label: 'FlowPuppy Utilities', sub: 'House tools', kind: 'By FlowPuppy', icon: '🧰' },
  ],
}

export default function AddActionModal() {
  const { anchor, addNodeAndWire, closeAdd } = useGraph(s=>({ anchor: s.anchor, addNodeAndWire: s.addNodeAndWire, closeAdd: s.closeAdd }))
  const open = !!anchor
  const [tab, setTab] = React.useState<TabId>(()=>{ try { return (localStorage.getItem('fp-addaction-tab') as TabId) || 'Top' } catch { return 'Top' } })
  const [query, setQuery] = React.useState('')
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [dynamicTemplates, setDynamicTemplates] = React.useState<Array<{ id: string; label: string; sub?: string; kind: Item['kind'] }>>([])
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/nodes/templates')
        const data = await res.json().catch(()=>({ templates: [] }))
        if (!cancelled && Array.isArray(data?.templates)) {
          const mapped = (data.templates as Array<any>).map((t) => ({
            id: `tpl:${String(t.type||'unknown')}`,
            label: String(t.label || t.type || 'Template'),
            sub: 'Provider Template',
            // Treat provider templates as Apps for insertion semantics
            kind: 'Apps' as const,
          }))
          setDynamicTemplates(mapped)
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])
  // Keep hooks stable; do not early-return to avoid hook order mismatches under rapid state changes
  const onClose = React.useCallback(() => {
    try { (useGraph as any).getState?.().closeAdd() } catch {}
    try { closeAdd() } catch {}
  }, [closeAdd])
  const pick = (kind: any, label: string) => { addNodeAndWire(kind, label); onClose() }
  const anchored = !!anchor?.ui
  const style: React.CSSProperties = anchored ? { position: 'fixed', left: Math.max(16, (anchor!.ui!.x - 420)), top: Math.max(16, (anchor!.ui!.y + 12)) } : {}
  // Build a master catalog across tabs + dynamic templates
  const ALL_ITEMS: Item[] = React.useMemo(() => {
    const merged: Item[] = []
    for (const t of (Object.keys(CATALOG) as Array<TabId>)) merged.push(...CATALOG[t])
    merged.push(...dynamicTemplates)
    return merged
  }, [dynamicTemplates])

  // When searching, search across all items; otherwise show current tab items
  const itemsAll = query.trim() ? ALL_ITEMS : (CATALOG[tab] || [])
  const items = itemsAll.filter(it => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return it.label.toLowerCase().includes(q) || (it.sub||'').toLowerCase().includes(q)
  })
  React.useEffect(()=>{ setActiveIndex(0) }, [tab, query])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(items.length-1, i+1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(0, i-1)) }
    else if (e.key === 'Enter') {
      e.preventDefault(); const it = items[activeIndex]; if (it) pick(it.kind, it.label)
    } else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }
  // After hooks are declared, unmount entirely when closed (keeps hook order stable)
  if (!open) return null
  return (
    <div className={`fixed inset-0 z-50 bg-black/30`} onClick={onClose}>
      <div className={`flex ${anchored ? '' : 'items-start justify-center pt-16'}`}>
        <div role="dialog" aria-modal className="w-[840px] max-w-[92vw] rounded-[12px] border border-[#e2e8f0] bg-white shadow-[0_8px_28px_rgba(2,6,23,.15)]" onClick={(e)=> e.stopPropagation()} style={style} onKeyDown={onKeyDown}>
          <div className="p-4 border-b border-[#e2e8f0] flex items-start justify-between">
            <div>
              <div className="text-lg font-semibold">Add Action</div>
              <div className="text-[12px] text-slate-600">Select and we will auto-wire it in the flow.</div>
            </div>
            <button
              aria-label="Close add action"
              className="rounded-md border border-[#e2e8f0] px-2 py-1 text-sm hover:bg-slate-50"
              onClick={(e)=> { e.stopPropagation(); onClose() }}
            >Close</button>
          </div>
          <div className="px-4 pt-3 flex items-center gap-2 text-sm">
            {TABS.map(t => (
              <button key={t} className={`px-2 py-1 rounded ${tab===t?'bg-slate-100':'hover:bg-slate-50'}`} onClick={()=> { setTab(t); try { localStorage.setItem('fp-addaction-tab', t) } catch {} }}>{t}</button>
            ))}
          </div>
          <div className="p-4">
            <input value={query} onChange={(e)=> setQuery(e.target.value)} className="mb-3 w-full rounded border border-[#e2e8f0] px-3 py-2 text-sm" placeholder="Search actions…" />
            <div className="grid grid-cols-2 gap-2">
              {items.map((it, i)=> (
                <button key={it.id} className={`text-left rounded border border-[#e2e8f0] px-3 py-2 hover:bg-slate-50 ${i===activeIndex? 'ring-2 ring-slate-300' : ''}`} onClick={()=> pick(it.kind, it.label)}>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 flex items-center justify-center">{it.icon || '⚙️'}</div>
                    <div className="font-medium">{it.label}</div>
                  </div>
                  {it.sub && <div className="text-[11px] text-slate-600">{it.sub}</div>}
                </button>
              ))}
              {items.length===0 && <div className="text-[12px] text-slate-500 col-span-2">No matches</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



