"use client"
import React from 'react'
import { useGraph } from '@/agentStage/graph/store'
import { flowDocToDsl } from '@/lib/flowdoc/adapter'
import { deriveRequiredProviders } from '@/lib/connections'
import { ConnectionTile } from '@/components/ConnectionTile'
import ChatPanel from '@/components/ChatPanel'

type Tab = 'Inspector' | 'Testing' | 'Tasks'

export default function RightInspector() {
  const [tab, setTab] = React.useState<Tab>('Inspector')
  const activeId = useGraph(s=>s.activeNodeId)
  const flow = useGraph(s=>s.flow as any)
  const activeNode = React.useMemo(()=> (flow.nodes || []).find((n:any)=> n.id===activeId) || null, [flow, activeId])
  const activeIdStr: string | null = typeof activeId === 'string' ? activeId : null
  const update = useGraph(s=>s.updateNodeData)
  const [log, setLog] = React.useState<string[]>([])
  const [running, setRunning] = React.useState(false)
  const dirty = useGraph(s=> s.dirty as any)
  const [chatOpen, setChatOpen] = React.useState(false)
  const [simulated, setSimulated] = React.useState(false)
  const [requiredKeys, setRequiredKeys] = React.useState<string[]>([])
  const issues = useGraph(s=> s.issues)
  const strictIssues = useGraph(s=> s.strictIssues)
  const [conn, setConn] = React.useState<Record<string, 'not-connected'|'connected'|'error'|'pending'|'skipped'>>(()=>{
    try { const raw = localStorage.getItem('fp-conn-status'); if (raw) return JSON.parse(raw) } catch {}
    return {}
  })
  const missingConn = React.useMemo(()=> requiredKeys.filter(k => !(conn[k]==='connected' || conn[k]==='skipped')), [requiredKeys, conn])

  // Auto-open Testing when connections are required (mobile-friendly UX)
  React.useEffect(() => {
    if ((requiredKeys.length > 0) && tab !== 'Testing') setTab('Testing')
  }, [requiredKeys])

  // E2E hook: expose API to force-open Testing tab (for mobile automation reliability)
  React.useEffect(() => {
    const e2e = String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()
    if (!(e2e==='1' || e2e==='true')) return
    try {
      ;(window as any).inspectorApi = {
        openTesting: () => setTab('Testing' as Tab),
        openInspector: () => setTab('Inspector' as Tab),
        connect: (id: string) => setConn(prev => { const next = { ...prev, [id]: 'connected' as const }; try { localStorage.setItem('fp-conn-status', JSON.stringify(next)) } catch {}; return next }),
        skip: (id: string) => setConn(prev => { const next = { ...prev, [id]: 'skipped' as const }; try { localStorage.setItem('fp-conn-status', JSON.stringify(next)) } catch {}; return next }),
      }
    } catch {}
    return () => { try { if ((window as any).inspectorApi) delete (window as any).inspectorApi } catch {} }
  }, [])

  // Resolve required providers from current FlowDoc and poll status
  React.useEffect(() => {
    let alive = true
    ;(async ()=>{
      try {
        const req = deriveRequiredProviders(flow) as string[]
        setRequiredKeys(req)
        const res = await fetch('/api/providers/status', { method: req.length? 'POST':'GET', headers: req.length? { 'Content-Type':'application/json' } : undefined, body: req.length? JSON.stringify({ required: req }) : undefined })
        const j = await res.json().catch(()=>({}))
        const map = (j?.status || {}) as Record<string,string>
        if (!alive) return
        if (map && Object.keys(map).length) {
          setConn(prev => {
            const next = { ...prev }
            for (const [k,v] of Object.entries(map)) {
              const status = (v==='connected'?'connected':(v==='error'?'error':'not-connected')) as any
              next[k] = next[k]==='skipped' ? 'skipped' : status
            }
            try { localStorage.setItem('fp-conn-status', JSON.stringify(next)) } catch {}
            return next
          })
        }
      } catch {}
    })()
    return ()=> { alive = false }
  }, [flow])

  function handleConnect(id: string) { setConn(prev => { const next = { ...prev, [id]: 'connected' as const }; try { localStorage.setItem('fp-conn-status', JSON.stringify(next)) } catch {}; return next }) }
  function handleSkip(id: string) { setConn(prev => { const next = { ...prev, [id]: 'skipped' as any }; try { localStorage.setItem('fp-conn-status', JSON.stringify(next)) } catch {}; return next }) }

  // dirty is derived from store (set on flow edits)

  async function runTestOnce() {
    if (!flow || !Array.isArray(flow.nodes)) return
    if (dirty) {
      setLog(l=> [...l, 'Please save changes before running Test.'])
      return
    }
    setLog([]); setRunning(true)
    try { useGraph.getState().resetStatus() } catch {}
    try {
      const dsl = flowDocToDsl(flow as any)
      const res = await fetch('/api/run/stream', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ dsl, input: {}, options: { maxRuntimeMs: 60000 } }) })
      const reader = res.body?.getReader(); const decoder = new TextDecoder()
      if (!reader) { setRunning(false); return }
      const linesCollected: string[] = []
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''
        for (const part of parts) {
          const line = part.replace(/^data:\s*/, '')
          if (!line) continue
          try {
            const ev = JSON.parse(line)
            if (ev.type === 'step') {
              const id = String(ev.nodeId||'')
              linesCollected.push(`Step ${id}: ${ev.status} (${ev.durationMs||''}ms)`)
              setLog(l => [...l, `Step ${id}: ${ev.status} (${ev.durationMs||''}ms)`])
              try { useGraph.getState().setNodeStatus(id, ev.status) } catch {}
              if (ev.status === 'error') { try { useGraph.getState().setActiveNode(id) } catch {} }
            } else if (ev.type === 'end') {
              setLog(l => [...l, `Run finished: ${ev.ok ? 'ok' : 'error'}`])
            }
          } catch {}
        }
      }
      try { const pushRun = (useGraph as any).getState?.().pushRun; if (pushRun) pushRun(linesCollected) } catch {}
    } catch (e) {
      setLog(l=> [...l, 'error: failed to run test'])
    } finally {
      setRunning(false)
    }
  }
  return (
    <div className="p-3 h-full">
      <div className="flex items-center gap-2 mb-3">
        <button className={`px-2 py-1 text-xs rounded border ${tab==='Inspector'?'bg-white':'bg-slate-100'}`} onClick={()=> setTab('Inspector')}>Inspector</button>
        <button className={`px-2 py-1 text-xs rounded border ${tab==='Testing'?'bg-white':'bg-slate-100'}`} onClick={()=> setTab('Testing')}>Testing</button>
        <button className={`px-2 py-1 text-xs rounded border ${tab==='Tasks'?'bg-white':'bg-slate-100'}`} onClick={()=> setTab('Tasks')}>Tasks</button>
      </div>
      {tab==='Inspector' && (
        <div className="space-y-3 text-sm">
          {(issues?.length || 0) > 0 && (
            <div className="rounded-[12px] border border-amber-300 bg-amber-50 p-3">
              <div className="font-semibold text-[13px] mb-1">Flow Warnings</div>
              <ul className="list-disc pl-5 text-[12px] text-amber-800">
                {issues.map((it, idx)=> (
                  <li key={idx} className="flex items-start gap-2">
                    <span>{it.message}</span>
                    {it.code==='decision.label.missing' && it.edgeId && (
                      <button className="text-[11px] underline" onClick={()=>{
                        try {
                          const f = structuredClone((useGraph as any).getState?.().flow)
                          const e = (f.edges||[]).find((m:any)=> String(m.id)===String(it.edgeId))
                          if (e) { e.label = 'Yes' }
                          (useGraph as any).getState?.().setFlow(f)
                        } catch {}
                      }}>Fix</button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(strictIssues?.length || 0) > 0 && (
            <div className="rounded-[12px] border border-rose-300 bg-rose-50 p-3">
              <div className="font-semibold text-[13px] mb-1">Flow Errors</div>
              <ul className="list-disc pl-5 text-[12px] text-rose-800">
                {strictIssues.map((msg, idx)=> (<li key={idx}>{msg}</li>))}
              </ul>
              <div className="mt-2 flex gap-2">
                <button className="px-2 py-1 text-xs rounded border border-rose-300 bg-white"
                  onClick={()=>{
                    try {
                      const flow = (useGraph as any).getState?.().flow
                      const fix = structuredClone(flow)
                      // Ensure boolean decisions have Yes/No branches and labels
                      for (const n of (fix.nodes||[])) {
                        const t = String(n?.type||'').toLowerCase()
                        if (t==='decision') {
                          const arr = Array.isArray(n?.data?.branches) ? [...(n.data.branches as any[])] : []
                          if (arr.length===2) {
                            if (!arr.includes('Yes')) arr[0] = 'Yes'
                            if (!arr.includes('No')) arr[1] = 'No'
                            n.data = { ...(n.data||{}), branches: arr }
                            for (const e of (fix.edges||[])) {
                              if (String(e?.source?.nodeId||'')===String(n.id)) {
                                if (!e.label) e.label = 'Yes'
                                if (e.label !== 'Yes' && e.label !== 'No') e.label = 'No'
                              }
                            }
                          }
                        }
                        if (t==='loop') {
                          if (typeof n?.data?.maxCycles==='number' && n.data.maxCycles < 0) n.data.maxCycles = 0
                          if (typeof n?.data?.maxConcurrent==='number' && n.data.maxConcurrent < 0) n.data.maxConcurrent = 1
                        }
                      }
                      // Orphan source auto-wiring: attach domain/URL nodes to the first input and default to HTTP fetch
                      const inputs = (fix.nodes||[]).filter((m:any)=> ['input','trigger','webhook','schedule'].includes(String(m?.type||'').toLowerCase()))
                      const inputId = inputs.length ? String(inputs[0].id) : null
                      if (inputId) {
                        const inDeg: Record<string, number> = {}
                        for (const e of (fix.edges||[])) {
                          const t = String(e?.target?.nodeId||'')
                          if (t) inDeg[t] = (inDeg[t]||0) + 1
                        }
                        const domainRe = /^(https?:\/\/)?([a-z0-9.-]+)\.[a-z]{2,}(\/.+)?$/i
                        for (const n of (fix.nodes||[])) {
                          const id = String(n.id)
                          const t = String(n?.type||'').toLowerCase()
                          if (['input','trigger','webhook','schedule'].includes(t)) continue
                          const indegree = inDeg[id] || 0
                          const title = String(n?.title||'')
                          const looksLikeDomain = domainRe.test(title)
                          if (indegree === 0 && looksLikeDomain) {
                            // Default this node to an HTTP fetch if not already
                            const url = title.startsWith('http') ? title : `https://${title}`
                            n.provider = 'http'
                            n.type = n.type || 'action'
                            n.data = { ...(n.data||{}), url, method: (n.data?.method||'GET') }
                            // Add edge from input → this node if missing
                            const exists = (fix.edges||[]).some((e:any)=> String(e?.source?.nodeId||'')===inputId && String(e?.target?.nodeId||'')===id)
                            if (!exists) {
                              ;(fix.edges||[]).push({ id: `e-${Math.random().toString(36).slice(2,8)}`, source: { nodeId: inputId }, target: { nodeId: id } })
                            }
                          }
                        }
                      }
                      (useGraph as any).getState?.().setFlow(fix)
                    } catch {}
                  }}>Auto-wire sources</button>
              </div>
            </div>
          )}
          <FieldGroup title={`Agent Step${activeNode?` · ${activeNode.title||''}`:''}`}>
            <label className="block text-xs text-slate-600" htmlFor="ri-prompt">Prompt</label>
            <textarea id="ri-prompt" aria-label="Prompt" className="w-full border border-[#e2e8f0] rounded p-2 h-24 text-xs" onChange={(e)=> activeId && update(activeId, { prompt: e.target.value })} />
            <label className="block text-xs text-slate-600 mt-2" htmlFor="ri-model">Model</label>
            <select id="ri-model" aria-label="Model" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" onChange={(e)=> activeId && update(activeId, { model: e.target.value })}><option>claude-3.5</option><option>gpt-4o</option></select>
            <label className="block text-xs text-slate-600 mt-2" htmlFor="ri-confirm">Ask-for-confirmation</label>
            <select id="ri-confirm" aria-label="Ask-for-confirmation" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" onChange={(e)=> activeId && update(activeId, { confirm: e.target.value })}><option>Never</option><option>On uncertainty</option><option>Always</option></select>
            <label className="block text-xs text-slate-600 mt-2" htmlFor="ri-skills">Skills</label>
            <input id="ri-skills" aria-label="Skills" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" placeholder="search, summarize" onChange={(e)=> activeId && update(activeId, { skills: e.target.value })} />
            <button className="mt-2 px-2 py-1 text-xs rounded border">Add exit condition</button>
          </FieldGroup>
          {activeNode && String(activeNode?.type||'').toLowerCase()==='code' && activeIdStr && (
            <FieldGroup title="Code (advanced)">
              <label className="block text-xs text-slate-600" htmlFor="ri-code-js">JavaScript</label>
              <textarea id="ri-code-js" aria-label="JavaScript" className="w-full border border-[#e2e8f0] rounded p-2 h-32 text-xs font-mono" placeholder={'// return a value\nreturn input'} onChange={(e)=> update(activeIdStr, { code: e.target.value })} />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-xs text-slate-600" htmlFor="ri-code-timeout">Timeout (ms)</label>
                  <input id="ri-code-timeout" aria-label="Timeout (ms)" type="number" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" onChange={(e)=> update(activeIdStr, { timeoutMs: Number(e.target.value||0) })} />
                </div>
              </div>
            </FieldGroup>
          )}
          {activeNode && String(activeNode?.type||'').toLowerCase()==='kb' && activeIdStr && (
            <FieldGroup title="Knowledge search">
              <label className="block text-xs text-slate-600" htmlFor="ri-kb-query">Query</label>
              <input id="ri-kb-query" aria-label="Query" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" placeholder="e.g. energy price threshold" onChange={(e)=> update(activeIdStr, { query: e.target.value })} />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-xs text-slate-600" htmlFor="ri-kb-topk">Top K</label>
                  <input id="ri-kb-topk" aria-label="Top K" type="number" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" defaultValue={3} onChange={(e)=> update(activeIdStr, { k: Number(e.target.value||3) })} />
                </div>
              </div>
              <label className="block text-xs text-slate-600 mt-2" htmlFor="ri-kb-docs">Docs (title + text JSON)</label>
              <textarea id="ri-kb-docs" aria-label="Docs (title + text JSON)" className="w-full border border-[#e2e8f0] rounded p-2 h-24 text-xs font-mono" placeholder='[{"title":"Doc","text":"..."}]' onChange={(e)=> {
                try { const arr = JSON.parse(e.target.value); update(activeIdStr, { docs: Array.isArray(arr)? arr: [] }) } catch {}
              }} />
            </FieldGroup>
          )}
          {activeNode && ['input','trigger','schedule'].includes(String(activeNode?.type||'').toLowerCase()) && activeIdStr && (
            <FieldGroup title="Trigger">
              <label className="block text-xs text-slate-600" htmlFor="ri-trigger-cadence">Cadence</label>
              <select
                id="ri-trigger-cadence"
                aria-label="Cadence"
                className="w-full border border-[#e2e8f0] rounded p-1 text-xs"
                defaultValue={String(activeNode?.data?.scheduleCadence||'daily')}
                onChange={(e)=> update(activeIdStr, { scheduleCadence: e.target.value })}
              >
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
                <option value="cron">Cron</option>
              </select>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-xs text-slate-600" htmlFor="ri-trigger-time">Time of day</label>
                  <input id="ri-trigger-time" aria-label="Time of day" type="time" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" defaultValue={String(activeNode?.data?.timeOfDay||'09:00')} onChange={(e)=> update(activeIdStr, { timeOfDay: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-slate-600" htmlFor="ri-trigger-cron">Cron (optional)</label>
                  <input id="ri-trigger-cron" aria-label="Cron expression" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" placeholder="0 9 * * *" defaultValue={String(activeNode?.data?.cron||'')} onChange={(e)=> update(activeIdStr, { cron: e.target.value })} />
                </div>
              </div>
            </FieldGroup>
          )}
          {activeNode && String(activeNode?.type||'').toLowerCase()==='browser' && activeIdStr && (
            <FieldGroup title="Computer use (headless)">
              <label className="block text-xs text-slate-600" htmlFor="ri-browser-url">URL</label>
              <input id="ri-browser-url" aria-label="URL" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" placeholder="https://example.com" onChange={(e)=> update(activeIdStr, { url: e.target.value })} />
              <label className="block text-xs text-slate-600 mt-2" htmlFor="ri-browser-actions">Actions (JSON array)</label>
              <textarea id="ri-browser-actions" aria-label="Actions (JSON array)" className="w-full border border-[#e2e8f0] rounded p-2 h-24 text-xs font-mono" placeholder='[{"kind":"click","selector":"#login"},{"kind":"type","selector":"#q","text":"hello"}]' onChange={(e)=> {
                try { const arr = JSON.parse(e.target.value); update(activeIdStr, { actions: Array.isArray(arr)? arr: [] }) } catch {}
              }} />
              <div className="text-[11px] text-slate-500 mt-1">Enable with env <code>COMPUTER_USE_ENABLED=1</code>.</div>
            </FieldGroup>
          )}
          {activeNode && String(activeNode?.type||'').toLowerCase()==='http' && activeIdStr && (
            <FieldGroup title="HTTP Fetch">
              <label className="block text-xs text-slate-600" htmlFor="ri-http-url">URL</label>
              <input id="ri-http-url" aria-label="URL" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" placeholder="https://example.com" defaultValue={String(activeNode?.data?.url||'')} onChange={(e)=> update(activeIdStr, { url: e.target.value })} />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-xs text-slate-600" htmlFor="ri-http-method">Method</label>
                  <select id="ri-http-method" aria-label="Method" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" defaultValue={String(activeNode?.data?.method||'GET')} onChange={(e)=> update(activeIdStr, { method: e.target.value })}>
                    <option>GET</option>
                    <option>POST</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button className="rounded border border-[#e2e8f0] px-2 py-1 text-xs" onClick={()=> setLog(l=>[...l, `HTTP ${String(activeNode?.data?.method||'GET')} ${String(activeNode?.data?.url||'')}`])}>Test</button>
                </div>
              </div>
            </FieldGroup>
          )}
          {activeNode && String(activeNode?.type||'').toLowerCase()==='transform' && /summarize/i.test(String(activeNode?.title||'')) && activeIdStr && (
            <FieldGroup title="Summarize">
              <label className="block text-xs text-slate-600" htmlFor="ri-sum-aud">Audience</label>
              <input id="ri-sum-aud" aria-label="Audience" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" placeholder="AI practitioners" defaultValue={String(activeNode?.data?.audience||'')} onChange={(e)=> update(activeIdStr, { audience: e.target.value })} />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-xs text-slate-600" htmlFor="ri-sum-length">Length</label>
                  <select id="ri-sum-length" aria-label="Length" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" defaultValue={String(activeNode?.data?.length||'short')} onChange={(e)=> update(activeIdStr, { length: e.target.value })}>
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600" htmlFor="ri-sum-style">Style</label>
                  <input id="ri-sum-style" aria-label="Style" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" placeholder="concise, bulleted" defaultValue={String(activeNode?.data?.style||'')} onChange={(e)=> update(activeIdStr, { style: e.target.value })} />
                </div>
              </div>
            </FieldGroup>
          )}
          {activeNode && String(activeNode?.type||'').toLowerCase()==='transform' && /compose/i.test(String(activeNode?.title||'')) && activeIdStr && (
            <FieldGroup title="Compose Tweet">
              <label className="block text-xs text-slate-600" htmlFor="ri-comp-tone">Tone</label>
              <input id="ri-comp-tone" aria-label="Tone" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" placeholder="helpful, expert" defaultValue={String(activeNode?.data?.tone||'')} onChange={(e)=> update(activeIdStr, { tone: e.target.value })} />
              <label className="block text-xs text-slate-600 mt-2" htmlFor="ri-comp-tags">Hashtags</label>
              <input id="ri-comp-tags" aria-label="Hashtags" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" placeholder="#AI #Trends" defaultValue={String(activeNode?.data?.hashtags||'')} onChange={(e)=> update(activeIdStr, { hashtags: e.target.value })} />
            </FieldGroup>
          )}
          {activeNode && String(activeNode?.type||'').toLowerCase()==='output' && String(activeNode?.provider||'').toLowerCase()==='twitter' && activeIdStr && (
            <FieldGroup title="Post Tweet">
              <label className="block text-xs text-slate-600" htmlFor="ri-tweet-text">Tweet text template</label>
              <textarea id="ri-tweet-text" aria-label="Tweet text template" className="w-full border border-[#e2e8f0] rounded p-2 h-20 text-xs" placeholder="{{input.tweet}}" defaultValue={String(activeNode?.data?.text||'{{input.tweet}}')} onChange={(e)=> update(activeIdStr, { text: e.target.value })} />
              <div className="text-[11px] text-slate-500 mt-1">Connect Twitter in Testing to enable real posting.</div>
            </FieldGroup>
          )}
          <FieldGroup title="Enter Loop">
            <label className="block text-xs text-slate-600" htmlFor="ri-loop-items">Items to loop through</label>
            <input id="ri-loop-items" aria-label="Items to loop through" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" onChange={(e)=> activeId && update(activeId, { items: e.target.value })} />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-xs text-slate-600" htmlFor="ri-loop-maxcycles">Max Cycles</label>
                <input id="ri-loop-maxcycles" aria-label="Max Cycles" type="number" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" onChange={(e)=> activeId && update(activeId, { maxCycles: Number(e.target.value||0) })} />
              </div>
              <div>
                <label className="block text-xs text-slate-600" htmlFor="ri-loop-maxconcurrent">Max Concurrent</label>
                <input id="ri-loop-maxconcurrent" aria-label="Max Concurrent" type="number" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" onChange={(e)=> activeId && update(activeId, { maxConcurrent: Number(e.target.value||0) })} />
              </div>
            </div>
            <label className="block text-xs text-slate-600 mt-2" htmlFor="ri-loop-output">Output</label>
            <input id="ri-loop-output" aria-label="Output" className="w-full border border-[#e2e8f0] rounded p-1 text-xs" onChange={(e)=> activeId && update(activeId, { output: e.target.value })} />
          </FieldGroup>
          <FieldGroup title="Condition">
            <label className="block text-xs text-slate-600" htmlFor="ri-condition">Go down this path if …</label>
            <textarea id="ri-condition" aria-label="Go down this path if …" className="w-full border border-[#e2e8f0] rounded p-2 h-20 text-xs" onChange={(e)=> activeId && update(activeId, { condition: e.target.value })} />
          </FieldGroup>
          {activeNode && String(activeNode?.type||'').toLowerCase()==='decision' && activeIdStr && (
            <FieldGroup title="Decision Branches">
              <BranchEditor nodeId={activeIdStr} branches={Array.isArray(activeNode?.data?.branches) ? (activeNode?.data?.branches as string[]) : ['No','Yes']} />
            </FieldGroup>
          )}
        </div>
      )}
      {tab==='Testing' && (
        <div className="text-xs text-slate-600 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium">Chat to Generate</div>
            <button data-testid="testing-chat-toggle" className="text-xs rounded border border-[#e2e8f0] px-2 py-0.5" onClick={()=> setChatOpen(v=>!v)}>{chatOpen ? 'Hide' : 'Show'}</button>
          </div>
          {missingConn.length>0 && (
            <div className="rounded-[10px] border border-amber-300 bg-amber-50 p-2 flex items-center justify-between">
              <div className="text-[12px] text-amber-800">Connect required providers to enable Run.</div>
              <div className="flex items-center gap-2">
                <button className="rounded border border-amber-300 bg-white px-2 py-0.5 text-[12px]" onClick={()=> {
                  setConn(prev => { const next = { ...prev }; requiredKeys.forEach(k => { next[k] = 'connected' as any }); try { localStorage.setItem('fp-conn-status', JSON.stringify(next)) } catch {}; return next })
                }}>Connect all</button>
                <button className="rounded border border-amber-300 bg-white px-2 py-0.5 text-[12px]" onClick={()=> {
                  setConn(prev => { const next = { ...prev }; requiredKeys.forEach(k => { next[k] = 'skipped' as any }); try { localStorage.setItem('fp-conn-status', JSON.stringify(next)) } catch {}; return next })
                }}>Skip all</button>
              </div>
            </div>
          )}
          {chatOpen && (
            <div className="rounded border border-[#e2e8f0] bg-white p-2">
              <ChatPanel onGenerate={()=>{ /* no-op for tests */ }} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              className="rounded border border-[#e2e8f0] px-3 py-1 text-white disabled:opacity-50"
              style={{ background: '#0f172a' }}
              disabled={running || dirty || (missingConn.length>0 && !simulated)}
              onClick={runTestOnce}
            >{running?'Running…':'Run'}</button>
            {(dirty || missingConn.length>0) && (
              <button className="rounded border border-amber-300 bg-amber-50 text-amber-800 px-3 py-1 text-xs" disabled={running} onClick={()=>{ setSimulated(true); setLog(l=>[...l, 'Simulated run started (Skip).']); setRunning(true); setTimeout(()=>{ setLog(l=>[...l, 'Simulated run complete.']); setRunning(false) }, 800) }}>Skip (Simulated)</button>
            )}
            <button className="rounded border border-[#e2e8f0] px-3 py-1" onClick={()=> { setLog([]); try { useGraph.getState().resetStatus() } catch {} }}>Clear</button>
            {dirty && <button className="rounded border border-[#e2e8f0] px-2 py-1 text-xs" onClick={()=>{ try { localStorage.setItem('fp-universal-flowdoc', JSON.stringify(flow||{})) } catch {}; try { useGraph.getState().markSaved() } catch {} }}>Save</button>}
          </div>
          {dirty && <div className="text-[11px] text-amber-600">Save-before-Test: You have unsaved changes.</div>}
          {requiredKeys.length>0 && (
            <div className="rounded border border-[#e2e8f0] bg-white p-2">
              <div className="text-[12px] font-medium mb-1">Connections Required</div>
              <div className="grid grid-cols-2 gap-2">
                {requiredKeys.map(k => (
                  <ConnectionTile key={k} name={k} status={(conn[k]||'not-connected') as any} onConnect={()=> handleConnect(k)} onSkip={()=> handleSkip(k)} />
                ))}
              </div>
            </div>
          )}
          <div className="rounded border border-[#e2e8f0] bg-white p-2 h-44 overflow-auto font-mono">
            {log.length===0 ? <div className="text-slate-400">No output yet.</div> : log.map((line,i)=> (<div key={i}>{line}</div>))}
          </div>
          <RunHistoryPanel />
          <div className="flex items-center justify-end">
            <a href="/tasks" className="text-[11px] rounded border border-[#e2e8f0] px-2 py-0.5 text-slate-700">Open Tasks</a>
          </div>
        </div>
      )}
      {tab==='Tasks' && (
        <TasksPanel />
      )}
    </div>
  )
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-[#e2e8f0] bg-white p-3">
      <div className="font-semibold text-[13px] mb-2">{title}</div>
      {children}
    </div>
  )
}

function BranchEditor({ nodeId, branches }: { nodeId: string; branches: string[] }) {
  const rename = useGraph(s=>s.renameBranch)
  const setAll = useGraph(s=>s.setBranches)
  const [items, setItems] = React.useState<string[]>(branches)
  React.useEffect(()=>{ setItems(branches) }, [branches])
  function update(idx: number, value: string) {
    const next = [...items]; const old = next[idx] ?? ''; next[idx] = value; setItems(next); rename(nodeId, old, value)
  }
  function add() { const next = [...items, 'NEW']; setItems(next); setAll(nodeId, next) }
  function remove(i: number) { const next = items.filter((_,idx)=> idx!==i); setItems(next); setAll(nodeId, next) }
  return (
    <div className="space-y-2">
      {items.map((b, i)=> (
        <div key={i} className="flex items-center gap-2">
          <input className="flex-1 border border-[#e2e8f0] rounded px-2 py-1 text-xs" value={b} onChange={(e)=> update(i, e.target.value)} />
          <button className="text-xs rounded border border-[#e2e8f0] px-2 py-1" onClick={()=> remove(i)}>Remove</button>
        </div>
      ))}
      <button className="text-xs rounded border border-[#e2e8f0] px-2 py-1" onClick={add}>Add Branch</button>
    </div>
  )
}

function RunHistoryPanel() {
  const runs = useGraph(s=> s.runHistory)
  const clear = useGraph(s=> s.clearRuns)
  if (!runs || runs.length===0) return (
    <div className="rounded border border-[#e2e8f0] bg-white p-2 text-[11px] text-slate-500">No past runs yet.</div>
  )
  return (
    <div className="rounded border border-[#e2e8f0] bg-white p-2">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-[11px] font-semibold">Recent Runs</div>
        <button className="text-[11px] rounded border border-[#e2e8f0] px-2 py-0.5" onClick={clear}>Clear</button>
      </div>
      <div className="space-y-1 max-h-40 overflow-auto">
        {runs.map((r)=> (
          <div key={r.id} className="rounded border border-[#e2e8f0] p-1">
            <div className="text-[11px] text-slate-600">{new Date(r.startedAt).toLocaleTimeString()}</div>
            <div className="font-mono text-[11px] whitespace-pre-line">{r.lines.join('\n')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TasksPanel() {
  const [items, setItems] = React.useState<Array<{ id: string; status: string; created_at: string }>>([])
  const [loading, setLoading] = React.useState(false)
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const [steps, setSteps] = React.useState<Record<string, any[]>>({})
  const [stepsLoading, setStepsLoading] = React.useState<Record<string, boolean>>({})
  React.useEffect(() => { (async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/runs?limit=10')
      const j = await res.json()
      setItems(j?.items || [])
    } catch {}
    finally { setLoading(false) }
  })() }, [])
  async function toggle(id: string) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!steps[id]) {
      setStepsLoading((m)=> ({ ...m, [id]: true }))
      try {
        const res = await fetch(`/api/runs/${id}/steps`)
        const j = await res.json()
        setSteps((m)=> ({ ...m, [id]: j?.items || [] }))
      } catch {}
      finally { setStepsLoading((m)=> ({ ...m, [id]: false })) }
    }
  }
  return (
    <div className="text-xs text-slate-700 space-y-2">
      {loading && <div className="text-slate-500">Loading…</div>}
      {!loading && items.length===0 && <div className="text-slate-500">No tasks yet.</div>}
      {items.map((it) => (
        <div key={it.id} className="rounded border border-[#e2e8f0] bg-white">
          <button className="w-full text-left px-2 py-1 flex items-center justify-between" onClick={()=> toggle(it.id)}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[#e2e8f0]">{it.status}</span>
              <div className="font-medium">Run {it.id.slice(0,8)}</div>
            </div>
            <div className="text-[11px] text-slate-500">{new Date(it.created_at).toLocaleString()}</div>
          </button>
          {expanded === it.id && (
            <div className="px-2 pb-2">
              {stepsLoading[it.id] && <div className="text-[11px] text-slate-500">Loading steps…</div>}
              {!stepsLoading[it.id] && (steps[it.id]||[]).length===0 && (
                <div className="text-[11px] text-slate-500">No steps found.</div>
              )}
              {!stepsLoading[it.id] && (steps[it.id]||[]).length>0 && (
                <div className="space-y-1">
                  {(steps[it.id]||[]).map((s:any, idx:number)=> (
                    <div key={s.id || idx} className="rounded border border-[#e2e8f0] bg-slate-50 p-1">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-[11px]">{String(s.name || s.node_id || 'step')}</div>
                        <div className="text-[11px] text-slate-500">{(s.duration_ms||s.durationMs) ? `${s.duration_ms||s.durationMs} ms` : ''}</div>
                      </div>
                      {s.error && <div className="text-[11px] text-rose-600">{String(s.error)}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}


