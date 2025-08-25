"use client"
export default function TriggerNode({ data }: { data?: { label?: string; path?: string } }) {
	const d = (data as any) || {}
	return (
		<div className="relative rounded-[var(--radius-md)] border border-fp-primary bg-teal-50 px-3 py-2 shadow-fp-1 min-w-[220px] max-w-[520px]">
			{!d?.path && (
				<span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">!</span>
			)}
			<div className="text-[13px] font-semibold leading-snug whitespace-normal break-words">{d.label || 'Trigger'}</div>
			{d.path && <div className="text-xs text-slate-700 whitespace-normal break-all leading-snug">{d.path}</div>}
			<div className="mt-1 text-[10px] uppercase tracking-wide text-teal-700">Trigger</div>
		</div>
	)
}

