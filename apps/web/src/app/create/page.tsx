"use client"
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGraphStore } from '@/store/graph'
import { fromDsl, type WorkflowDsl } from '@/lib/dsl'
import { structureAndConnectLinear, structureWithDecisionHeuristics } from '@/lib/structure'
import LiveSketchPanel from '@/components/LiveSketchPanel'
import PlanStepCard from '@/components/PlanStepCard'
import ChatBubble from '@/components/ChatBubble'
import OnboardingModal from '@/components/OnboardingModal'

export default function CreateChatPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [explaining, setExplaining] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [thread, setThread] = useState<Array<{ role: 'user'|'assistant'; content: string; steps?: Array<{ type: string; title: string; description: string }> }>>([])
  const [dsl, setDsl] = useState<WorkflowDsl | null>(null)
  const [rationale, setRationale] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const [steps, setSteps] = useState<Array<{ type: string; title: string; description: string }>>([])
  const [detailsOpen, setDetailsOpen] = useState<'details'|'json'|'issues'>('details')
  const [leftTab, setLeftTab] = useState<'conversation'|'plan'|'developer'>(()=>{
    if (typeof window==='undefined') return 'conversation'
    try { return (localStorage.getItem('fp-left-tab') as any) || 'conversation' } catch { return 'conversation' }
  })
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  // Show onboarding on first visit when not dismissed; no auto seeding. Support ?prompt auto-run.
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('fp-onboarding-dismissed')==='1'
      if (!dismissed) setShowOnboarding(true)
      const url = new URL(window.location.href)
      const q = url.searchParams.get('prompt')
      if (q) {
        setShowOnboarding(false)
        setPrompt(q)
        setTimeout(()=> explain(q), 200)
      }
    } catch {}
  }, [])
  function inferMissingSecretsLocal(d: WorkflowDsl | null): string[] {
    if (!d?.nodes) return []
    const secrets = new Set<string>()
    for (const n of d.nodes as any[]) {
      const cfg = (n as any).config || {}
      for (const [k, v] of Object.entries(cfg)) {
        const key = k.toLowerCase()
        if (key.includes('token') || key.includes('api') || key.includes('secret')) {
          if (!v || typeof v !== 'string') {
            if ((n as any).type === 'slack') secrets.add('SLACK_TOKEN')
            else if ((n as any).type === 'discord') secrets.add('DISCORD_TOKEN')
            else secrets.add('API_KEY')
          }
        }
        if (key === 'headers' && typeof v === 'object' && v) {
          const auth = (v as any)['Authorization'] as string | undefined
          if (auth && /\$\{([A-Z0-9_]+)\}/.test(auth)) {
            const m = auth.match(/\$\{([A-Z0-9_]+)\}/)
            if (m && m[1]) secrets.add(m[1])
          }
        }
      }
    }
    return Array.from(secrets)
  }

  async function explain(forcePrompt?: string) {
    setExplaining(true)
    setLog([])
    const usedPrompt = (forcePrompt ?? prompt) || 'Create a workflow'
    setThread((t)=> [...t, { role: 'user', content: usedPrompt }])
    setSteps([])
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const currentOrg = (()=>{ try { return localStorage.getItem('fp-current-org-id') || '' } catch { return '' } })()
    const ctx = { thread }
    const url = `/api/chat/stream?prompt=${encodeURIComponent(usedPrompt)}${currentOrg ? `&orgId=${encodeURIComponent(currentOrg)}` : ''}&context=${encodeURIComponent(JSON.stringify(ctx))}`
    const res = await fetch(url, { signal: ctrl.signal })
    const reader = res.body?.getReader()
    if (!reader) { setExplaining(false); return }
    const dec = new TextDecoder()
    let buf = ''
    let lastNarrative = ''
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
            const structured = structureWithDecisionHeuristics(structureAndConnectLinear(json))
            setDsl(structured)
            setRationale('Draft from planning stream')
          } catch {}
          continue
        }
        // Ignore raw JSON/text chunks from model to keep chat clean
        if (/^\s*[\[{]/.test(line) || /"nodes"\s*:/.test(line)) {
          continue
        }
        setLog((l)=> [...l, line])
        // Accumulate assistant narrative in a single bubble per stream and embed step cards
        setThread((t)=> {
          const copy = [...t]
          const last = copy[copy.length-1]
          if (!last || last.role !== 'assistant') {
            copy.push({ role: 'assistant', content: line })
          } else {
            // De-duplicate consecutive narrative lines
            if (line !== lastNarrative && !last.content.split(/\n/).includes(line)) {
              last.content = (last.content + '\n' + line).trim()
            }
            lastNarrative = line
            // Detect bullets and numbered steps → step cards
            if (/^•\s/i.test(line) || /^\d+\./.test(line)) {
              const txt = line.replace(/^(?:•|\d+\.)\s*/, '')
              const lower = txt.toLowerCase()
              let type = 'transform'
              if (lower.includes('webhook') || lower.includes('trigger')) type = 'input'
              else if (lower.includes('http') || lower.includes('twitter')) type = 'http'
              else if (lower.includes('email')) type = 'email'
              else if (lower.includes('slack')) type = 'slack'
              else if (lower.includes('switch') || lower.includes('case')) type = 'switch'
              else if (lower.includes('parallel')) type = 'parallel'
              else if (lower.includes('join')) type = 'join'
              else if (lower.includes('delay')) type = 'delay'
              else if (lower.includes('notion')) type = 'notion'
              else if (lower.includes('sheets')) type = 'sheets'
              else if (lower.includes('airtable')) type = 'airtable'
              else if (lower.includes('discord')) type = 'discord'
              const existing = new Set((last.steps||[]).map(s=> (s as any).description?.trim?.() || ''))
              if (!existing.has(txt.trim())) {
                // Friendlier title: sentence-case without trailing punctuation
                const titleRaw = (txt.split(':')[0] || type).trim()
                const title = titleRaw.charAt(0).toUpperCase() + titleRaw.slice(1).replace(/[.:\s]+$/,'')
                last.steps = [...(last.steps||[]), { type, title, description: txt }]
              }
            }
            copy[copy.length-1] = last
          }
          return copy
        })
      }
    }
    setExplaining(false)
  }

  async function generate() {
    const res = await fetch('/api/ai/generate-workflow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
    const data = await res.json()
    if (!res.ok) return alert(data?.error || 'Failed')
    setDsl(data?.dsl || null)
    setRationale(data?.rationale || '')
  }

  function clearAll() {
    if (!window.confirm('Clear conversation and canvas? This cannot be undone.')) return
    try { abortRef.current?.abort() } catch {}
    setExplaining(false)
    setThread([])
    setDsl(null)
    setPrompt('')
    setSteps([])
    setRationale('')
    try {
      localStorage.removeItem('fp-chat')
      localStorage.removeItem('fp-thread')
      localStorage.removeItem('fp-last-dsl')
      localStorage.removeItem('fp-onboarding-dismissed')
    } catch {}
    try {
      // @ts-ignore
      useGraphStore.getState().setGraph([], [])
    } catch {}
  }

  function openInBuilder() {
    if (!dsl?.nodes || !dsl?.edges) return alert('Generate first')
    // Convert DSL → ReactFlow graph and push to store, then navigate
    try { localStorage.setItem('fp-last-dsl', JSON.stringify(dsl)) } catch {}
    try { localStorage.setItem('fp-thread', JSON.stringify(thread)) } catch {}
    try { localStorage.setItem('fp-chat', JSON.stringify({ thread, dsl, prompt, leftTab, detailsOpen })) } catch {}
    try { localStorage.setItem('fp-apply-layout', '1') } catch {}
    router.push('/builder')
  }

  // Restore last DSL and conversation if coming back from Builder
  useEffect(() => {
    try {
      let restoredThread = false
      const thr = localStorage.getItem('fp-thread')
      if (thr) {
        const parsedT = JSON.parse(thr)
        if (Array.isArray(parsedT) && parsedT.length) {
          setThread(parsedT)
          restoredThread = true
        }
      }
      const full = localStorage.getItem('fp-chat')
      if (full) {
        const j = JSON.parse(full)
        if (!restoredThread && Array.isArray(j.thread) && j.thread.length) {
          setThread(j.thread)
          restoredThread = true
        }
        if (j.dsl) setDsl(j.dsl)
        if (typeof j.prompt === 'string') setPrompt(j.prompt)
        if (j.leftTab) setLeftTab(j.leftTab)
        if (j.detailsOpen) setDetailsOpen(j.detailsOpen)
      }
      if (!dsl) {
        const raw = localStorage.getItem('fp-last-dsl')
        if (raw) {
          const parsed = JSON.parse(raw)
          setDsl(parsed)
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist conversation thread as it updates
  useEffect(() => {
    try { localStorage.setItem('fp-thread', JSON.stringify(thread)) } catch {}
    try { localStorage.setItem('fp-chat', JSON.stringify({ thread, dsl, prompt, leftTab, detailsOpen })) } catch {}
  }, [thread])

  useEffect(() => {
    try { localStorage.setItem('fp-chat', JSON.stringify({ thread, dsl, prompt, leftTab, detailsOpen })) } catch {}
  }, [dsl, prompt, leftTab, detailsOpen])

  useEffect(() => {
    const t = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 10)
    return () => clearTimeout(t)
  }, [thread])

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <OnboardingModal open={showOnboarding && thread.length===0 && !prompt} onClose={()=>{ setShowOnboarding(false); try{localStorage.setItem('fp-onboarding-dismissed','1')}catch{}}}
        context="create"
        samples={[
          { id:'energy', icon:'⚡️', title:'Energy Optimizer', description:'Analyze prices + weather and decide charge/sell; email me.', prompt:'Build an energy optimizer that checks power prices and weather, decides when to charge or sell, and emails me the action.' },
          { id:'twitter', icon:'🐦', title:'Twitter Sentiment → Slack', description:'Track a topic; summarize and post to Slack.', prompt:'Monitor Twitter for mentions of “FlowPuppy”, summarize sentiment with LLM, and post a digest to Slack.' },
          { id:'webhook', icon:'🧩', title:'Webhook → Transform → Email', description:'Parse incoming data and notify me.', prompt:'When a webhook is received, transform JSON into a readable summary and email it to me.' },
          { id:'report', icon:'🗂️', title:'Weekly Report → Notion', description:'Summarize and store a weekly report.', prompt:'Every Friday, generate a weekly report from sample metrics and store it in Notion.' },
          { id:'nft', icon:'🪙', title:'NFT Holder Check → Discord', description:'Verify NFT ownership; grant role via Discord API.', prompt:'Given a wallet address, verify NFT ownership of contract 0x... on chain Ethereum; if holder, call Discord API to assign “Holder” role.' },
          { id:'dex', icon:'📈', title:'Token Price Alert → Telegram', description:'Alert when token crosses threshold.', prompt:'Poll token XYZ from a DEX API every 5 min; if price crosses $1.25, send a Telegram message with the change and chart link.' },
        ]}
        onTrySample={(p)=> { setShowOnboarding(false); setPrompt(p); setThread(t=> t.length? t : [{ role:'assistant', content: 'I will plan this and sketch it live.' }]); setTimeout(()=> explain(p), 200) }} />
      <div className="xl:col-span-2 rounded-[var(--radius-lg)] border border-fp-border bg-fp-surface p-4 min-h-[60vh] shadow-fp-1">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Plan Conversation</div>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={generate} className="px-3 py-1 rounded border border-fp-border bg-white">Generate</button>
            <button onClick={()=> explain()} className="px-3 py-1 rounded border border-fp-border bg-white" disabled={explaining}>{explaining ? 'Explaining…' : 'Explain'}</button>
            <button onClick={openInBuilder} className="px-3 py-1 rounded bg-fp-primary text-white">Accept Plan</button>
          <button onClick={clearAll} className="px-3 py-1 rounded border border-fp-border bg-white">Clear</button>
          </div>
        </div>
        {/* Tabs: Conversation | Plan | Developer */}
        <div className="mb-2 flex items-center gap-2 text-sm">
          {(['conversation','plan','developer'] as const).map(t => (
            <button key={t} onClick={()=>{ setLeftTab(t); try{localStorage.setItem('fp-left-tab', t)}catch{}}} className={`px-2 py-1 rounded border ${leftTab===t ? 'border-fp-primary text-fp-primary' : 'border-fp-border'}`}>{t==='conversation'?'Conversation':t==='plan'?'Plan':'Developer'}</button>
          ))}
        </div>
        {leftTab === 'conversation' && (
        <div className="flex flex-col h-[68vh]">
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
            {thread.length === 0 && (
              <ChatBubble role="assistant" subtitle="Assistant">Tell me what you want to build. I will plan it and sketch it on the right in real time.</ChatBubble>
            )}
            {thread.map((m, i)=> (
              <ChatBubble key={i} role={m.role} subtitle={m.role==='assistant'?'Assistant':'You'} avatar={m.role==='assistant'?'AI':''} avatarUrl={m.role==='assistant' ? '/puppy.svg' : undefined}>
                {m.content}
                {m.role==='assistant' && m.steps && m.steps.length>0 && (
                  <div className="mt-2 space-y-2">
                    {m.steps.map((s, j)=> (
                      <PlanStepCard key={`${i}-${j}-${s.title}`} idx={j+1} type={s.type} title={s.title} description={s.description} />
                    ))}
                  </div>
                )}
              </ChatBubble>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="pt-2 border-t border-fp-border sticky bottom-0 bg-fp-surface/95 backdrop-blur supports-[backdrop-filter]:bg-fp-surface/80">
            <div className="flex flex-wrap gap-2 text-xs mb-1">
              {['Add a daily schedule','Use Twitter API v2','Summarize with LLM','Notify Slack'].map(lbl => (
                <button key={lbl} className="px-2 py-1 rounded border border-fp-border bg-white" onClick={()=>{ setPrompt(p => (p ? p + '. ' + lbl : lbl)); }}>{lbl}</button>
              ))}
            </div>
            <div className="flex items-start gap-2" onKeyDown={(e)=> { if ((e as any).key === 'Enter' && !(e as any).shiftKey) { e.preventDefault(); explain() } }}>
              <textarea rows={2} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Type a message… (Enter to send, Shift+Enter for newline)" className="flex-1 border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-sm resize-y" />
              <div className="flex flex-col gap-1">
                {!explaining && <button onClick={()=> explain()} className="px-3 py-1 rounded bg-fp-primary text-white">Send</button>}
                {explaining && <button onClick={()=>{ abortRef.current?.abort(); setExplaining(false) }} className="px-3 py-1 rounded border border-fp-border">Stop</button>}
                <button onClick={generate} className="px-3 py-1 rounded border border-fp-border bg-white">Generate</button>
                <button onClick={openInBuilder} disabled={!dsl} className={`px-3 py-1 rounded ${dsl ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>Accept</button>
              </div>
            </div>
          </div>
        </div>
        )}
        {leftTab === 'plan' && (
          <div className="h-[68vh] overflow-auto">
            <div className="flex items-center gap-2 text-xs">
              <button className={`px-2 py-1 rounded border ${detailsOpen==='details'?'border-fp-primary text-fp-primary':'border-fp-border'}`} onClick={()=> setDetailsOpen('details')}>Overview</button>
              <button className={`px-2 py-1 rounded border ${detailsOpen==='json'?'border-fp-primary text-fp-primary':'border-fp-border'}`} onClick={()=> setDetailsOpen('json')}>Fine‑tune</button>
              <button className={`px-2 py-1 rounded border ${detailsOpen==='issues'?'border-fp-primary text-fp-primary':'border-fp-border'}`} onClick={()=> setDetailsOpen('issues')}>Troubles</button>
              <span className="ml-auto" />
            </div>
            <div className="mt-2 rounded border border-fp-border bg-white p-2 text-sm min-h-[80px]">
              {detailsOpen==='details' && (
                <div className="space-y-1">
                  {(dsl?.nodes||[]).map((n:any)=> (
                    <div key={n.id} className="flex items-center justify-between border border-fp-border rounded px-2 py-1">
                      <div className="truncate">{(n.config as any)?.label || n.type} <span className="text-xs text-slate-500">({n.type})</span></div>
                      <div className="text-xs text-slate-500">{Object.keys(n.config||{}).length} fields</div>
                    </div>
                  ))}
                  {(!dsl?.nodes || dsl.nodes.length===0) && <div className="text-slate-500 text-sm">No draft yet.</div>}
                </div>
              )}
              {detailsOpen==='json' && (
                <div className="text-xs text-slate-600">Use the inline Edit buttons in the conversation to tweak common fields. Advanced controls will appear here next.</div>
              )}
              {detailsOpen==='issues' && (
                <div className="text-xs text-slate-600">
                  {(() => {
                    const miss = inferMissingSecretsLocal(dsl)
                    if (miss.length === 0) return <div>No issues detected.</div>
                    return (
                      <ul className="space-y-1">
                        {miss.map((s) => (
                          <li key={s} className="flex items-center justify-between">
                            <span>Missing secret: <span className="font-medium">{s}</span></span>
                            <button className="px-2 py-0.5 rounded border border-fp-border text-[11px]" onClick={async ()=>{
                              const v = window.prompt(`Enter value for secret ${s}`)
                              if (!v) return
                              await fetch('/api/secrets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: s, value: v }) })
                              window.dispatchEvent(new CustomEvent('secrets:updated'))
                              alert('Secret created')
                            }}>Create</button>
                          </li>
                        ))}
                      </ul>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
        {leftTab === 'developer' && (
          <div className="h-[68vh] overflow-auto">
            <div className="rounded border border-fp-border bg-white p-2">
              <div className="text-xs text-slate-500 mb-1">Current DSL (read‑only)</div>
              <pre className="text-xs overflow-auto max-h-[60vh]">{dsl ? JSON.stringify(dsl, null, 2) : '—'}</pre>
            </div>
          </div>
        )}
      </div>
      <LiveSketchPanel dsl={dsl} />
    </div>
  )
}

