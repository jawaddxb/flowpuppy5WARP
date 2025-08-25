"use client"
import React from 'react'
import { NODE_SCHEMAS } from '@/lib/nodeSchemas'
import { validateNode } from '@/lib/validation'
import { useGraphStore } from '@/store/graph'
import SecretsPicker from '@/components/SecretsPicker'

export default function InspectorFields({ selectedNode, selected }: { selectedNode: any | null; selected?: string | null }) {
  if (!selectedNode) return null
  const t = String(selectedNode.type || '')
  const meta = NODE_SCHEMAS[t]
  if (!meta) return null

  function setValue(key: string, value: any) {
    if (!selected) return
    useGraphStore.getState().updateNode(selected, { [key]: value } as any)
  }

  const issues = validateNode(selectedNode as any)
  const issueMap: Record<string, string> = {}
  for (const it of issues) {
    if (it.field) issueMap[it.field] = it.message
  }

  return (
    <div className="space-y-2">
      {meta.fields.map((f) => {
        const val = (selectedNode?.data as any)?.[f.key]
        return (
          <div key={`${t}:${f.key}`} className={f.widget === 'textarea' ? 'col-span-2' : ''}>
            <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
            {f.widget === 'text' && (
              <input aria-label={f.label} className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1" placeholder={f.placeholder} value={String(val || '')} onChange={(e)=> setValue(f.key, e.target.value)} />
            )}
            {f.widget === 'number' && (
              <input aria-label={f.label} type="number" className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1" value={Number(val ?? '') as any} onChange={(e)=>{ const v = parseFloat(e.target.value || '0'); setValue(f.key, isNaN(v) ? 0 : v) }} />
            )}
            {f.widget === 'select' && (
              <select aria-label={f.label} className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1" value={String(val || '')} onChange={(e)=> setValue(f.key, e.target.value)}>
                {(f.options || []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            )}
            {f.widget === 'textarea' && (
              <textarea
                aria-label={f.label}
                className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 h-24 font-mono text-xs"
                placeholder={f.placeholder}
                value={(() => { try { if (f.key === 'script') return String(val || ''); return JSON.stringify(val || {}, null, 2) } catch { return '' } })()}
                onChange={(e)=>{
                  if (f.key === 'script') return setValue(f.key, e.target.value)
                  try { const parsed = JSON.parse(e.target.value || '{}'); setValue(f.key, parsed) } catch {}
                }}
                onFocus={()=>{ try { (window as any).panelApi?.setRight?.(((window as any).panelApi?.presets?.right?.wide) || 36) } catch {} }}
                onBlur={()=>{ try { (window as any).panelApi?.setRight?.(((window as any).panelApi?.presets?.right?.comfort) || 28) } catch {} }}
              />
            )}
            {f.widget === 'csv' && (
              <input aria-label={f.label} className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1" placeholder={f.placeholder} value={Array.isArray(val) ? (val as string[]).join(', ') : ''} onChange={(e)=> setValue(f.key, e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} />
            )}
            {f.widget === 'secret' && (
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">{f.label}</div>
                <div className="flex items-center gap-2">
                  {!val && <span className="text-[11px] text-amber-600">Missing</span>}
                  <SecretsPicker onPick={(s)=> setValue(f.key, s.name)} />
                </div>
              </div>
            )}
            {issueMap[f.key] && (
              <div className="text-xs text-rose-600 mt-1">{issueMap[f.key]}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}


