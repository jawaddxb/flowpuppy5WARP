"use client"
import React, { useEffect, useRef, useState } from 'react'

export default function ChatPanel({ onGenerate }: { onGenerate: (dsl: any, rationale: string, meta?: { missingSecrets?: string[]; confidence?: number }) => void }) {
  const [prompt, setPrompt] = useState('')
  const [log, setLog] = useState<string[]>([])
  const [plan, setPlan] = useState<Array<{ n: string; title: string; tag?: string }>>([])
  const [selections, setSelections] = useState<Record<string, any>>({})
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const [lastDsl, setLastDsl] = useState<any | null>(null)
  const [lastRationale, setLastRationale] = useState('')
  const [refineText, setRefineText] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{ type: string; label: string; defaults?: any }>>([])

  async function startStream() {
    setLog([])
    setStreaming(true)
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const url = `/api/chat/stream?prompt=${encodeURIComponent(prompt)}`
    const res = await fetch(url, { signal: ctrl.signal })
    const reader = res.body?.getReader()
    if (!reader) { setStreaming(false); return }
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
        if (line.startsWith('[[DSL]]')) {
          try {
            const json = JSON.parse(line.replace('[[DSL]]','').trim())
            setLastDsl(json)
            setLastRationale('Generated draft from explanation stream')
            onGenerate(json, 'Generated draft from explanation stream')
          } catch {}
          continue
        }
        setLog((l)=> [...l, line])
      }
    }
    setStreaming(false)
  }

  async function generate() {
    const res = await fetch('/api/ai/generate-workflow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
    const data = await res.json()
    if (!res.ok) return alert(data?.error || 'Failed')
    setLastDsl(data?.dsl || null)
    setLastRationale(data?.rationale || '')
    onGenerate(data?.dsl, data?.rationale || '', { missingSecrets: data?.missingSecrets, confidence: data?.confidence })
    try {
      // Build a minimal plan block for UI: derive steps from DSL node titles if present
      const steps = Array.isArray((data?.dsl?.nodes)) ? (data.dsl.nodes as any[]).slice(0,4).map((n, i)=> ({ n: String(i+1), title: String(n.title||n.type||'Step'), tag: n.data?.provider ? `[${n.data.provider}]` : undefined })) : []
      setPlan(steps)
    } catch {}
  }

  useEffect(() => {
    ;(async () => {
      if (!prompt || prompt.length < 3) { setSuggestions([]); return }
      try {
        const res = await fetch('/api/nodes/templates')
        const data = await res.json()
        const items: Array<{ type: string; label: string; defaults?: any }> = (data.templates || [])
        const q = prompt.toLowerCase()
        const ranked = items.filter(it => (it.label || '').toLowerCase().includes(q) || it.type.toLowerCase().includes(q)).slice(0,6)
        setSuggestions(ranked)
      } catch { setSuggestions([]) }
    })()
  }, [prompt])

  async function saveAsTestCase() {
    if (!lastDsl) return alert('Generate a workflow first')
    const title = promptTitle('Title for test case')
    if (!title) return
    const res = await fetch('/api/test-cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, prompt, dsl: lastDsl, notes: lastRationale }) })
    if (!res.ok) {
      const data = await res.json().catch(()=>({}))
      return alert(data?.error || 'Failed to save test case')
    }
    alert('Saved test case')
  }

  function promptTitle(msg: string) {
    try { return window.prompt(msg, 'Workflow Test') || '' } catch { return '' }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2" onKeyDown={(e)=> e.stopPropagation()}>
        <input className="flex-1 border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-sm" placeholder="Describe the workflow you want" value={prompt} onChange={e=>setPrompt(e.target.value)} />
        <button className="px-3 py-1 rounded border border-fp-border bg-white text-sm" onClick={generate}>Generate</button>
        <button className="px-3 py-1 rounded border border-fp-border bg-white text-sm" onClick={startStream} disabled={streaming}>{streaming ? 'Streaming…' : 'Explain'}</button>
      </div>
      {lastDsl && (
        <div className="flex gap-2" onKeyDown={(e)=> e.stopPropagation()}>
          <input className="flex-1 border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-xs" placeholder="Refine (e.g., make switch on status and add Slack alert)" value={refineText} onChange={e=>setRefineText(e.target.value)} />
          <button className="px-3 py-1 rounded border border-fp-border bg-white text-xs" onClick={async ()=>{
            // MVP refine: just re-run generate with appended instructions
            const res = await fetch('/api/ai/generate-workflow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt + '. ' + refineText }) })
            const data = await res.json()
            if (!res.ok) return alert(data?.error || 'Failed')
            setLastDsl(data?.dsl || null)
            setLastRationale(data?.rationale || '')
            onGenerate(data?.dsl, data?.rationale || '')
          }}>Refine</button>
        </div>
      )}
      <div className="flex gap-2">
        <button className="px-3 py-1 rounded border border-fp-border bg-white text-xs" onClick={saveAsTestCase} disabled={!lastDsl}>Save as Test Case</button>
      </div>
      <div className="text-xs text-slate-700 space-y-1 max-h-40 overflow-auto">
        {log.map((l, i)=> <div key={i}>{l}</div>)}
      </div>
      {plan.length > 0 && (
        <div className="mt-2 border border-fp-border rounded p-2">
          <div className="text-xs font-medium mb-1">Proposed Workflow</div>
          <ol className="list-decimal ml-4 text-xs space-y-0.5">
            {plan.map((s)=> (
              <li key={s.n}><span className="font-medium">{s.title}</span> {s.tag ? <span className="text-slate-500">{s.tag}</span> : null}</li>
            ))}
          </ol>
          <div className="mt-2 flex items-center gap-2">
            <button className="px-2 py-1 text-xs rounded border border-fp-border" onClick={async ()=>{
              // Confirm → AgentSpec
              const res = await fetch('/api/agent/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, selections }) })
              const data = await res.json()
              if (!res.ok) return alert(data?.error || 'Confirm failed')
              // Generate → FlowDoc
              const gen = await fetch('/api/agent/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentSpec: data.agentSpec }) })
              const g = await gen.json()
              if (!gen.ok) return alert(g?.error || 'Generate failed')
              setLastDsl(g.flowDoc)
              onGenerate(g.flowDoc, 'Generated from confirmed plan')
            }}>Proceed</button>
            <button className="px-2 py-1 text-xs rounded border border-fp-border" onClick={()=> setPlan([])}>Discard</button>
          </div>
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {suggestions.map((s,i)=> (
            <button key={`${s.type}-${i}`} className="text-xs px-2 py-1 rounded border border-fp-border bg-white" onClick={()=>{
              try { (window as any).flowCanvasApi?.quickAdd?.({ type: s.type, label: s.label, defaults: s.defaults || {} }) } catch {}
            }}>{s.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}


