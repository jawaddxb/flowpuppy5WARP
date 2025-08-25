"use client"
import React, { useRef, useState } from 'react'
import { mergeDslIntoGraph } from '@/lib/graphMerge'
import { useGraphStore } from '@/store/graph'

type Msg = { role: 'user'|'assistant'; content: string }

export default function ChatPanelThreaded() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const lastDslRef = useRef<any | null>(null)

  async function send() {
    const text = input.trim()
    if (!text) return
    setMsgs(m => [...m, { role: 'user', content: text }])
    setInput('')
    setPending(true)
    try {
      const context = { history: msgs.slice(-6), intent: 'refine' }
      const res = await fetch('/api/ai/generate-workflow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text, context }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed')
      lastDslRef.current = data?.dsl || null
      setMsgs(m => [...m, { role: 'assistant', content: data?.rationale || 'Drafted workflow.' }])
    } catch (e: any) {
      setMsgs(m => [...m, { role: 'assistant', content: 'Error: ' + String(e?.message || e) }])
    } finally {
      setPending(false)
    }
  }

  function applyPatch() {
    const dsl = lastDslRef.current
    if (!dsl?.nodes || !dsl?.edges) return
    const { nodes, edges } = useGraphStore.getState() as any
    const merged = mergeDslIntoGraph(dsl.nodes, dsl.edges, nodes, edges)
    // @ts-ignore
    useGraphStore.getState().setGraph(merged.nodes, merged.edges)
  }

  return (
    <div className="space-y-2">
      <div className="rounded border border-fp-border bg-white p-2 max-h-60 overflow-auto text-sm">
        {msgs.length === 0 && <div className="text-xs text-slate-500">Start a conversation to build or refine your workflow.</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`mb-1 ${m.role === 'user' ? 'text-slate-800' : 'text-slate-600'}`}>
            <span className="uppercase text-[10px] tracking-wide mr-1">{m.role}</span>
            <span className="whitespace-pre-wrap">{m.content}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2" onKeyDown={(e)=> e.stopPropagation()}>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Describe changes or a new goal" className="flex-1 border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-sm" />
        <button onClick={send} disabled={pending} className="px-3 py-1 rounded border border-fp-border bg-white text-sm">{pending ? 'Sending…' : 'Send'}</button>
        <button onClick={applyPatch} className="px-3 py-1 rounded border border-fp-border bg-white text-sm">Apply Patch</button>
      </div>
    </div>
  )
}



