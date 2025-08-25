"use client"
import { useEffect, useState } from 'react'
import { NODE_SCHEMAS } from '@/lib/nodeSchemas'

export default function InlineNodeEditor({
  type,
  initial,
  onSubmit,
  onCancel,
}: {
  type: string
  initial?: Record<string, any>
  onSubmit: (next: Record<string, any>) => void
  onCancel?: () => void
}) {
  const meta = NODE_SCHEMAS[type]
  const [form, setForm] = useState<Record<string, any>>({ ...(initial||{}) })
  useEffect(()=>{ setForm({ ...(initial||{}) }) }, [type, initial])
  if (!meta) return null
  return (
    <div className="rounded-[var(--radius-md)] border border-fp-border bg-white p-2 text-sm">
      <div className="font-medium mb-1">Edit {type}</div>
      <div className="grid grid-cols-2 gap-2">
        {meta.fields.slice(0,4).map(f => (
          <div key={f.key}>
            <label className="block text-[11px] text-slate-500 mb-0.5">{f.label}</label>
            {f.widget === 'textarea' ? (
              <textarea value={String(form[f.key] ?? '')} onChange={(e)=> setForm(v=> ({...v,[f.key]: e.target.value}))} className="w-full h-16 border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-sm" placeholder={f.placeholder} />
            ) : f.widget === 'number' ? (
              <input type="number" value={Number(form[f.key] ?? '')} onChange={(e)=> setForm(v=> ({...v,[f.key]: e.target.value}))} className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-sm" placeholder={f.placeholder} />
            ) : f.widget === 'select' ? (
              <select value={String(form[f.key] ?? '')} onChange={(e)=> setForm(v=> ({...v,[f.key]: e.target.value}))} className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-sm">
                <option value="">Select</option>
                {(f.options||[]).map(o=> <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input value={String(form[f.key] ?? '')} onChange={(e)=> setForm(v=> ({...v,[f.key]: e.target.value}))} className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-sm" placeholder={f.placeholder} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button onClick={()=> onSubmit(form)} className="px-3 py-1 rounded bg-fp-primary text-white">Apply</button>
        <button onClick={onCancel} className="px-3 py-1 rounded border border-fp-border">Cancel</button>
      </div>
    </div>
  )
}


