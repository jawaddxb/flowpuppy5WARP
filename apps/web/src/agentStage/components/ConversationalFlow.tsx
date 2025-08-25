"use client"
import React from 'react'
import { preflightPrompt } from '@/lib/promptPreflight'
import { useGraph } from '@/agentStage/graph/store'
import { dslToFlowDoc } from '@/lib/flowdoc/fromDsl'
import DiffPreview from '@/components/DiffPreview'

type ConversationMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  quickActions?: Array<{ label: string; value: any; kind?: 'continue'|'edit'|'connect'|'simulate'|'preview'|'apply'; patchInstruction?: string; patchParams?: Record<string, any> }>
  primaryAction?: { label: string; action: string }
  secondaryActions?: Array<{ label: string; value: any }>
}

export default function ConversationalFlow() {
  const [messages, setMessages] = React.useState<ConversationMessage[]>([])
  const [context, setContext] = React.useState<Record<string, any>>({})
  const [step, setStep] = React.useState(0)
  const [prompt, setPrompt] = React.useState('')
  const [flowId, setFlowId] = React.useState<string>('')
  const [busy, setBusy] = React.useState(false)
  // Conversational Diff proposal state
  type PatchDiff = { nodesAdded: Array<{ id: string; type: string; label?: string }>; nodesRemoved: string[]; edgesAdded: Array<{ source: string; target: string; label?: string }>; edgesRemoved: Array<{ source: string; target: string; label?: string }> }
  const [pendingDiff, setPendingDiff] = React.useState<PatchDiff|null>(null)
  const pendingRef = React.useRef<PatchDiff|null>(null)
  const [previewCur, setPreviewCur] = React.useState<{ nodes: Array<{id:string;type:string}>, edges: Array<{source:string;target:string;label?:string}>}>({ nodes: [], edges: [] })
  const [previewNext, setPreviewNext] = React.useState<{ nodes: Array<{id:string;type:string}>, edges: Array<{source:string;target:string;label?:string}>}>({ nodes: [], edges: [] })
  const [showDiffPanel, setShowDiffPanel] = React.useState<boolean>(true)
  const [pendingDiffBaseSig, setPendingDiffBaseSig] = React.useState<string>('')
  const [diffConflict, setDiffConflict] = React.useState<string>('')
  const [selectedQuickKey, setSelectedQuickKey] = React.useState<string>('')
  const [showDone, setShowDone] = React.useState<boolean>(false)
  // Starters panel lifecycle
  const [suggestionsOpen, setSuggestionsOpen] = React.useState<boolean>(true)
  const [suggestionsPinned, setSuggestionsPinned] = React.useState<boolean>(false)
  React.useEffect(()=>{
    try {
      const savedOpen = localStorage.getItem('fp-convo-suggest-open')
      const savedPin = localStorage.getItem('fp-convo-suggest-pin')
      if (savedOpen!=null) setSuggestionsOpen(savedOpen==='1')
      if (savedPin!=null) setSuggestionsPinned(savedPin==='1')
    } catch {}
  }, [])
  React.useEffect(()=>{
    try {
      localStorage.setItem('fp-convo-suggest-open', suggestionsOpen?'1':'0')
      localStorage.setItem('fp-convo-suggest-pin', suggestionsPinned?'1':'0')
    } catch {}
  }, [suggestionsOpen, suggestionsPinned])

  function playChime() {
    try {
      const ctx = new (window as any).AudioContext()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = 880
      g.gain.value = 0.08
      o.connect(g)
      g.connect(ctx.destination)
      o.start()
      setTimeout(() => { o.stop(); ctx.close && ctx.close() }, 220)
    } catch {}
  }
  
  const threadRef = React.useRef<HTMLDivElement>(null)

  // Minimal retry wrapper to smooth over hot-reload aborts (Failed to fetch)
  async function postJsonWithRetry(url: string, payload: any, retries = 1): Promise<Response> {
    try {
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (e: any) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 300))
        return postJsonWithRetry(url, payload, retries - 1)
      }
      throw e
    }
  }

  // Auto-scroll to latest message
  React.useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages])

  // Persist conversation state (messages/context/step) and restore on mount
  React.useEffect(() => {
    try {
      const rawCtx = localStorage.getItem('fp-convo-ctx')
      const rawMsgs = localStorage.getItem('fp-convo-msgs')
      const rawStep = localStorage.getItem('fp-convo-step')
      const rawFlow = localStorage.getItem('fp-convo-flowid')
      if (rawCtx) setContext(JSON.parse(rawCtx))
      if (rawMsgs) setMessages(JSON.parse(rawMsgs))
      if (rawStep) setStep(Number(rawStep) || 0)
      if (rawFlow) setFlowId(String(rawFlow))
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  React.useEffect(() => {
    try { localStorage.setItem('fp-convo-ctx', JSON.stringify(context)) } catch {}
  }, [context])
  React.useEffect(() => {
    try { localStorage.setItem('fp-convo-step', String(step)) } catch {}
  }, [step])
  React.useEffect(() => {
    try { if (flowId) localStorage.setItem('fp-convo-flowid', String(flowId)) } catch {}
  }, [flowId])
  React.useEffect(() => {
    try { localStorage.setItem('fp-convo-msgs', JSON.stringify(messages.slice(-50))) } catch {}
  }, [messages])

  async function sendMessage() {
    if (!prompt.trim()) return
    // Preflight block for clearly non-actionable prompts (skip in E2E)
    const pf = preflightPrompt(prompt)
    const e2e = String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='1' || String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='true'
    if (!pf.ok && !e2e) {
      setMessages(prev => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: `I need a bit more detail: ${pf.reasons?.join(', ')}. ${pf.suggestions?.join(' ')}` }])
      return
    }
    
    setBusy(true)
    if (!suggestionsPinned) setSuggestionsOpen(false)
    
    // Add user message + immediate placeholder assistant bubble for responsive feel
    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: prompt
    }
    const placeholderAssistant: ConversationMessage = {
      id: `assistant-${Date.now()}-pending`,
      role: 'assistant',
      text: '…'
    }
    
    setMessages(prev => [...prev, userMessage, placeholderAssistant])
    
    try {
      const res = await postJsonWithRetry('/api/chat/continue', { 
          prompt, 
          context, 
          step,
          flowId,
          isFollowUp: messages.length > 0 // Indicate this is continuing a conversation
        })
      const data = await res.json().catch(() => ({}))
      // Build a safe text based on response
      let textOut = ''
      if (!res.ok) {
        const errMsg = String(data?.error || `HTTP ${res.status}`)
        const details = Array.isArray(data?.details) ? ` Details: ${(data.details as any[]).slice(0, 2).join(' | ')}` : ''
        textOut = `API error (chat/continue): ${errMsg}.${details}`
      } else {
        textOut = String(data?.message || 'I can help you plan this.').trim()
        if (!textOut) {
          const errMsg = String(data?.error || 'No message returned')
          const details = Array.isArray(data?.details) ? ` Details: ${(data.details as any[]).slice(0, 2).join(' | ')}` : ''
          textOut = `API error (chat/continue): ${errMsg}.${details}`
        }
      }
      const assistantMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: textOut,
        quickActions: Array.isArray(data?.quickActions) ? data.quickActions : undefined,
        primaryAction: data?.primaryAction,
        secondaryActions: Array.isArray(data?.secondaryActions) ? data.secondaryActions : undefined
      }
      setMessages(prev => {
        const trimmed = prev.filter(m => !(m.id.endsWith('-pending') && m.role==='assistant'))
        return [...trimmed, assistantMessage]
      })
      if (res.ok) {
        setContext(typeof data?.context === 'object' && data?.context ? data.context : context)
        setStep(typeof data?.nextStep === 'number' ? data.nextStep : step)
        if (typeof data?.flowId === 'string' && data.flowId) setFlowId(data.flowId)
      setPrompt('')
      }
    } catch (error) {
      console.error('Conversation error:', error)
      setMessages(prev => {
        const trimmed = prev.filter(m => !(m.id.endsWith('-pending') && m.role==='assistant'))
        return [...trimmed, { id: `assistant-${Date.now()}`, role: 'assistant', text: `Network error (chat/continue): ${String((error as any)?.message || error)}` }]
      })
    } finally {
      setBusy(false)
    }
  }

  async function selectQuickAction(action: any) {
    if (busy) return
    
    setBusy(true)
    if (!suggestionsPinned) setSuggestionsOpen(false)
    
    try {
      // Mark selected chip visually; do not echo as a user bubble
      try { setSelectedQuickKey(`${String(action?.label||action?.value||action)}`) } catch {}
      const res = await postJsonWithRetry('/api/chat/continue', { context, step, flowId, action: (typeof action==='object' && action && 'value' in action) ? action.value : action })
      const data = await res.json().catch(() => ({}))
      let textOut = ''
      if (!res.ok) {
        const errMsg = String(data?.error || `HTTP ${res.status}`)
        const details = Array.isArray(data?.details) ? ` Details: ${(data.details as any[]).slice(0, 2).join(' | ')}` : ''
        textOut = `API error (chat/continue): ${errMsg}.${details}`
      } else {
        textOut = String(data?.message || '').trim()
        if (!textOut) {
          const errMsg = String(data?.error || 'No message returned')
          const details = Array.isArray(data?.details) ? ` Details: ${(data.details as any[]).slice(0, 2).join(' | ')}` : ''
          textOut = `API error (chat/continue): ${errMsg}.${details}`
        }
      }
      const assistantMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: textOut,
        quickActions: Array.isArray(data?.quickActions) ? data.quickActions : undefined,
        primaryAction: data?.primaryAction,
        secondaryActions: Array.isArray(data?.secondaryActions) ? data.secondaryActions : undefined
      }
      setMessages(prev => [...prev, assistantMessage])
      if (res.ok) {
        setContext(typeof data?.context === 'object' && data?.context ? data.context : context)
        setStep(typeof data?.nextStep === 'number' ? data.nextStep : step)
        if (typeof data?.flowId === 'string' && data.flowId) setFlowId(data.flowId)
        // Only propose a patch when explicitly marked by the action kind/fields
        try {
          const aObj = (typeof action === 'object' && action) ? action : null
          const kind = aObj?.kind as (undefined| 'continue'|'edit'|'connect'|'simulate'|'preview'|'apply')
          const patchInstruction = aObj?.patchInstruction || (kind && (kind==='edit' || kind==='preview') ? String(aObj?.value || aObj?.label || '') : '')
          const patchParams = aObj?.patchParams
          // Connection gating: open credentials flow for provider connect requests
          if (kind === 'connect' && aObj?.value?.provider) {
            const provider = String(aObj.value.provider)
            // Inline connect UX: surface a lightweight inline status card and mark as connected for demo/testing
            setMessages(prev => ([ ...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: `Connect ${provider}: Use the panel on the right to connect or skip.` } ]))
            try {
              const st = (useGraph as any).getState?.(); if (st) {
                const mapRaw = (localStorage.getItem('fp-conn-status')||'{}')
                const map = JSON.parse(mapRaw||'{}')
                map[provider] = map[provider] || 'not-connected'
                localStorage.setItem('fp-conn-status', JSON.stringify(map))
              }
            } catch {}
          }
          // Simulation: run a dry-run of the current flow and show a short summary bubble
          if (kind === 'simulate') {
            try {
              const st = (useGraph as any).getState?.()
              const flowDoc = st?.flow || { nodes: [], edges: [] }
              const simRes = await fetch('/api/agent/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ flowDoc }) })
              const simJson = await simRes.json().catch(()=>({}))
              if (!simRes.ok) {
                setMessages(prev => ([ ...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: `Simulation error: ${String(simJson?.error || `HTTP ${simRes.status}`)}` } ]))
              } else {
                const s = String(simJson?.ai?.summary || 'Simulation complete.')
                setMessages(prev => ([ ...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: s } ]))
              }
            } catch (e:any) {
              setMessages(prev => ([ ...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: `Simulation failed: ${String(e?.message||e)}` } ]))
            }
          }
          if (patchInstruction && (kind==='edit' || kind==='preview')) {
            await maybeProposePatch(patchInstruction, patchParams)
          }
        } catch {}
      }
    } catch (error) {
      console.error('Quick action error:', error)
      setMessages(prev => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: `Network error (chat/continue): ${String((error as any)?.message || error)}` }])
    } finally {
      setBusy(false)
    }
  }

  function computePreviewFromFlow(diff: PatchDiff) {
    try {
      const flow = (useGraph as any).getState?.().flow || { nodes: [], edges: [] }
      const curNodes = (flow.nodes||[]).map((n:any)=> ({ id: String(n.id), type: String(n.type||'action') }))
      const curEdges = (flow.edges||[]).map((e:any)=> ({ source: String(e?.source?.nodeId||''), target: String(e?.target?.nodeId||''), label: e?.label }))
      const nextNodesMap = new Map<string, { id: string; type: string }>(curNodes.map((n: { id: string; type: string }) => [n.id, n]))
      for (const id of (diff.nodesRemoved||[])) nextNodesMap.delete(String(id))
      for (const n of (diff.nodesAdded||[])) nextNodesMap.set(String(n.id), { id: String(n.id), type: String(n.type||'action') })
      const nextEdges: Array<{source:string;target:string;label?:string}> = []
      const removedKeys = new Set((diff.edgesRemoved||[]).map(e=> `${e.source}->${e.target}:${e.label||''}`))
      for (const e of curEdges) {
        const key = `${e.source}->${e.target}:${e.label||''}`
        if (!removedKeys.has(key)) nextEdges.push(e)
      }
      for (const e of (diff.edgesAdded||[])) nextEdges.push({ source: String(e.source), target: String(e.target), label: e.label })
      setPreviewCur({ nodes: curNodes, edges: curEdges })
      setPreviewNext({ nodes: Array.from(nextNodesMap.values()), edges: nextEdges })
    } catch {
      setPreviewCur({ nodes: [], edges: [] }); setPreviewNext({ nodes: [], edges: [] })
    }
  }

  function applyDiffToFlow(diff: PatchDiff) {
    setDiffConflict('')
    // Conflict detection: compare snapshot signature with current flow
    const state0 = (useGraph as any).getState?.()
    const flow0 = state0?.flow || { nodes: [], edges: [] }
    const sigNow = JSON.stringify({
      n: (flow0.nodes||[]).map((n:any)=>({ id: String(n.id), t: String(n.type||'') })),
      e: (flow0.edges||[]).map((e:any)=>({ s: String(e?.source?.nodeId||''), t: String(e?.target?.nodeId||''), l: String(e?.label||'') }))
    })
    if (pendingDiffBaseSig && sigNow !== pendingDiffBaseSig) {
      setDiffConflict('The canvas changed after this proposal. Refresh the preview before applying.')
      return
    }
    const getState = (useGraph as any).getState
    const st = getState?.(); if (!st) return
    st.pushUndo?.()
    const flow = structuredClone(st.flow || { version:'1.1', lanes: [], nodes: [], edges: [] })
    const ensureLane = (id:string, title:string, order:number)=>{
      const exists = (flow.lanes||[]).some((l:any)=> String(l.id)===id)
      if (!exists) (flow.lanes||[]).push({ id, title, order })
    }
    ensureLane('lane-input','Input',0)
    ensureLane('lane-transform','Transform',1)
    ensureLane('lane-decision','Decision',2)
    ensureLane('lane-output','Output',3)
    const nodeById = (id:string)=> (flow.nodes||[]).find((n:any)=> String(n.id)===id)
    // Remove nodes
    const removeSet = new Set((diff.nodesRemoved||[]).map(String))
    flow.nodes = (flow.nodes||[]).filter((n:any)=> !removeSet.has(String(n.id)))
    flow.edges = (flow.edges||[]).filter((e:any)=> !removeSet.has(String(e?.source?.nodeId||'')) && !removeSet.has(String(e?.target?.nodeId||'')))
    // Add nodes
    for (const n of (diff.nodesAdded||[])) {
      const id = String(n.id)
      if (nodeById(id)) continue
      const type = String(n.type||'action')
      const laneId = (type==='decision') ? 'lane-decision' : (type==='input' ? 'lane-input' : (type==='output' ? 'lane-output' : 'lane-transform'))
      const title = n.label ? String(n.label) : (type==='decision' ? 'Decision' : type==='input' ? 'Trigger' : type==='output' ? 'Notify' : 'Step')
      const provider = (type==='output' && title.toLowerCase().includes('tweet')) ? 'twitter' : undefined
      flow.nodes.push({ id, type, title, laneId, provider, data: { label: title, rank: (flow.nodes||[]).length } })
    }
    // Remove edges
    const edgeKey = (e:any)=> `${e?.source?.nodeId||''}->${e?.target?.nodeId||''}:${e?.label||''}`
    const removedEdgeKeys = new Set((diff.edgesRemoved||[]).map((e:any)=> `${e.source}->${e.target}:${e.label||''}`))
    flow.edges = (flow.edges||[]).filter((e:any)=> !removedEdgeKeys.has(edgeKey(e)))
    // Add edges
    for (const e of (diff.edgesAdded||[])) {
      const s = String(e.source), t = String(e.target)
      if (!nodeById(s) || !nodeById(t)) continue
      const exists = (flow.edges||[]).some((x:any)=> String(x?.source?.nodeId||'')===s && String(x?.target?.nodeId||'')===t && String(x?.label||'')===String(e.label||''))
      if (!exists) flow.edges.push({ id: `e-${Math.random().toString(36).slice(2,8)}`, source: { nodeId: s }, target: { nodeId: t }, label: e.label })
    }
    st.setFlow(flow)
  }

  async function maybeProposePatch(actionValue: string, params?: Record<string, any> | null) {
    const payload: any = { instruction: actionValue, context: { ...context, nodes: (()=>{ try { const st = (useGraph as any).getState?.(); return st?.flow?.nodes || [] } catch { return [] } })() } }
    if (params && typeof params === 'object') payload.params = params
    const res = await fetch('/api/agent/patch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const j = await res.json().catch(()=>({}))
    if (j?.diff) {
      setPendingDiff(j.diff); computePreviewFromFlow(j.diff)
      try {
        const st = (useGraph as any).getState?.()
        const flow0 = st?.flow || { nodes: [], edges: [] }
        const sig = JSON.stringify({
          n: (flow0.nodes||[]).map((n:any)=>({ id: String(n.id), t: String(n.type||'') })),
          e: (flow0.edges||[]).map((e:any)=>({ s: String(e?.source?.nodeId||''), t: String(e?.target?.nodeId||''), l: String(e?.label||'') }))
        })
        setPendingDiffBaseSig(sig)
      } catch { setPendingDiffBaseSig('') }
      setMessages(prev => ([ ...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: 'Proposed change available.' } ]))
    } else if (j?.error) {
      setMessages(prev => ([ ...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: `API error (patch): ${String(j.error)}` } ]))
    }
  }

  // Primary action handler: only build on explicit "build"; otherwise continue conversation with the action value
  async function handlePrimaryAction(pa: { label: string; action: string } | undefined | null) {
    if (!pa) return
    const act = String(pa.action || '').toLowerCase()
    if (act === 'build') {
      await handleBuildWorkflow()
      return
    }
    await selectQuickAction({ label: pa.label, value: pa.action })
  }

  async function handleBuildWorkflow() {
    if (busy) return
    setBusy(true)
    try {
      // Prefer current input; else fall back to the latest user message in the thread
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user' && String(m.text||'').trim().length > 0)
      const promptText = String((prompt || '').trim() || (lastUserMsg?.text || '')).trim()
      const pf = preflightPrompt(promptText)
      const e2e = String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='1' || String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()==='true'
      if (!pf.ok && !e2e) {
        setMessages(prev => ([ ...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: `Can’t build yet: ${pf.reasons?.join(', ')}. ${pf.suggestions?.join(' ')}` } ]))
        return
      }

      // AI-only pipeline: no deterministic shortcuts
      // 1) Plan
      const planRes = await fetch('/api/agent/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      })
      const planJson = await planRes.json().catch(()=>({}))
      if (!planRes.ok) {
        const errMsg = String(planJson?.error || `HTTP ${planRes.status}`)
        const details = Array.isArray(planJson?.details) ? ` Details: ${(planJson.details as any[]).slice(0, 2).join(' | ')}` : ''
        setMessages(prev => ([ ...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: `API error (plan): ${errMsg}.${details} Proceeding with direct confirm → generate.` } ]))
      }
      // 2) Confirm (use defaults if present)
      const defaults = (planJson?.options?.defaults || {}) as Record<string, string>
      const confirmRes = await fetch('/api/agent/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections: defaults, prompt: promptText })
      })
      const confirmJson = await confirmRes.json().catch(()=>({}))
      if (!confirmRes.ok) {
        const errMsg = String(confirmJson?.error || `HTTP ${confirmRes.status}`)
        const details = Array.isArray(confirmJson?.details) ? ` Details: ${(confirmJson.details as any[]).slice(0, 2).join(' | ')}` : ''
        setMessages(prev => ([ ...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: `API error (confirm): ${errMsg}.${details}` } ]))
        return
      }
      // 3) Generate FlowDoc
      const genRes = await fetch('/api/agent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentSpec: confirmJson?.agentSpec || {} })
      })
      const genJson = await genRes.json().catch(()=>({}))
      if (!genRes.ok) {
        const errMsg = String(genJson?.error || `HTTP ${genRes.status}`)
        const details = Array.isArray(genJson?.details) ? ` Details: ${(genJson.details as any[]).slice(0, 2).join(' | ')}` : ''
        setMessages(prev => ([ ...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: `API error (generate): ${errMsg}.${details}` } ]))
        return
      }
      if (genJson?.flowDoc) {
        // Show Diff Preview; apply only on user approval
        const flowCur = (useGraph as any).getState?.().flow || { nodes: [], edges: [] }
        const curNodes = Array.isArray(flowCur.nodes) ? (flowCur.nodes as any[]) : []
        const curEdges = Array.isArray(flowCur.edges) ? (flowCur.edges as any[]) : []
        const nextNodes = Array.isArray(genJson.flowDoc?.nodes) ? (genJson.flowDoc.nodes as any[]) : []
        const nextEdges = Array.isArray(genJson.flowDoc?.edges) ? (genJson.flowDoc.edges as any[]) : []
        const curIds = new Set(curNodes.map(n=> String(n.id)))
        const nextIds = new Set(nextNodes.map(n=> String(n.id)))
        const nodesAdded = nextNodes.filter(n=> !curIds.has(String(n.id))).map(n=> ({ id: String(n.id), type: String(n.type||'action') }))
        const nodesRemoved = curNodes.filter(n=> !nextIds.has(String(n.id))).map(n=> String(n.id))
        const eKey = (e:any)=> `${String(e?.source?.nodeId||'')}:${String(e?.target?.nodeId||'')}:${String(e?.label||'')}`
        const curE = new Set(curEdges.map(eKey))
        const nextE = new Set(nextEdges.map(eKey))
        const edgesAdded = nextEdges.filter(e=> !curE.has(eKey(e))).map(e=> ({ source: String(e?.source?.nodeId||''), target: String(e?.target?.nodeId||''), label: e?.label }))
        const edgesRemoved = curEdges.filter(e=> !nextE.has(eKey(e))).map(e=> ({ source: String(e?.source?.nodeId||''), target: String(e?.target?.nodeId||''), label: e?.label }))
        const diff: PatchDiff = { nodesAdded, nodesRemoved, edgesAdded, edgesRemoved }
        setPendingDiff(diff)
        computePreviewFromFlow(diff)
        setMessages(prev => ([ ...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: 'Proposed workflow ready. Review the diff and Apply to update the canvas.' } ]))
        try { localStorage.setItem('fp-next-flowdoc', JSON.stringify(genJson.flowDoc)) } catch {}
      } else {
        setMessages(prev => ([
          ...prev,
          { id: `assistant-${Date.now()}`, role: 'assistant', text: 'Could not generate a workflow. Please try again.' }
        ]))
      }
    } catch (e:any) {
      setMessages(prev => ([
        ...prev,
        { id: `assistant-${Date.now()}`, role: 'assistant', text: `Error generating workflow: ${String(e?.message||e)}` }
      ]))
    } finally {
      setBusy(false)
    }
  }

  // Expose minimal test hooks for E2E to drive the pipeline without relying on LLM primaryAction timing
  React.useEffect(() => {
    pendingRef.current = pendingDiff
  }, [pendingDiff])

  React.useEffect(() => {
    const enableHooks = String(process.env.NEXT_PUBLIC_E2E_HOOKS || '').toLowerCase() === '1' || String(process.env.NEXT_PUBLIC_E2E_HOOKS || '').toLowerCase() === 'true'
    if (!enableHooks) return
    try {
      ;(window as any).convoApi = {
        build: () => handleBuildWorkflow(),
        send: () => sendMessage(),
        selectQuick: (a: any) => selectQuickAction(a),
        hasPending: () => Boolean(pendingRef.current),
        openPanel: () => setShowDiffPanel(true),
        applyPending: () => {
          const d = pendingRef.current
          if (!d) return false
          applyDiffToFlow(d)
          setPendingDiff(null)
          setShowDiffPanel(false)
          playChime()
          setShowDone(true); setTimeout(()=> setShowDone(false), 1500)
          setContext(prev => ({ ...(prev||{}), build: { ...((prev||{} as any).build||{}), applied: true }, stage: 'build' }))
          setMessages(prev => ([ ...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: 'Workflow applied to canvas.' } ]))
          return true
        }
      }
    } catch {}
    return () => {
      try { if ((window as any).convoApi) delete (window as any).convoApi } catch {}
    }
  }, [setShowDiffPanel, pendingRef.current])

  return (
    <div className="h-full grid grid-rows-[1fr_auto] overflow-hidden min-h-0">
      {/* Conversation Thread - Row 1 (1fr = takes remaining space) */}
      <div data-testid="convo-thread" ref={threadRef} className="overflow-y-auto p-4 space-y-4 min-h-0">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="rounded-[16px] bg-slate-100 p-3 text-[14px] text-slate-700">
            <div className="font-medium mb-2">Hi, I&apos;m your workflow assistant!</div>
            <div>Tell me what you&apos;d like to create, and I&apos;ll guide you through building it step by step. I&apos;ll ask natural questions and help you make the right choices.</div>
          </div>
        )}
        
        {/* Messages */}
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-[16px] p-3 ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-slate-100 text-slate-800'
            }`}>
              <div className="text-[14px] leading-relaxed">{message.text}</div>
              
              {/* Quick Actions */}
              {message.quickActions && message.quickActions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectQuickAction(action)}
                      disabled={busy}
                      className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${selectedQuickKey===`${action.label}` ? 'border-blue-500 ring-2 ring-blue-300 bg-white text-slate-900' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Primary Action */}
              {message.primaryAction && (
                <div className="mt-3">
                  <button
                    onClick={() => handlePrimaryAction(message.primaryAction)}
                    disabled={busy}
                    className="text-[13px] px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {message.primaryAction.label}
                  </button>
                </div>
              )}
              
              {/* Secondary Actions */}
              {message.secondaryActions && message.secondaryActions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.secondaryActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectQuickAction(action)}
                      disabled={busy}
                      className="text-[12px] px-3 py-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {busy && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-[16px] p-3 text-[14px] text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                <span className="ml-2">Thinking...</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Input Composer - Row 2 (auto = natural height) */}
      <div data-testid="convo-composer" className={`border-t border-slate-200 p-6 bg-white ${pendingDiff && showDiffPanel ? 'pointer-events-none' : ''}`} style={{ position: 'sticky', bottom: 0 }}>
        {suggestionsOpen && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[12px] text-slate-600">Starter ideas</div>
              <div className="flex items-center gap-2">
                <button className="text-[11px] text-slate-600" onClick={()=> setSuggestionsPinned(v=>!v)}>{suggestionsPinned?'Unpin':'Pin'}</button>
                <button className="text-[11px] text-slate-600" onClick={()=> setSuggestionsOpen(false)}>Hide</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
          {[
            'Send health tweets daily',
            'Tweet daily AI trends', 
            'Email me weather summary',
            'Post Slack digest of top articles'
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => { setPrompt(suggestion); setTimeout(() => sendMessage(), 100) }}
              disabled={busy}
              className="text-[12px] px-3 py-1.5 rounded-full border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
          </div>
        )}
        
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <textarea
            data-testid="convo-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Type your message..."
            disabled={busy}
            className="flex-1 rounded-md text-[14px] resize-none disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            style={{ height: 40, boxSizing: 'border-box' as const }}
            rows={1}
          />
          <button
            data-testid="convo-send"
            onClick={sendMessage}
            className="px-6 py-2 rounded-md hover:bg-blue-700 text-[14px] font-medium transition-all duration-200 shadow-md border border-blue-700 min-w-[80px]"
            style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
          >
            {busy ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
      {/* Breadcrumbs */}
      <div className="absolute left-4 top-2 z-40 text-[11px] text-slate-600 bg-white/80 backdrop-blur px-2 py-1 rounded border border-slate-200 pointer-events-none">
        <span className="font-medium">You are here:</span>{' '}
        <span>{String((context as any)?.stage || 'goal')}</span>
        {(context as any)?.build?.applied ? <span className="ml-2 text-emerald-700">(built)</span> : null}
        {(context as any)?.connections?.twitter === 'connected' ? <span className="ml-2 text-emerald-700">(twitter connected)</span> : <span className="ml-2 text-amber-700">(twitter missing)</span>}
      </div>

      {showDone && (
        <div className="fixed right-4 bottom-24 z-[60]">
          <div className="rounded-full bg-emerald-600 text-white text-[12px] px-4 py-2 shadow-lg animate-fade-in">
            Done — Workflow applied
          </div>
        </div>
      )}

      {/* Floating Diff Panel */}
      {pendingDiff && (
        <div className="fixed right-4 bottom-24 z-[120]" data-testid="convo-diff-container">
          {showDiffPanel ? (
            <div className="w-[420px] max-h-[70vh] overflow-y-auto rounded-lg shadow-xl border border-slate-200 bg-white p-3" data-testid="convo-diff-panel">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[13px] font-semibold">Proposed change</div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-600">{`${(pendingDiff.nodesAdded||[]).length} add, ${(pendingDiff.nodesRemoved||[]).length} remove, ${(pendingDiff.edgesAdded||[]).length} edge+`}</span>
                  <button className="text-[11px] text-slate-600 hover:text-slate-900 underline" onClick={()=> setShowDiffPanel(false)}>Minimize</button>
                </div>
              </div>
              <DiffPreview current={previewCur} next={previewNext} />
              {diffConflict && <div className="mt-2 text-[11px] text-amber-700">{diffConflict}</div>}
              <div className="mt-3 flex items-center gap-2">
                <button data-testid="convo-diff-apply" className="px-2 py-1 text-xs rounded border border-fp-border bg-white" onClick={()=>{ 
                  applyDiffToFlow(pendingDiff!); 
                  setPendingDiff(null); 
                  setShowDiffPanel(false);
                  playChime();
                  setShowDone(true); setTimeout(()=> setShowDone(false), 1500)
                  setContext(prev => ({ ...(prev||{}), build: { ...((prev||{} as any).build||{}), applied: true }, stage: 'build' }))
                  setMessages(prev => ([ ...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: 'Workflow applied to canvas.' } ]))
                }}>Apply</button>
                <button className="px-2 py-1 text-xs rounded border border-fp-border" onClick={()=>{ try { const u = (useGraph as any).getState?.().undo; if (u) u() } catch {} }}>Undo</button>
                <button className="px-2 py-1 text-xs rounded border border-fp-border" onClick={()=> { computePreviewFromFlow(pendingDiff!); setDiffConflict(''); }}>Refresh preview</button>
                <button className="px-2 py-1 text-xs rounded border border-fp-border" onClick={()=> { setPendingDiff(null); setShowDiffPanel(false); setDiffConflict('') }}>Dismiss</button>
              </div>
            </div>
          ) : (
            <button
              className="rounded-full shadow-md border border-slate-200 bg-white text-[12px] px-3 py-2 hover:bg-slate-50"
              onClick={()=> setShowDiffPanel(true)}
            >
              Review proposed change — {(pendingDiff.nodesAdded||[]).length} add, {(pendingDiff.nodesRemoved||[]).length} remove
            </button>
          )}
        </div>
      )}
    </div>
  )
}
