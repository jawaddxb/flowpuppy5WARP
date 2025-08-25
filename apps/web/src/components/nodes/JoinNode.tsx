"use client"
export default function JoinNode({ data }: { data: { label?: string; strategy?: 'all'|'any'|'quorum'; n?: number; m?: number } }) {
  const s = data.strategy || 'all'
  const detail = s === 'quorum' ? `${data.n ?? 2}/${data.m ?? 3}` : s
  return (
    <div className="rounded-[var(--radius-md)] border border-teal-300 bg-white px-3 py-2 shadow-fp-1 min-w-44 max-w-[320px]">
      <div className="text-sm font-medium">{data.label || 'Join'}</div>
      <div className="text-xs text-slate-700 whitespace-normal break-words leading-snug">{detail}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-teal-600">Logic</div>
    </div>
  )
}

