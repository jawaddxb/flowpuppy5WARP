"use client"
import { useSimStore } from '@/store/sim'
import StepCallout from '@/components/StepCallout'
import { describeNode } from '@/lib/simExplain'
export default function HttpNode({ data, id }: { data: { label?: string; url?: string; method?: string }; id: string }) {
  const status = useSimStore((s)=> s.nodeStatus[id] || 'idle')
  const activeNodeId = useSimStore((s)=> s.activeNodeId)
  const active = activeNodeId === id
  return (
    <div className={`relative rounded-[var(--radius-md)] px-3 py-2 shadow-fp-1 min-w-40 max-w-[360px] transition-all duration-300 ${status==='running' ? 'border-2 border-teal-400 bg-teal-50 shadow-[0_0_0_4px_rgba(20,184,166,0.15)] scale-[1.02]' : status==='ok' ? 'border border-emerald-400 bg-white' : status==='error' ? 'border border-rose-400 bg-rose-50' : 'border border-fp-border bg-white'}`}>
      {!data?.url && (
        <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">!</span>
      )}
      <div className="text-sm font-medium">{data.label || 'HTTP Request'}</div>
      <div className="text-xs text-slate-700 whitespace-normal break-all leading-snug">
        {(data.method || 'GET') + ' '}
        {data.url || 'https://api.example.com'}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Core</div>
      {status==='running' && (
        <div className="absolute -inset-1 rounded-[12px] pointer-events-none" style={{ background:
          'conic-gradient(#14b8a6 0, #14b8a6 25%, transparent 25% 100%)', mask:
          'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))', WebkitMask:
          'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
          animation: 'fp-spin 1.2s linear infinite' as any }} />
      )}
      {active && (
        <div className="absolute left-full top-1 ml-2">
          <StepCallout {...describeNode({ type: 'http', data })} />
        </div>
      )}
    </div>
  )
}

