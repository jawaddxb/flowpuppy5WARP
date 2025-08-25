"use client"
import { ReactNode, useEffect, useRef } from 'react'

const iconMap: Record<string, string> = {
  input: '🟢', http: '🌐', transform: '🧩', delay: '⏱️', parallel: '🔀', join: '🔗', switch: '🛣️', trycatch: '🛡️', loop: '🔁', subflow: '📦', email: '✉️', slack: '💬', notion: '🗒️', sheets: '📊', airtable: '🧱', discord: '🕹️',
}

const colorMap: Record<string, string> = {
  input: 'bg-emerald-500', http: 'bg-sky-500', transform: 'bg-fuchsia-500', delay: 'bg-amber-500', parallel: 'bg-purple-500', join: 'bg-indigo-500', switch: 'bg-rose-500', trycatch: 'bg-orange-600', loop: 'bg-teal-500', subflow: 'bg-slate-500', email: 'bg-emerald-600', slack: 'bg-blue-500', notion: 'bg-neutral-500', sheets: 'bg-lime-600', airtable: 'bg-yellow-500', discord: 'bg-violet-500',
}

export default function PlanStepCard({
  idx,
  type,
  title,
  description,
  onEdit,
  onReplace,
  onRemove,
}: {
  idx: number
  type: string
  title: string
  description: ReactNode
  onEdit?: () => void
  onReplace?: () => void
  onRemove?: () => void
}) {
  const icon = iconMap[type] || '🔧'
  const color = colorMap[type] || 'bg-slate-400'
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.animate([
      { transform: 'translateY(4px)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 },
    ], { duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
  }, [])
  return (
    <div
      ref={ref}
      className="relative group rounded-[14px] border border-fp-border bg-white shadow-fp-1 p-3 transition-all hover:shadow-lg hover:-translate-y-[1px]"
      onMouseEnter={()=> { try { window.dispatchEvent(new CustomEvent('story:hover-step', { detail: { text: String(title||'') || String(description||'') } })) } catch {} }}
      onMouseLeave={()=> { try { window.dispatchEvent(new CustomEvent('story:hover-step', { detail: null })) } catch {} }}
      onClick={()=> { try { window.dispatchEvent(new CustomEvent('story:focus-node', { detail: { text: String(title||'') || String(description||'') } })) } catch {} }}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[14px] ${color}`} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none select-none" aria-hidden>{icon}</span>
          <div className="min-w-0">
            <div className="font-medium truncate">{idx}. {title}</div>
            <div className="text-[11px] text-slate-500 capitalize">{type}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && <button onClick={onEdit} className="px-2 py-1 border border-fp-border rounded">Edit</button>}
          {onReplace && <button onClick={onReplace} className="px-2 py-1 border border-fp-border rounded">Replace</button>}
          {onRemove && <button onClick={onRemove} className="px-2 py-1 border border-fp-border rounded text-rose-600">Remove</button>}
        </div>
      </div>
      <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
        {description}
      </div>
    </div>
  )
}


