"use client"
export default function ParallelNode({ data }: { data: { label?: string; branches?: number } }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-teal-300 bg-white px-3 py-2 shadow-fp-1 min-w-44 max-w-[320px]">
      <div className="text-sm font-medium">{data.label || 'Parallel'}</div>
      <div className="text-xs text-slate-700 whitespace-normal break-words leading-snug">branches: {data.branches ?? 2}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-teal-600">Logic</div>
    </div>
  )
}

