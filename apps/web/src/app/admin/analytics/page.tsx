"use client"
import React, { useEffect, useState } from 'react'

type Health = { name: string; ok: boolean; latencyMs?: number }
type Usage = { provider: string; cnt: number; avg_latency: number; tokens_in: number; tokens_out: number; status_breakdown?: Record<string, number> }

export default function AdminAnalyticsPage() {
  const [items, setItems] = useState<Health[]>([])
  const [usage, setUsage] = useState<Usage[]>([])
  useEffect(() => {
    ;(async () => {
      try {
        const health = await fetch('/api/admin/providers/health').then(r=>r.json()).catch(()=>({items:[]}))
        setItems(health.items || [])
        const agg = await fetch('/api/admin/usage').then(r=>r.json()).catch(()=>({items:[]}))
        setUsage(agg.items || [])
      } catch {}
    })()
  }, [])
  return (
    <div className="space-y-3">
      <div className="text-xl font-semibold">Provider Health</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((h)=> (
          <div key={h.name} className={`rounded border px-3 py-2 ${h.ok ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}>
            <div className="font-medium">{h.name}</div>
            <div className="text-xs text-slate-600">{h.ok ? `OK • ${h.latencyMs}ms` : 'Down'}</div>
          </div>
        ))}
      </div>
      <div className="text-xl font-semibold mt-4">Usage (last 24h)</div>
      <div className="rounded border border-fp-border bg-white">
        <div className="grid grid-cols-6 text-xs font-medium px-3 py-2 border-b border-fp-border">
          <div>Provider</div><div>Count</div><div>Avg latency</div><div>Tokens in</div><div>Tokens out</div><div>Status</div>
        </div>
        {usage.map(u => (
          <div key={u.provider} className="grid grid-cols-6 text-sm px-3 py-2 border-b border-fp-border">
            <div className="capitalize">{u.provider}</div>
            <div>{u.cnt}</div>
            <div>{Math.round(u.avg_latency)}ms</div>
            <div>{u.tokens_in}</div>
            <div>{u.tokens_out}</div>
            <div className="text-xs text-slate-600">OK: {(u as any).ok || 0} · Errors: {(u as any).error || 0}</div>
          </div>
        ))}
        {usage.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No data</div>}
      </div>
    </div>
  )
}


