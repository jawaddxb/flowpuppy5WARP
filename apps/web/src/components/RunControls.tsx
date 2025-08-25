"use client"
import React, { useEffect, useState } from 'react'
import { toDsl, validateDsl } from '@/lib/dsl'
import { useGraphStore } from '@/store/graph'
import { useSimStore } from '@/store/sim'

export default function RunControls({ workflowId }: { workflowId: string | null }) {
  const graph = useGraphStore(s => ({ nodes: s.nodes, edges: s.edges }))
  const [log, setLog] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const sim = useSimStore()
  const [connMissing, setConnMissing] = useState<string[]>([])
  const [simulated, setSimulated] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/providers/status')
        const data = await res.json()
        const st = (data?.status || {}) as Record<string, 'connected'|'missing'|'error'>
        const missing = Object.entries(st).filter(([,v])=> v!=='connected').map(([k])=> k)
        setConnMissing(missing)
      } catch {}
    })()
  }, [])
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {simulated && (
          <div className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-300 text-xs" title="Running without real connections">Simulated</div>
        )}
        <button data-run className="px-3 py-1 rounded border border-fp-border bg-white text-sm" disabled={running} onClick={async ()=>{
          if (connMissing.length && !simulated) {
            setLog(l=>[...l, 'Blocked: missing connections. Use Skip (Simulated) or connect providers.'])
            return
          }
          const dsl = toDsl(graph.nodes as any, graph.edges as any)
          const val = validateDsl(dsl)
          if (!val.ok) {
            setLog(l=>[...l, 'Cannot run: graph invalid'])
            return
          }
          setRunning(true)
          sim.start(graph.nodes as any, graph.edges as any)
          setLog(l=>[...l, 'Run: started'])
          try {
            const res = await fetch('/api/run/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowId: workflowId || undefined, dsl, input: {}, options: { maxRuntimeMs: 60000 } }) })
             const reader = res.body?.getReader()
            if (!reader) return
            const dec = new TextDecoder()
            let buf = ''
            while (true) {
              const { value, done } = await reader.read()
              if (done) break
              buf += dec.decode(value, { stream: true })
              const parts = buf.split('\n\n')
              buf = parts.pop() || ''
              for (const p of parts) {
                const line = p.replace(/^data:\s*/, '')
                if (!line) continue
                try {
                  const ev = JSON.parse(line)
                  if (ev.type === 'step') { setLog(l=>[...l, `Step ${ev.nodeId}: ${ev.status} (${ev.durationMs}ms)`]); sim.step(ev, graph.edges as any) }
                  if (ev.type === 'end') { setLog(l=>[...l, 'Run: finished']); sim.end() }
                } catch {}
              }
            }
          } finally { setRunning(false) }
        }}>Run</button>
        {!!connMissing.length && !simulated && (
          <button className="px-3 py-1 rounded border border-amber-300 bg-amber-50 text-amber-700 text-sm" disabled={running} onClick={()=>{ setSimulated(true); setLog(l=>[...l, `Simulated: skipping connections (${connMissing.join(', ')})`]) }}>Skip (Simulated)</button>
        )}
        <button className="px-3 py-1 rounded border border-fp-border bg-white text-sm" disabled={running} onClick={async ()=>{
          // Pure local simulation for reliable animation
          setRunning(true)
          sim.start(graph.nodes as any, graph.edges as any)
          setLog(l=>[...l, 'Demo: local simulation'])
          // Simple topological order
          const nodes = (graph.nodes as any[])
          const edges = (graph.edges as any[])
          const inDeg = new Map<string, number>()
          nodes.forEach((n:any)=> inDeg.set(n.id, 0))
          edges.forEach((e:any)=> inDeg.set(e.target, (inDeg.get(e.target)||0) + 1))
          const q: string[] = []
          inDeg.forEach((deg, id)=> { if (deg===0) q.push(id) })
          const order: string[] = []
          while (q.length) {
            const id = q.shift() as string
            order.push(id)
            edges.filter((e:any)=> e.source===id).forEach((e:any)=>{
              const d = (inDeg.get(e.target)||0) - 1
              inDeg.set(e.target, d)
              if (d===0) q.push(e.target)
            })
          }
          const seq = order.length ? order : nodes.map((n:any)=> n.id)
          // sequential: enforce ~15s per step
          // per-step demo duration (ms) from UI slider, default 5000
          const perStep = Number((document.getElementById('fp-demo-duration') as HTMLInputElement | null)?.value) || 5000
          for (const id of seq) {
            // @ts-ignore
            sim.step({ nodeId: id, status: 'ok', durationMs: perStep } as any, edges as any)
            await new Promise((r)=> setTimeout(r, perStep + 100))
          }
          sim.end()
          setRunning(false)
          setLog(l=>[...l, 'Demo: finished'])
        }}>Demo Run</button>
        <div className="text-xs text-slate-500">Workflow ID (optional): {workflowId || '—'}</div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <label className="text-slate-600">Speed</label>
        <input type="range" min={0.25} max={2} step={0.25} defaultValue={0.75}
          onChange={(e)=>{
            const v = Number(e.target.value)
            useSimStore.getState().setSpeed(v)
          }} />
        <span className="text-slate-500">slow ←→ fast</span>
        <span className="ml-3 text-slate-600">Per‑step (demo):</span>
        <input id="fp-demo-duration" type="range" min={2000} max={15000} step={1000} defaultValue={5000} />
        <span className="text-slate-500">2s–15s</span>
      </div>
      <div className="rounded border border-fp-border bg-white p-2 max-h-40 overflow-auto text-xs">
        {log.map((l, i)=> <div key={i}>{l}</div>)}
      </div>
    </div>
  )
}


