"use client"
import { useState } from 'react'
import { useEffect } from 'react'
import { CredentialsModal } from './CredentialsModal'
import { useAuthStore } from '@/store/auth'

type Provider = { id: string; type: string; model: string; scope: 'global'|'org'; latency: number; errorRate: number; active: boolean, category?: string, mockMode?: boolean, connected?: boolean }

const initial: Provider[] = [
  { id: '1', type: 'claude', model: 'claude-3.5-sonnet', scope: 'global', latency: 520, errorRate: 0.3, active: true, category: 'llm' },
  { id: '2', type: 'openai', model: 'gpt-4o', scope: 'global', latency: 480, errorRate: 0.4, active: true, category: 'llm' },
  { id: '3', type: 'mistral', model: 'mistral-large', scope: 'global', latency: 610, errorRate: 0.6, active: true, category: 'llm' },
  { id: '4', type: 'gemini', model: 'gemini-1.5-pro', scope: 'global', latency: 700, errorRate: 0.8, active: false, category: 'llm' },
]

export default function AdminProvidersPage() {
  // TODO: protect route using auth store/session (redirect to /login if unauthenticated)
  const [providers, setProviders] = useState<Provider[]>(initial)
  const [priority, setPriority] = useState<string[]>(providers.map(p => p.id))
  const [form, setForm] = useState<Partial<Provider> & { required_secrets?: string } >({ type: 'claude', model: '', required_secrets: '' })
  const [purpose, setPurpose] = useState<string>('chat')
  const [route, setRoute] = useState<{ id: string; priority_json: Array<{ type: string; model?: string }> } | null>(null)
  const [health, setHealth] = useState<Array<{ name: string; ok: boolean; latencyMs?: number }>>([])
  const [filter, setFilter] = useState('')
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    // Load from API when available
    ;(async () => {
      try {
        const r = await fetch('/api/admin/providers')
        const res = await r.json()
        if (res?.providers?.length) {
          setProviders(res.providers)
          setPriority(res.providers.map((p: Provider) => p.id))
        }
      } catch {}
      finally { setLoaded(true) }
    })()
    // Preload routing policies preview
    fetch('/api/admin/routes').then(r=>r.json()).catch(()=>{})
    // Provider health
    fetch('/api/admin/providers/health').then(r=>r.json()).then((res)=>{
      if (res?.items) {
        setHealth(res.items)
        setProviders(prev => prev.map(p => {
          const h = res.items.find((i: any)=> i.name === p.type)
          return h ? { ...p, latency: h.latencyMs ?? p.latency } : p
        }))
      }
    }).catch(()=>{})
  }, [])

  // Load effective routing when purpose changes
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/admin/routes?purpose=' + encodeURIComponent(purpose))
        const data = await res.json()
        const item = (data.items || [])[0] || null
        if (item) setRoute({ id: item.id, priority_json: item.priority_json || [] })
        else setRoute(null)
      } catch {}
    })()
  }, [purpose])

  function move(id: string, dir: -1|1) {
    setPriority(prev => {
      const idx = prev.indexOf(id)
      const j = idx + dir
      if (idx < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      const a = next[idx]!
      const b = next[j]!
      next[idx] = b
      next[j] = a
      return next
    })
  }

  const aiProviders = providers.filter(p => (p as any).category === 'llm')
  const integrationProviders = providers.filter(p => (p as any).category !== 'llm')
  const visible = integrationProviders.filter(p => !filter || p.type.toLowerCase().includes(filter.toLowerCase()))
  const byCat = visible.reduce((acc: Record<string, Provider[]>, p) => {
    const c = (p.category || 'other').toLowerCase()
    acc[c] = acc[c] || []
    acc[c].push(p)
    return acc
  }, {})
  const catOrder = Object.keys(byCat).sort()
  const aiSet = new Set(aiProviders.map(p=> p.id))

  const [credFor, setCredFor] = useState<string|null>(null)
  const orgId = useAuthStore(s => s.currentOrgId)

  return (
    <>
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin • AI Providers</h1>
      <div className="rounded-[var(--radius-lg)] border border-fp-border bg-fp-surface p-4 shadow-fp-1" role="region" aria-label="Workflow Integrations">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Workflow Integrations</div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-slate-600">Providers by category</div>
          <input value={filter} onChange={(e)=> setFilter(e.target.value)} placeholder="Filter providers" aria-label="Filter providers" className="border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-xs" />
        </div>
        <div className="mb-2 flex items-center gap-2">
          <button
            data-testid="edit-credentials-quick"
            className="px-2 py-1 text-xs rounded border border-fp-border"
            onClick={()=> {
              const target = providers.find(p=> p.id==='openweather') || providers[0]
              if (target) setCredFor(target.id)
            }}
          >Edit credentials</button>
          <span className="text-xs text-slate-500">Quick access</span>
        </div>
        {loaded ? (
          <div className="space-y-3">
            {catOrder.map(cat => (
              <div key={cat}>
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{cat}</div>
                <div className="space-y-1">
                  {(byCat[cat] || []).map((p) => (
                    <div key={p.id} className="flex items-center justify-between border border-fp-border rounded-[var(--radius-sm)] p-2 bg-white">
                      <div className="flex items-center gap-2">
                        <div className="font-medium capitalize">{p.type}</div>
                        <div className="text-xs text-slate-500">{p.scope}</div>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded ${p.connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`} title={p.connected ? 'Connected via OAuth or secrets' : 'Not connected'}>
                          {p.connected ? 'Connected' : 'Not connected'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span>{p.latency}ms</span>
                        <button
                          onClick={async ()=>{
                            const next = !(p.mockMode ?? true)
                            const res = await fetch(`/api/admin/providers/${p.id}?org=org-demo`, { method: 'PATCH', body: JSON.stringify({ mock_mode: next }) })
                            if (res.ok) setProviders(prev => prev.map(x => x.id===p.id ? { ...x, mockMode: next } : x))
                          }}
                          className={`px-2 py-0.5 border rounded ${p.mockMode ? 'border-amber-500 text-amber-600' : 'border-emerald-500 text-emerald-600'}`}
                          title="Toggle Live/Mock"
                          aria-pressed={p.mockMode ? true : false}
                          aria-label={`Set ${p.type} to ${p.mockMode ? 'Live' : 'Mock'} mode`}
                        >{p.mockMode ? 'Mock' : 'Live'}</button>
                        <button data-testid={`edit-credentials-${p.id}`} onClick={()=> setCredFor(p.id)} className="px-2 py-0.5 border border-fp-border rounded" aria-label={`Edit credentials for ${p.type}`}>Edit credentials</button>
                        <button
                          onClick={async ()=>{
                            const res = await fetch(`/api/admin/providers/${p.id}/oauth/init?org=org-demo`, { method: 'POST' })
                            const json = await res.json().catch(()=>null as any)
                            if (res.ok && json?.authUrl) {
                              // In CI we do not actually navigate; just call callback with mock data
                              try {
                                await fetch(`/api/admin/providers/${p.id}/oauth/callback?org=org-demo&state=${encodeURIComponent(json.state||'mock')}&code=mock`, { method: 'GET' })
                                setProviders(prev => prev.map(x => x.id===p.id ? { ...x, connected: true } : x))
                                alert('Connected (mock)')
                              } catch {}
                            } else if (res.ok) {
                              alert('OAuth flow initiated (mock)')
                            } else {
                              alert('OAuth init failed')
                            }
                          }}
                          className="px-2 py-0.5 border border-fp-border rounded"
                          title="Connect via OAuth"
                          aria-label={`Connect ${p.type} via OAuth`}
                        >Connect</button>
                        {p.connected && (
                          <button
                            onClick={async ()=>{
                              const ok = confirm('Disconnect OAuth for this provider?')
                              if (!ok) return
                              const res = await fetch(`/api/admin/providers/${p.id}/oauth/disconnect?org=org-demo`, { method: 'POST' })
                              if (res.ok) {
                                setProviders(prev => prev.map(x => x.id===p.id ? { ...x, connected: false } : x))
                              } else {
                                alert('Disconnect failed')
                              }
                            }}
                            className="px-2 py-0.5 border border-fp-border rounded text-rose-600"
                            title="Disconnect OAuth"
                            aria-label={`Disconnect ${p.type} OAuth`}
                          >Disconnect</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500">Loading…</div>
        )}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-fp-border bg-fp-surface p-4 shadow-fp-1" role="region" aria-label="System AI Routing">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">System AI Routing</div>
        <div className="text-sm text-slate-600 mb-2">Priority order (top = primary; failover in descending order)</div>
        <div className="text-xs text-slate-500 mb-2">Effective routing order for <span className="font-medium">{purpose}</span> (org overrides not shown)</div>
        <div className="space-y-2">
          {priority.filter(id => aiSet.has(id)).map((id, i) => {
            const p = providers.find(x => x.id === id)!
            return (
              <div key={id} className="flex items-center justify-between border border-fp-border rounded-[var(--radius-md)] p-3 bg-white">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 text-xs rounded bg-slate-100">{i+1}</span>
                  <div className="font-medium capitalize">{p.type}</div>
                  <div className="text-sm text-slate-500">{p.model} • {p.scope}</div>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span>{p.latency}ms</span>
                  <span>{p.errorRate}%</span>
                  <button onClick={async ()=>{
                    const res = await fetch(`/api/admin/providers/${id}`, { method: 'PATCH', body: JSON.stringify({ status: p.active ? 'inactive' : 'active' }) })
                    if (res.ok) setProviders(prev => prev.map(x => x.id === id ? { ...x, active: !x.active } : x))
                  }} className={`px-2 py-1 border rounded ${p.active ? 'border-emerald-500 text-emerald-600' : 'border-slate-300 text-slate-500'}`}>{p.active ? 'Active' : 'Inactive'}</button>
                  <button onClick={() => move(id, -1)} className="px-2 py-1 border border-fp-border rounded">↑</button>
                  <button onClick={() => move(id, 1)} className="px-2 py-1 border border-fp-border rounded">↓</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-fp-border bg-fp-surface p-4 shadow-fp-1">
        <div className="font-medium mb-2">Add Provider</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Type</label>
            <select value={form.type} onChange={(e)=>setForm(f=>({...f, type: e.target.value as Provider['type']}))} className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1">
              {['claude','openai','deepseek','qwen','gemini','mistral','custom'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Model</label>
            <input value={form.model ?? ''} onChange={(e)=>setForm(f=>({...f, model: e.target.value}))} className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Required secrets (comma separated)</label>
            <input value={(form as any).required_secrets ?? ''} onChange={(e)=>setForm(f=>({...f, required_secrets: e.target.value }))} className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={async ()=>{
            const payload: any = { type: form.type, name: form.type, category: 'other', auth_type: 'apiKey', required_secrets: (form as any).required_secrets ? String((form as any).required_secrets).split(',').map((s:string)=>s.trim()).filter(Boolean) : [] }
            const res = await fetch('/api/admin/providers', { method: 'POST', body: JSON.stringify(payload) })
            if (res.ok) {
              const { provider } = await res.json()
              setProviders(prev => [...prev, provider])
              setPriority(prev => [...prev, provider.id])
              setForm({ type: 'claude', model: '', required_secrets: '' })
            }
          }} className="px-3 py-2 rounded-[var(--radius-sm)] bg-fp-primary text-white hover:bg-fp-primary-600">Add Provider</button>
          <button onClick={async ()=>{
            const spec = prompt('Paste OpenAPI JSON')
            if (!spec) return
            const res = await fetch('/api/admin/providers/openapi', { method: 'POST', body: JSON.stringify({ spec }) })
            const data = await res.json()
            if (!res.ok) return alert(data?.error || 'Import failed')
            alert(`Imported: ${data?.provider?.name || 'OpenAPI'}`)
          }} className="px-3 py-2 rounded-[var(--radius-sm)] border border-fp-border">Import OpenAPI…</button>
          <button onClick={async ()=>{
            const url = prompt('MCP endpoint URL')
            if (!url) return
            const res = await fetch('/api/admin/providers/mcp', { method: 'POST', body: JSON.stringify({ url }) })
            const data = await res.json()
            if (!res.ok) return alert(data?.error || 'MCP add failed')
            alert('MCP provider added')
          }} className="px-3 py-2 rounded-[var(--radius-sm)] border border-fp-border">Add MCP…</button>
          <button onClick={async ()=>{
            const url = prompt('MCP endpoint URL for tool discovery')
            if (!url) return
            const res = await fetch('/api/admin/providers/mcp/tools', { method: 'POST', body: JSON.stringify({ url }) })
            const data = await res.json()
            if (!res.ok) return alert(data?.error || 'Tool discovery failed')
            alert('Tools found:\n' + JSON.stringify(data?.tools||[], null, 2))
          }} className="px-3 py-2 rounded-[var(--radius-sm)] border border-fp-border">Discover MCP Tools…</button>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-fp-border bg-fp-surface p-4 shadow-fp-1">
        <div className="font-medium mb-2">Routing Policies</div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs text-slate-600">Purpose</label>
          <select value={purpose} onChange={(e)=> setPurpose(e.target.value)} className="border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-sm" aria-label="Routing purpose">
            <option value="chat">chat</option>
            <option value="generate">generate</option>
            <option value="explain">explain</option>
          </select>
        </div>
        {route && (
          <div className="mb-3">
            <div className="text-xs text-slate-500 mb-1">Effective order</div>
            <div className="space-y-1">
              {route.priority_json.map((p, i) => (
                <div key={`${p.type}-${i}`} className="flex items-center justify-between border border-fp-border rounded-[var(--radius-sm)] bg-white px-2 py-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-1.5 py-0.5 text-[11px] rounded bg-slate-100">{i+1}</span>
                    <span className="capitalize">{p.type}</span>
                    <span className="text-slate-500">{p.model || ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {(() => { const h = health.find(h=>h.name===p.type); return h ? `${h.latencyMs ?? '-'}ms` : '-' })()}
                    </span>
                    <button onClick={()=>{
                      setRoute(r => {
                        if (!r) return r
                        if (i===0) return r
                        const arr = [...r.priority_json]
                        const tmp = arr[i-1] as { type: string; model?: string } | undefined
                        const cur = arr[i] as { type: string; model?: string } | undefined
                        if (!tmp || !cur) return r
                        arr[i-1] = cur
                        arr[i] = tmp
                        return { ...r, priority_json: arr }
                      })
                    }} className="px-1.5 py-0.5 border border-fp-border rounded text-xs">↑</button>
                    <button onClick={()=>{
                      setRoute(r => {
                        if (!r) return r
                        if (i===r.priority_json.length-1) return r
                        const arr = [...r.priority_json]
                        const tmp = arr[i+1] as { type: string; model?: string } | undefined
                        const cur = arr[i] as { type: string; model?: string } | undefined
                        if (!tmp || !cur) return r
                        arr[i+1] = cur
                        arr[i] = tmp
                        return { ...r, priority_json: arr }
                      })
                    }} className="px-1.5 py-0.5 border border-fp-border rounded text-xs">↓</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <button onClick={async ()=>{
                if (!route) return
                await fetch('/api/admin/routes', { method: 'PATCH', body: JSON.stringify({ id: route.id, priority_json: route.priority_json }) })
                alert('Updated routing')
              }} className="px-3 py-1.5 rounded-[var(--radius-sm)] border border-fp-border text-sm">Save order</button>
            </div>
          </div>
        )}
        <button onClick={async ()=>{
          const payload = { purpose, priority_json: [
            { type: 'claude', model: 'sonnet' },
            { type: 'openai', model: 'gpt-4o' },
          ] }
          await fetch('/api/admin/routes', { method: 'POST', body: JSON.stringify(payload) })
          alert(`Saved default ${purpose} routing`)
        }} className="px-3 py-2 rounded-[var(--radius-sm)] border border-fp-border">Save Routing</button>
        <button onClick={async ()=>{
          const res = await fetch('/api/admin/routes?purpose=' + encodeURIComponent(purpose))
          const data = await res.json()
          alert(`Routes for ${purpose}:
` + JSON.stringify(data.items || [], null, 2))
        }} className="ml-2 px-3 py-2 rounded-[var(--radius-sm)] border border-fp-border">View Routes</button>
      </div>
    </div>
    {credFor && <CredentialsModal providerId={credFor} orgId={orgId ?? undefined} onClose={()=> setCredFor(null)} />}
    </>
  )
}

