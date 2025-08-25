"use client"
import React from 'react'
import { useGraph } from '@/agentStage/graph/store'
import { deriveRequiredProviders } from '@/lib/connections'
import { flowDocToDsl } from '@/lib/flowdoc/adapter'

export default function TestSheet({ open, onClose }: { open: boolean; onClose: ()=>void }) {
  const flow = useGraph(s=> s.flow)
  const dirty = useGraph(s=> s.dirty as any)
  const setActive = useGraph(s=> s.setActiveNode)
  const [selected, setSelected] = React.useState<string>('')
  const [log, setLog] = React.useState<string[]>([])
  const [running, setRunning] = React.useState(false)
  const [requiredKeys, setRequiredKeys] = React.useState<string[]>([])
  const [conn, setConn] = React.useState<Record<string, 'not-connected'|'connected'|'error'|'skipped'>>(()=>{
    try { const raw = localStorage.getItem('fp-conn-status'); if (raw) return JSON.parse(raw) } catch {}
    return {}
  })
  const [simulated, setSimulated] = React.useState(false)
  React.useEffect(() => {
    const inputs = (flow.nodes||[]).filter((n:any)=> ['input','trigger','webhook','schedule'].includes(String(n.type||'').toLowerCase()))
    if (inputs.length && !selected) setSelected(inputs[0].id)
  }, [flow, selected])
  React.useEffect(()=>{
    let alive = true
    ;(async ()=>{
      try {
        const req = deriveRequiredProviders(flow as any) as string[]
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
  const missingConn = requiredKeys.filter(k => !(conn[k]==='connected' || conn[k]==='skipped'))
  if (!open) return null
  function handleConnect(id: string) { setConn(prev => { const next = { ...prev, [id]: 'connected' as const }; try { localStorage.setItem('fp-conn-status', JSON.stringify(next)) } catch {}; return next }) }
  function handleSkip(id: string) { setConn(prev => { const next = { ...prev, [id]: 'skipped' as const }; try { localStorage.setItem('fp-conn-status', JSON.stringify(next)) } catch {}; return next }) }
  async function run() {
    if (dirty) {
      setLog((l)=> [
        ...l,
        'Save-before-Test: You have unsaved changes.',
        'Skip (Simulated) available: run with mock data; results will not be persisted.'
      ])
      return
    }
    if (missingConn.length && !simulated) {
      setLog((l)=> [
        ...l,
        `Blocked: missing connections (${missingConn.join(', ')}). Connect or use Skip (Simulated).`
      ])
      return
    }
    setRunning(true); setLog([])
    try { (useGraph as any).getState?.().resetStatus() } catch {}
    try {
      const dsl = flowDocToDsl(flow as any)
      const res = await fetch('/api/run/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dsl, input: {}, options: { maxRuntimeMs: 60000 } }) })
      const reader = res.body?.getReader(); const decoder = new TextDecoder()
      if (!reader) { setRunning(false); return }
      while (true) {
        const { value, done } = await reader.read(); if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const parts = chunk.split('\n\n').filter(Boolean)
        for (const p of parts) {
          const line = p.replace(/^data:\s*/, '')
          if (!line) continue
          try {
            const ev = JSON.parse(line)
            if (ev.type === 'step') {
              const id = String(ev.nodeId||'')
              setLog(l=> [...l, `Step ${id}: ${ev.status} (${ev.durationMs||''}ms)`])
              try { (useGraph as any).getState?.().setNodeStatus(id, ev.status) } catch {}
              if (ev.status === 'error') {
                try { (useGraph as any).getState?.().setActiveNode(id) } catch {}
              }
            }
            if (ev.type === 'end') { setLog(l=> [...l, `Run finished: ${ev.ok?'ok':'error'}`]) }
          } catch {
            // non-JSON chunks are ignored
          }
        }
      }
    } catch { setLog(l=> [...l, 'error: failed to run']) }
    setRunning(false)
  }
  function editConfiguration() {
    // Focus the first node for now
    const first = (flow.nodes||[])[0]
    if (first) setActive(first.id)
    onClose()
  }
  const inputNodes = (flow.nodes||[]).filter((n:any)=> ['input','trigger','webhook','schedule'].includes(String(n.type||'').toLowerCase()))
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[384px] bg-white border-l border-[#e2e8f0] shadow-xl overflow-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#e2e8f0]">
          <div className="text-sm font-semibold">Test</div>
          <div className="flex items-center gap-2">
            <button
              disabled={running || (missingConn.length>0 && !simulated)}
              className="text-xs rounded border border-[#e2e8f0] px-3 py-1 text-white disabled:opacity-50"
              style={{ background: '#0f172a' }}
              onClick={run}
            >{running? 'Running…' : 'Run'}</button>
            {(dirty || missingConn.length>0) && (
              <button
                disabled={running}
                className="text-xs rounded border border-amber-300 bg-amber-50 text-amber-800 px-2 py-0.5"
                onClick={()=>{ setSimulated(true); setLog(l=>[...l, 'Simulated run started (Skip).']); setRunning(true); setTimeout(()=>{ setLog(l=>[...l, 'Simulated run complete.']); setRunning(false) }, 800) }}
              >Skip (Simulated)</button>
            )}
            <button className="text-xs rounded border border-[#e2e8f0] px-2 py-0.5" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="p-3 space-y-2 text-sm">
          <div>
            <div className="text-[12px] text-[#475569] mb-1">Trigger/Input</div>
            <select className="w-full rounded border border-[#e2e8f0] p-1 text-xs" value={selected} onChange={(e)=> setSelected(e.target.value)}>
              {inputNodes.map((n:any)=> (<option key={n.id} value={n.id}>{n.title||n.id}</option>))}
            </select>
          </div>
          {requiredKeys.length>0 && (
            <div className="rounded border border-[#e2e8f0] bg-white p-2">
              <div className="text-[12px] font-medium mb-1">Connections Required</div>
              <div className="space-y-1">
                {requiredKeys.map(k => (
                  <div key={k} className="flex items-center justify-between text-[12px]">
                    <div>{k}</div>
                    <div className="flex items-center gap-2">
                      <span className={`${conn[k]==='connected'?'bg-emerald-50 text-emerald-700 border border-emerald-300': conn[k]==='skipped'?'bg-amber-50 text-amber-700 border border-amber-300':'bg-slate-100 text-slate-700 border border-slate-300'} px-1 rounded`}>{conn[k]||'not-connected'}</span>
                      {conn[k] !== 'connected' && <button className="px-2 py-0.5 rounded border border-[#e2e8f0]" onClick={()=> handleConnect(k)}>Connect</button>}
                      {conn[k] !== 'skipped' && <button className="px-2 py-0.5 rounded border border-[#e2e8f0]" onClick={()=> handleSkip(k)}>Skip</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              disabled={running || (missingConn.length>0 && !simulated)}
              className="rounded border border-[#e2e8f0] px-3 py-1 text-white disabled:opacity-50"
              style={{ background: '#0f172a' }}
              onClick={run}
            >{running? 'Running…' : 'Run'}</button>
            {(dirty || missingConn.length>0) && (
              <button
                disabled={running}
                className="text-xs rounded border border-amber-300 bg-amber-50 text-amber-800 px-2 py-0.5"
                onClick={()=>{ setSimulated(true); setLog(l=>[...l, 'Simulated run started (Skip).']); setRunning(true); setTimeout(()=>{ setLog(l=>[...l, 'Simulated run complete.']); setRunning(false) }, 800) }}
              >Skip (Simulated)</button>
            )}
            <button className="rounded border border-[#e2e8f0] px-3 py-1" onClick={()=> setLog([])}>Clear</button>
          </div>
          <div className="rounded border border-[#e2e8f0] bg-white p-2 h-56 overflow-auto font-mono text-[11px]">
            {log.length===0 ? <div className="text-[#94a3b8]">No output yet.</div> : log.map((line,i)=> (<div key={i}>{line}</div>))}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-[#475569]">On failure:</div>
            <button className="text-[11px] rounded border border-[#e2e8f0] px-2 py-0.5" onClick={editConfiguration}>Edit configuration</button>
          </div>
        </div>
      </div>
    </div>
  )
}



