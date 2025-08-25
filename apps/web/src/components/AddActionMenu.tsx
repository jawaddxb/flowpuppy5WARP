"use client"
import React from 'react'

export type CatalogItem = { id: string; icon?: React.ReactNode; title: string; subtitle?: string }
export type CatalogGroup = { id: string; title: string; items: CatalogItem[] }

export default function AddActionMenu({ groups, onSelect }: { groups: CatalogGroup[]; onSelect?: (id: string)=>void }) {
  const [tab, setTab] = React.useState(groups[0]?.id || 'top')
  const active = (groups.find(g=> g.id===tab) || groups[0]) as CatalogGroup
  return (
    <div className="w-[720px] max-w-[90vw] rounded-[12px] border border-fp-border bg-white shadow-[0_8px_28px_rgba(2,6,23,.15)]">
      <div className="p-3 border-b border-fp-border">
        <div className="text-lg font-medium">Add Action</div>
        <div className="text-sm text-slate-600">Select an action to add to your agent.</div>
      </div>
      <div className="px-3 pt-2 flex items-center gap-2 text-sm">
        {groups.map((g)=> (
          <button key={g.id} className={`px-2 py-1 rounded ${tab===g.id?'bg-slate-100':'hover:bg-slate-50'}`} onClick={()=> setTab(g.id)}>{g.title}</button>
        ))}
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {active.items.map((it)=> (
          <button key={it.id} className="text-left rounded border border-fp-border px-3 py-2 hover:bg-slate-50" onClick={()=> onSelect?.(it.id)}>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 flex items-center justify-center">{it.icon || <span>⚙️</span>}</div>
              <div className="font-medium">{it.title}</div>
            </div>
            {it.subtitle && <div className="text-xs text-slate-600 mt-0.5">{it.subtitle}</div>}
          </button>
        ))}
      </div>
    </div>
  )
}


