"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkflowDraftStore } from '@/store/workflowDraft'
import dynamic from 'next/dynamic'
const FlowCanvas = dynamic(() => import('@/components/FlowCanvas'), { ssr: false })
const CanvasToolbar = dynamic(() => import('@/components/CanvasToolbar'), { ssr: false })
const NodePalette = dynamic(() => import('@/components/NodePalette'), { ssr: false })
const VersionsModal = dynamic(() => import('@/components/VersionsModal'), { ssr: false })
const SecretsPicker = dynamic(() => import('@/components/SecretsPicker'), { ssr: false })
const TemplatePicker = dynamic(() => import('@/components/TemplatePicker'), { ssr: false })
const CommandPalette = dynamic(() => import('@/components/CommandPalette'), { ssr: false })
import { useGraphStore } from '@/store/graph'
import { toDsl, validateDsl, fromDsl } from '@/lib/dsl'
import { structureAndConnectLinear, structureWithDecisionHeuristics } from '@/lib/structure'
import { validateNode, validateGraph } from '@/lib/validation'
import InspectorFields from '@/components/InspectorFields'
import { ReactFlowProvider } from 'reactflow'
import { CanvasProvider } from '@/components/CanvasContext'
import PanelLayout from '@/components/PanelLayout'
import QuickAddOverlay from '@/components/QuickAddOverlay'
import FloatingInspector from '@/components/FloatingInspector'
import DiffPreview from '@/components/DiffPreview'
import ChatPanel from '@/components/ChatPanel'
import VersionsSidebar from '@/components/VersionsSidebar'
import ChatPanelThreaded from '@/components/ChatPanelThreaded'
import RunHistory from '@/components/RunHistory'
import ControlDock from '@/components/ControlDock'
const RunControls = dynamic(() => import('@/components/RunControls'), { ssr: false })
const ShortcutsModal = dynamic(() => import('@/components/ShortcutsModal'), { ssr: false })
import OnboardingModal from '@/components/OnboardingModal'
import { useSimStore } from '@/store/sim'
import { isAgentBuildEnabled } from '@/lib/flags'
import AgentBuilderPanel from '@/components/AgentBuilderPanel'

export default function BuilderPage() {
  // Deprecated: Redirect to /agent when Agent Build is enabled
  useEffect(() => {
    try {
      // @ts-ignore dynamic import at runtime
      const { isAgentBuildEnabled } = require('@/lib/flags')
      if (isAgentBuildEnabled && typeof isAgentBuildEnabled === 'function' && isAgentBuildEnabled()) {
        router.replace('/agent')
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const router = useRouter()
  const [tab, setTab] = useState<'details'|'testing'|'metrics'|'advanced'|'drafts'>('details')
  const [selected, setSelected] = useState<string|undefined>(undefined)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const draft = useWorkflowDraftStore((s) => s.draft)
  const currentDraftId = useWorkflowDraftStore((s) => s.currentDraftId)
  const graph = useGraphStore(s => ({ nodes: s.nodes, edges: s.edges }))
  // On first open after reset, ensure empty canvas if a window flag was set
  useEffect(() => {
    try {
      const acceptIncoming = (() => { try { return localStorage.getItem('fp-apply-layout') === '1' || !!localStorage.getItem('fp-last-dsl') } catch { return false } })()
      if ((window as any).__fpClearGraph && !acceptIncoming) {
        // @ts-ignore
        useGraphStore.getState().setGraph([], [])
      }
      ;(window as any).__fpClearGraph = undefined
    } catch {}
  }, [])

  // If canvas is empty on mount, try to hydrate from last accepted DSL
  useEffect(() => {
    try {
      const s = useGraphStore.getState()
      const empty = (s.nodes?.length || 0) === 0 && (s.edges?.length || 0) === 0
      if (!empty) return
      let parsed: any = null
      const raw = localStorage.getItem('fp-last-dsl')
      if (raw) parsed = JSON.parse(raw)
      if (!parsed) {
        const chat = localStorage.getItem('fp-chat')
        if (chat) {
          try { const j = JSON.parse(chat); if (j && j.dsl) parsed = j.dsl } catch {}
        }
      }
      if (!parsed) return
      if (parsed?.nodes && parsed?.edges) {
        const structured = structureWithDecisionHeuristics(structureAndConnectLinear(parsed as any))
        const g = fromDsl(structured as any)
        // @ts-ignore
        useGraphStore.getState().setGraph(g.nodes || [], g.edges || [])
        try { localStorage.setItem('fp-apply-layout', '1') } catch {}
      }
    } catch {}
  }, [])
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [floatOpen, setFloatOpen] = useState(false)
  const [overlayInspector, setOverlayInspector] = useState<boolean>(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLog, setChatLog] = useState<string[]>([])
  const [pendingDsl, setPendingDsl] = useState<any | null>(null)
  const [missingSecrets, setMissingSecrets] = useState<string[]>([])
  const [workflowId, setWorkflowId] = useState<string | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  useEffect(() => {
    const id = localStorage.getItem('fp-current-workflow-id')
    if (id) setWorkflowId(id)
    const ov = localStorage.getItem('fp-inspector-overlay')
    if (ov === '1') {
      setOverlayInspector(true)
      setFloatOpen(true)
    }
    const dismissed = localStorage.getItem('fp-onboarding-dismissed')==='1'
    if (!dismissed && (graph.nodes?.length||0)===0 && (graph.edges?.length||0)===0) setShowOnboarding(true)
  }, [])

  const selectedNode = (graph.nodes as any as Array<any>).find?.(n=>n.id===selected)

  // Drafts panel state
  const [drafts, setDrafts] = useState<Array<{id:string,name:string,created_at:string}>>([])
  const [loadingDrafts, setLoadingDrafts] = useState(false)
  async function refreshDrafts() {
    setLoadingDrafts(true)
    try {
      const res = await fetch('/api/workflows')
      const data = await res.json()
      if (res.ok) setDrafts(data.items || [])
    } finally {
      setLoadingDrafts(false)
    }
  }

  async function saveCurrentAsDraft() {
    const name = prompt('Name this draft', 'Draft')
    if (!name) return
    const dsl = toDsl(graph.nodes as any, graph.edges as any)
    const val = validateDsl(dsl)
    if (!val.ok) return alert('Validation errors: ' + val.errors.join(', '))
    const res = await fetch('/api/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, graph: dsl }) })
    const data = await res.json()
    if (!res.ok) return alert('Save failed: ' + (data?.error || 'unknown'))
    await refreshDrafts()
    useWorkflowDraftStore.getState().setCurrentDraftId(data.id)
    alert('Saved')
  }

  async function loadDraft(id: string) {
    const res = await fetch('/api/workflows?id=' + encodeURIComponent(id))
    const data = await res.json()
    if (!res.ok || !data?.item?.graph_json) return alert('Load failed')
    const g = data.item.graph_json
    // @ts-ignore
    useGraphStore.getState().setGraph(g.nodes || [], g.edges || [])
    useWorkflowDraftStore.getState().setCurrentDraftId(id)
  }

  async function renameDraft(id: string, currentName: string) {
    const newName = prompt('New name for draft', currentName)
    if (!newName) return
    const res = await fetch('/api/workflows/' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) })
    if (!res.ok) return alert('Rename failed')
    await refreshDrafts()
  }

  async function deleteDraft(id: string) {
    if (!confirm('Delete this draft?')) return
    const res = await fetch('/api/workflows/' + encodeURIComponent(id), { method: 'DELETE' })
    if (!res.ok) return alert('Delete failed')
    await refreshDrafts()
  }

  // Auto-load drafts when opening the Drafts tab
  if (tab === 'drafts' && drafts.length === 0 && !loadingDrafts) {
    // fire and forget; render will update when done
    refreshDrafts()
  }

  // Debounced autosave when editing an existing draft
  useEffect(() => {
    if (!currentDraftId) return
    const t = setTimeout(async () => {
      try {
        setSaving(true)
        const dsl = toDsl(graph.nodes as any, graph.edges as any)
        await fetch('/api/workflows/' + encodeURIComponent(currentDraftId), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graph: dsl }),
        })
        setSavedAt(Date.now())
      } catch {}
      finally { setSaving(false) }
    }, 800)
    return () => clearTimeout(t)
  }, [graph.nodes, graph.edges, currentDraftId])

  async function saveNow() {
    if (currentDraftId) {
      setSaving(true)
      try {
        const dsl = toDsl(graph.nodes as any, graph.edges as any)
        await fetch('/api/workflows/' + encodeURIComponent(currentDraftId), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graph: dsl }),
        })
        setSavedAt(Date.now())
      } finally { setSaving(false) }
    } else {
      await saveCurrentAsDraft()
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null
      if (tgt) {
        const tag = tgt.tagName
        const editable = (tgt as HTMLElement).isContentEditable
        if (editable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          return
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen((v) => !v)
      }
      if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setQuickOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 rounded-[var(--radius-lg)] border border-fp-border bg-fp-surface min-h-[70vh] p-0 shadow-fp-1">
        <OnboardingModal open={showOnboarding && (graph.nodes?.length||0)===0 && (graph.edges?.length||0)===0} onClose={()=>{ setShowOnboarding(false); try{localStorage.setItem('fp-onboarding-dismissed','1')}catch{}}}
          context="builder"
          samples={[
            { id:'energy', icon:'⚡️', title:'Energy Optimizer', description:'Analyze prices + weather and decide charge/sell; email me.', prompt:'Build an energy optimizer that checks power prices and weather, decides when to charge or sell, and emails me the action.' },
            { id:'twitter', icon:'🐦', title:'Twitter Sentiment → Slack', description:'Track a topic; summarize and post to Slack.', prompt:'Monitor Twitter for mentions of “FlowPuppy”, summarize sentiment with LLM, and post a digest to Slack.' },
            { id:'webhook', icon:'🧩', title:'Webhook → Transform → Email', description:'Parse incoming data and notify me.', prompt:'When a webhook is received, transform JSON into a readable summary and email it to me.' },
            { id:'nft', icon:'🪙', title:'NFT Holder Check → Discord', description:'Verify NFT ownership; grant role via Discord API.', prompt:'Given a wallet address, verify NFT ownership of contract 0x... on chain Ethereum; if holder, call Discord API to assign “Holder” role.' },
          ]}
          onTrySample={(p)=> { setShowOnboarding(false); try{ localStorage.setItem('fp-onboarding-dismissed','1') }catch{}; router.push(`/create?prompt=${encodeURIComponent(p)}`) }} />
        <div className="flex items-center justify-between px-4 py-2 border-b border-fp-border relative" data-builder-header>
          <div className="font-medium">Canvas</div>
          <div className="flex items-center gap-2" aria-label="Canvas actions">
            <button
              onClick={() => {
                try {
                  const dsl = toDsl((useGraphStore.getState().nodes as any) || [], (useGraphStore.getState().edges as any) || [])
                  localStorage.setItem('fp-last-dsl', JSON.stringify(dsl))
                  // carry latest chat state forward too (preserve thread if present)
                  const existing = localStorage.getItem('fp-chat')
                  try {
                    if (existing) {
                      const j = JSON.parse(existing)
                      j.dsl = dsl
                      localStorage.setItem('fp-chat', JSON.stringify(j))
                    } else {
                      const thr = localStorage.getItem('fp-thread')
                      const payload = thr ? { dsl, thread: JSON.parse(thr) } : { dsl }
                      localStorage.setItem('fp-chat', JSON.stringify(payload))
                    }
                  } catch {}
                } catch {}
                router.push('/create')
              }}
              className="px-2 py-1 text-xs rounded border border-fp-border bg-white"
            >
              Back to Chat
            </button>
            <button
              onClick={() => {
                if (!window.confirm('Clear conversation and canvas? This cannot be undone.')) return
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
                router.push('/create')
              }}
              className="px-2 py-1 text-xs rounded border border-rose-300 bg-rose-50 text-rose-700"
            >
              Clear
            </button>
            {(() => {
              const { nodeIssues, graphIssues } = validateGraph(graph.nodes as any, graph.edges as any)
              const count = Object.values(nodeIssues).reduce((a,b)=> a + (b?.length||0), 0) + (graphIssues?.length || 0)
              if (count === 0) return null
              return (
                <button className="px-2 py-1 text-xs rounded border border-amber-300 bg-amber-50 text-amber-700" onClick={()=>{
                  // jump to testing tab and scroll the Graph issues section into view
                  setTab('testing')
                  setTimeout(() => {
                    const el = document.querySelector('[data-graph-issues]') as HTMLElement | null
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }, 50)
                }} title={`${count} issues`} aria-label={`${count} graph issues`}>Issues: {count}</button>
              )
            })()}
            <button onClick={()=> setShortcutsOpen(true)} className="px-2 py-1 text-xs rounded border border-fp-border" aria-label="Show keyboard shortcuts">?</button>
            <div className="text-xs text-slate-500 min-w-[120px] text-right" role="status" aria-live="polite">{saving ? 'Saving…' : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : ''}</div>
            <button onClick={saveNow} className="px-2 py-1 text-xs rounded border border-fp-border">Save</button>
            <CanvasToolbar inline onAction={(id)=>{
              if (id==='save') return saveNow()
              if (id==='drafts') return setTab('drafts')
              if (id==='versions') return setVersionsOpen(true)
              if (id==='templates') return setTemplatesOpen(true)
              if (id==='snap') return (window as any).flowCanvasApi?.toggleSnap?.()
              if (id==='fit') return (window as any).flowCanvasApi?.fitView?.()
              if (id==='fitSel') return (window as any).flowCanvasApi?.fitSelection?.()
              if (id==='zoomIn') return (window as any).flowCanvasApi?.zoomIn?.()
              if (id==='zoomOut') return (window as any).flowCanvasApi?.zoomOut?.()
              if (id==='layout') return (window as any).flowCanvasApi?.layout?.()
              if (id==='undo') return useGraphStore.getState().undo()
              if (id==='redo') return useGraphStore.getState().redo()
            }} />
          </div>
        </div>
        <div className="h-[calc(100vh-180px)] relative">
          <PanelLayout
            left={<div className="space-y-3">{isAgentBuildEnabled() && (
              <AgentBuilderPanel
                connections={[
                  { key: 'webscrape', name: 'Connect Webscraping', status: 'missing' },
                  { key: 'openweather', name: 'Connect OpenWeather API', status: 'missing' },
                  { key: 'google', name: 'Connect Google', status: 'missing' },
                ]}
                onConnect={(key)=>{ alert('Connect ' + key) }}
              />
            )}
            <NodePalette /><VersionsSidebar workflowId={workflowId} onRestore={async (vid)=>{
              const res = await fetch('/api/workflow-versions/' + encodeURIComponent(vid))
              const data = await res.json()
              if (res.ok && data?.item?.graph_json) {
                setPendingDsl(data.item.graph_json)
                setTab('testing')
                alert('Loaded version into Preview. Review the diff and click Apply to restore.')
              }
            }} /><RunHistory workflowId={workflowId} /></div>}
            right={
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Inspector</div>
                  <div className="flex items-center gap-2">
                    <input value={workflowId ?? ''} onChange={(e)=>{ setWorkflowId(e.target.value || null); if (e.target.value) localStorage.setItem('fp-current-workflow-id', e.target.value); else localStorage.removeItem('fp-current-workflow-id') }} placeholder="workflowId" className="w-36 border border-fp-border rounded-[var(--radius-sm)] px-2 py-0.5 text-xs" />
                    <label className="text-xs flex items-center gap-1"><input type="checkbox" onChange={(e)=>{ document.body.dataset['inspectorCompact'] = e.target.checked ? '1' : '0' }} /> Compact</label>
                    <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={overlayInspector} onChange={(e)=>{ const v = e.target.checked; setOverlayInspector(v); localStorage.setItem('fp-inspector-overlay', v ? '1' : '0'); setFloatOpen(v) }} /> Overlay</label>
                    <button className="text-xs border border-fp-border rounded px-2 py-0.5" onClick={()=> setFloatOpen(true)}>Detach</button>
                    <div className="text-xs text-slate-500">Node: {selected ?? '(none)'}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-sm mb-3">
          <TabButton label="Details" active={tab==='details'} onClick={() => setTab('details')} />
          <TabButton label="Testing" active={tab==='testing'} onClick={() => setTab('testing')} />
          <TabButton label="Metrics" active={tab==='metrics'} onClick={() => setTab('metrics')} />
          <TabButton label="Advanced" active={tab==='advanced'} onClick={() => setTab('advanced')} />
          <TabButton label="Drafts" active={tab==='drafts'} onClick={() => setTab('drafts')} />
                </div>
                <div className="rounded-[var(--radius-md)] border border-fp-border p-3 bg-white text-sm min-h-40">
          {tab === 'details' && (
            <div className="inspector-grid">
              {overlayInspector && (
                <div className="col-span-2 text-xs text-slate-500 mb-2">Overlay mode is enabled. Use the floating inspector to edit node properties.</div>
              )}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Node label</label>
                <input
                  className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1"
                  placeholder="e.g., HTTP Request"
                  value={(selectedNode?.data?.label as string) || ''}
                  onChange={(e)=>{
                    if (!selected) return
                    useGraphStore.getState().updateNode(selected, { label: e.target.value })
                  }}
                />
              </div>
              {/* Schema-driven fields */}
              {selectedNode && (
                <InspectorFields selectedNode={selectedNode} selected={selected} />
              )}

              {selectedNode && ((selectedNode.type as string) === 'parallel') && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Branches</label>
                  <input
                    type="number"
                    className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1"
                    value={Number((selectedNode?.data?.branches as number) || 2)}
                    onChange={(e)=>{
                      if (!selected) return
                      const v = parseInt(e.target.value || '2', 10)
                      useGraphStore.getState().updateNode(selected, { branches: isNaN(v)?2:v })
                    }}
                  />
                  <InlineError field="branches" node={selectedNode} />
                </div>
              )}
              {selectedNode && ((selectedNode.type as string) === 'join') && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Strategy</label>
                  <select
                    className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1"
                    value={(selectedNode?.data?.strategy as string) || ''}
                    onChange={(e)=>{ if (!selected) return; useGraphStore.getState().updateNode(selected, { strategy: e.target.value }) }}
                  >
                    <option value="">Select</option>
                    <option value="all">All</option>
                    <option value="any">Any</option>
                  </select>
                  <InlineError field="strategy" node={selectedNode} />
                </div>
              )}
              {selectedNode && ((selectedNode.type as string) === 'trycatch') && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Retry attempts</label>
                    <input
                      type="number"
                      className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1"
                      value={Number((selectedNode?.data?.retries as number) ?? 0)}
                      onChange={(e)=>{ if (!selected) return; const v = parseInt(e.target.value||'0',10); useGraphStore.getState().updateNode(selected, { retries: isNaN(v)?0:v }) }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">On error</label>
                    <select
                      className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1"
                      value={(selectedNode?.data?.onError as string) || 'route'}
                      onChange={(e)=>{ if (!selected) return; useGraphStore.getState().updateNode(selected, { onError: e.target.value }) }}
                    >
                      <option value="route">Route to catch</option>
                      <option value="suppress">Suppress and continue</option>
                      <option value="propagate">Propagate</option>
                    </select>
                  </div>
                </div>
              )}
              {selectedNode && ((selectedNode.type as string) === 'transform') && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Script (JS)</label>
                    <textarea
                      className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 h-24 font-mono text-xs"
                      placeholder="// input is the payload\nreturn input"
                      value={(selectedNode?.data?.script as string) || ''}
                      onChange={(e)=>{ if (!selected) return; useGraphStore.getState().updateNode(selected, { script: e.target.value }) }}
                      onFocus={()=>{ try { (window as any).panelApi?.setRight?.(((window as any).panelApi?.presets?.right?.wide) || 36) } catch {} }}
                      onBlur={()=>{ try { (window as any).panelApi?.setRight?.(((window as any).panelApi?.presets?.right?.comfort) || 28) } catch {} }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Test input (JSON)</label>
                      <textarea id="transform-test-in" className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 h-24 font-mono text-xs" defaultValue='{"hello":"world"}' />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Output</label>
                      <textarea id="transform-test-out" className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 h-24 font-mono text-xs bg-slate-50" readOnly />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      try {
                        const inputEl = document.getElementById('transform-test-in') as HTMLTextAreaElement
                        const outEl = document.getElementById('transform-test-out') as HTMLTextAreaElement
                        const payload = JSON.parse(inputEl.value || 'null')
                        const code = String(selectedNode?.data?.script || 'return input')
                        // eslint-disable-next-line no-new-func
                        const fn = new Function('input', code)
                        const res = fn(payload)
                        outEl.value = JSON.stringify(res, null, 2)
                      } catch (err: any) {
                        const outEl = document.getElementById('transform-test-out') as HTMLTextAreaElement
                        if (outEl) outEl.value = 'Error: ' + (err?.message || String(err))
                      }
                    }}
                    className="px-2 py-1 rounded-[var(--radius-sm)] border border-fp-border text-xs"
                  >
                    Run test
                  </button>
                </div>
              )}
              {selectedNode && ((selectedNode.type as string) === 'subflow') && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Workflow ID</label>
                    <input
                      className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1"
                      placeholder="Draft ID"
                      value={(selectedNode?.data?.subflowId as string) || ''}
                      onChange={(e)=>{ if (!selected) return; useGraphStore.getState().updateNode(selected, { subflowId: e.target.value }) }}
                    />
                  </div>
                  <button onClick={async ()=>{
                    const id = prompt('Pick workflow id to link')
                    if (!id || !selected) return
                    useGraphStore.getState().updateNode(selected, { subflowId: id })
                  }} className="px-2 py-1 text-xs rounded border border-fp-border">Browse…</button>
                </div>
              )}
              {selectedNode && ((selectedNode.type as string) === 'delay') && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Delay (ms)</label>
                  <input
                    type="number"
                    className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1"
                    value={Number((selectedNode?.data?.ms as number) || 1000)}
                    onChange={(e)=>{ if (!selected) return; const v = parseInt(e.target.value||'0',10); useGraphStore.getState().updateNode(selected, { ms: isNaN(v)?0:v }) }}
                  />
                </div>
              )}
              {selectedNode && ((selectedNode.type as string) === 'loop') && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Iterations</label>
                    <input
                      type="number"
                      className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1"
                      value={Number((selectedNode?.data?.iterations as number) || 3)}
                      onChange={(e)=>{ if (!selected) return; const v = parseInt(e.target.value||'1',10); useGraphStore.getState().updateNode(selected, { iterations: isNaN(v)?1:v }) }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Variable name</label>
                    <input
                      className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1"
                      placeholder="i"
                      value={(selectedNode?.data?.var as string) || ''}
                      onChange={(e)=>{ if (!selected) return; useGraphStore.getState().updateNode(selected, { var: e.target.value }) }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Break condition (JS, has i)</label>
                    <input
                      className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1"
                      placeholder="i > 10"
                      value={(selectedNode?.data?.breakIf as string) || ''}
                      onChange={(e)=>{ if (!selected) return; useGraphStore.getState().updateNode(selected, { breakIf: e.target.value }) }}
                    />
                  </div>
                </div>
              )}
              {selectedNode && ((selectedNode.type as string) === 'switch') && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Cases (comma separated)</label>
                  <input
                    className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1"
                    placeholder="A, B, C"
                    value={Array.isArray(selectedNode?.data?.cases) ? (selectedNode?.data?.cases as Array<string>).join(', ') : ''}
                    onChange={(e)=>{
                      if (!selected) return
                      const parts = e.target.value.split(',').map(s=>s.trim()).filter(Boolean)
                      useGraphStore.getState().updateNode(selected, { cases: parts })
                    }}
                  />
                  <InlineError field="cases" node={selectedNode} />
                </div>
              )}

              {selected && (
                <div className="pt-2 border-t border-fp-border">
                  <div className="text-xs text-slate-500 mb-1">Outgoing edges</div>
                  <div className="space-y-1">
                    {(graph.edges as any as Array<any>).filter(e => e.source === selected || e.id === selected).map((e) => (
                      <div key={e.id} className="flex items-center gap-2">
                        <div className="text-[11px] text-slate-500 truncate">{e.id}</div>
                        <input
                          className="flex-1 border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-xs"
                          placeholder="Label"
                          value={(e.label as string) || ''}
                          onChange={(ev)=> useGraphStore.getState().updateEdge(e.id, { label: ev.target.value })}
                        />
                        <select
                          className="border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-xs"
                          value={String((e.data?.type as string) || 'success')}
                          onChange={(ev)=> useGraphStore.getState().updateEdge(e.id, { data: { ...(e.data||{}), type: ev.target.value } as any })}
                        >
                          <option value="success">Success</option>
                          <option value="error">Error</option>
                          <option value="guarded">Guarded</option>
                        </select>
                        <input
                          className="flex-1 border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 text-xs"
                          placeholder="Guard expression (optional)"
                          value={String((e.data?.guard as string) || '')}
                          onChange={(ev)=> useGraphStore.getState().updateEdge(e.id, { data: { ...(e.data||{}), guard: ev.target.value } as any })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-500 mb-1">Retry attempts</label>
                <input type="number" className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1" defaultValue={2} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Timeout (ms)</label>
                <input type="number" className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1" defaultValue={10000} />
              </div>
              {selectedNode && (
                <div className="flex items-center justify-between pt-2 border-t border-fp-border">
                  <div className="text-xs text-slate-500">Lock position</div>
                  <input
                    type="checkbox"
                    checked={Boolean((selectedNode as any).draggable === false)}
                    onChange={(e)=>{
                      if (!selected) return
                      useGraphStore.getState().updateNodeProps(selected, { draggable: e.target.checked ? false : true })
                    }}
                  />
                </div>
              )}
            </div>
          )}
           {tab === 'testing' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">Chat to Generate</div>
                <div className="flex items-center gap-2">
                  <button data-testid="testing-chat-toggle" className="text-xs border border-fp-border rounded px-2 py-0.5" onClick={()=> setChatOpen(v=>!v)}>{chatOpen ? 'Hide' : 'Show'}</button>
                </div>
              </div>
              {chatOpen && (
                <div className="rounded border border-fp-border p-2 space-y-2">
                  <div className="text-xs text-slate-500">Describe the workflow you want. We will draft a DSL and show a preview diff.</div>
                  <ChatPanel onGenerate={(dsl, rationale, meta)=> { setChatLog((l)=> [...l, `AI (${meta?.confidence ? `${Math.round((meta.confidence||0)*100)}%` : ''}) : ${rationale}`]); setPendingDsl(dsl); setMissingSecrets(meta?.missingSecrets || []) }} />
                  <div className="pt-2 border-t border-fp-border">
                    <div className="text-xs text-slate-500 mb-1">Threaded mode (refine and patch into current graph)</div>
                    <ChatPanelThreaded />
                  </div>
                  {/* Validation summary */}
                  <div className="pt-2 border-t border-fp-border">
                    {(() => {
                      const { graphIssues } = validateGraph(graph.nodes as any, graph.edges as any)
                      if (graphIssues.length === 0) return <div className="text-xs text-emerald-600">Graph is valid</div>
                      return (
                        <div>
                          <div className="font-medium text-sm mb-1">Validation issues</div>
                          <ul className="space-y-1 text-xs text-rose-600">
                            {graphIssues.map((g, i)=> {
                              const click = () => {
                                if (!g.id) return
                                // if it's an edge id, select edge, otherwise node
                                const isEdge = (graph.edges as any[]).some(e=> e.id === g.id)
                                setSelected(g.id)
                                if (isEdge) {
                                  // no-op for now; future: focus inline guard/label input
                                }
                              }
                              return (
                                <li key={i}>
                                  <button type="button" className="underline underline-offset-2" onClick={click}>{g.message}</button>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )
                    })()}
                  </div>
                  <div className="pt-2 border-t border-fp-border">
                    <div className="text-xs text-slate-500 mb-1">Execute (simulate)</div>
                    <RunControls workflowId={workflowId} />
                  </div>
                  {pendingDsl && (
                    <div className="mt-2 rounded border border-fp-border p-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Preview changes</div>
                        <div className="flex items-center gap-2">
                          <button className="px-2 py-1 text-xs rounded border border-fp-border" onClick={()=> setPendingDsl(null)}>Discard</button>
                          <button className="px-2 py-1 text-xs rounded border border-fp-border bg-white" onClick={()=>{
                            const g = pendingDsl
                            if (g?.nodes && g?.edges) {
                              const val = validateDsl(g)
                              if (!val.ok) return alert('Validation errors: ' + val.errors.join(', '))
                              // @ts-ignore
                              useGraphStore.getState().setGraph(g.nodes, g.edges)
                              setPendingDsl(null)
                            }
                          }}>Apply</button>
                        </div>
                      </div>
                      <DiffPreview current={{ nodes: (graph.nodes as any[]).map(n=>({ id: n.id, type: String(n.type||'node') })), edges: (graph.edges as any[]).map(e=>({ source: e.source, target: e.target, label: (e as any).label })) }} next={{ nodes: (pendingDsl?.nodes||[]).map((n:any)=>({ id: n.id, type: n.type })), edges: (pendingDsl?.edges||[]).map((e:any)=>({ source: e.source, target: e.target, label: e.label })) }} />
                      {missingSecrets && missingSecrets.length > 0 && (
                        <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs">
                          <div className="font-medium mb-1">Missing secrets</div>
                          <ul className="list-disc pl-4 space-y-1">
                            {missingSecrets.map((s)=> (
                              <li key={s} className="flex items-center justify-between">
                                <span>{s}</span>
                                <button className="px-2 py-0.5 rounded border border-fp-border text-[11px]" onClick={async ()=>{
                                  const v = prompt(`Enter value for secret ${s}`)
                                  if (!v) return
                                  await fetch('/api/secrets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: s, value: v }) })
                                  // toast replacement: lightweight banner
                                  setChatLog((l)=> [...l, `Secret created: ${s}`])
                                  // notify pickers to refresh
                                  window.dispatchEvent(new CustomEvent('secrets:updated'))
                                }}>Create</button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-xs text-slate-600 space-y-1 max-h-40 overflow-auto">
                    {chatLog.map((l, i)=> <div key={i}>{l}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === 'testing' && (
            <div className="space-y-2">
              {(() => {
                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async ()=>{
                        // Pure local demo sequence for reliability
                        try { useSimStore.getState().start(graph.nodes as any, graph.edges as any) } catch {}
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
                        // sequential per-step from UI slider on Testing panel (if present), default 5000
                        const perStep = Number((document.getElementById('fp-demo-duration') as HTMLInputElement | null)?.value) || 5000
                        for (const id of seq) {
                          try { useSimStore.getState().step({ nodeId: id, status: 'ok', durationMs: perStep } as any, edges as any) } catch {}
                          await new Promise((r)=> setTimeout(r, perStep + 100))
                        }
                        try { useSimStore.getState().end() } catch {}
                      }}
                      className="px-3 py-2 rounded-[var(--radius-sm)] bg-fp-primary text-white hover:bg-fp-primary-600"
                    >
                      Demo Run
                    </button>
                    <div className="text-xs text-slate-500">Local demo animation (no network).</div>
                  </div>
                )
              })()}

            <div className="pt-3 mt-2 border-t border-fp-border" data-graph-issues>
                <div className="font-medium mb-2">Graph issues</div>
                {(() => {
                  const items = (graph.nodes as any as Array<any>).flatMap((n:any) => {
                    const errs = validateNode(n)
                    return errs.filter(e=>e.field!=='node').map(e=>({ id: n.id, label: n.data?.label || n.id, field: e.field, message: e.message }))
                  })
                  // add missing switch edge labels
                  const switchEdgesIssues = (graph.nodes as any as Array<any>)
                    .filter((n:any)=> n.type==='switch')
                    .flatMap((n:any)=> (graph.edges as any as Array<any>).filter((e:any)=> e.source===n.id).map((e:any)=> ({ edge:e, node:n })))
                    .filter(({edge})=> !edge.label || String(edge.label).trim()==='')
                    .map(({edge,node})=> ({ id: node.id, label: node.data?.label || node.id, field: 'edgeLabel', message: `Edge ${edge.id} from switch requires a label` }))
                  const guardIssues = (graph.edges as any as Array<any>)
                    .filter((e:any)=> (e.data?.type === 'guarded') && (!e.data?.guard || String(e.data.guard).trim()===''))
                    .map((e:any)=> ({ id: e.source, label: e.label || e.id, field: 'guard', message: `Edge ${e.id} is guarded but has no expression` }))
                  const all = [...items, ...switchEdgesIssues, ...guardIssues]
                  if (all.length === 0) return <div className="text-xs text-emerald-600">No issues detected.</div>
                  return (
                    <div className="space-y-1">
                      {all.map((it, idx) => (
                        <button type="button" onClick={()=> setSelected(it.id)} key={`${it.id}-${it.field}-${idx}`} className="text-left w-full text-xs flex items-start gap-2 hover:bg-slate-50 rounded px-1 py-0.5">
                          <span className="text-rose-600">•</span>
                          <span><span className="font-medium">{it.label}</span>: {it.message}</span>
                        </button>
                      ))}
                    </div>
                  )
                })()}
              </div>
              <div className="pt-3 mt-2 border-t border-fp-border">
                <div className="font-medium mb-2">Edge labels</div>
                <div className="text-xs text-slate-500">Double-click an edge on the canvas to set its label (e.g., Switch case name). Labels will appear along the edge.</div>
              </div>
            </div>
          )}
          {tab === 'drafts' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button onClick={saveCurrentAsDraft} className="px-3 py-2 rounded-[var(--radius-sm)] border border-fp-border">Save Current as Draft</button>
                <button onClick={refreshDrafts} className="px-3 py-2 rounded-[var(--radius-sm)] border border-fp-border">Refresh</button>
              </div>
              <div className="text-xs text-slate-500">Manage your drafts below.</div>
              <div className="mt-2 divide-y border border-fp-border rounded-[var(--radius-sm)]">
                {loadingDrafts && <div className="p-2 text-sm">Loading…</div>}
                {!loadingDrafts && drafts.length === 0 && <div className="p-2 text-sm">No drafts yet.</div>}
                {drafts.map((d)=> (
                  <div key={d.id} className="p-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{d.name}</div>
                      <div className="text-xs text-slate-500 truncate">{d.id}</div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <button onClick={()=>loadDraft(d.id)} className="px-2 py-1 text-xs rounded border border-fp-border">Load</button>
                      <button onClick={()=>renameDraft(d.id, d.name)} className="px-2 py-1 text-xs rounded border border-fp-border">Rename</button>
                      <button onClick={()=>deleteDraft(d.id)} className="px-2 py-1 text-xs rounded border border-fp-border text-rose-600">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === 'metrics' && (
            <div className="space-y-2">
              <div className="text-sm">Node run counts (simulated)</div>
              {(() => {
                // naive mock: count outgoing edges per node as proxy for activity
                const counts: Record<string, number> = {}
                ;(graph.nodes as any as Array<any>).forEach((n:any)=> counts[n.id] = 0)
                ;(graph.edges as any as Array<any>).forEach((e:any)=> { counts[e.source] = (counts[e.source]||0) + 1 })
                const rows = Object.entries(counts).map(([id,c])=> ({ id, c, label: (graph.nodes as any as Array<any>).find((n:any)=> n.id===id)?.data?.label || id }))
                return (
                  <div className="divide-y border border-fp-border rounded-[var(--radius-sm)]">
                    {rows.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-2 text-sm">
                        <div className="truncate">{r.label}</div>
                        <div className="text-slate-500">{r.c}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
          {tab === 'advanced' && <div>Retry policy, timeout, idempotency</div>}
          {tab === 'advanced' && (
            <div className="mt-3 space-x-2">
              <button onClick={()=>{
                const dsl = toDsl(graph.nodes as any, graph.edges as any)
                const val = validateDsl(dsl)
                if (val.ok) {
                  navigator.clipboard.writeText(JSON.stringify(dsl, null, 2))
                  alert('DSL copied to clipboard')
                } else {
                  alert('Validation errors: ' + val.errors.join(', '))
                }
              }} className="px-3 py-2 rounded-[var(--radius-sm)] border border-fp-border">Export DSL</button>
              <button onClick={()=>{
                const input = prompt('Paste DSL JSON')
                if (!input) return
                try {
                  const json = JSON.parse(input)
                  const val = validateDsl(json)
                  if (!val.ok) return alert('Validation errors: ' + val.errors.join(', '))
                  const g = fromDsl(json as any)
                  // @ts-ignore
                  useGraphStore.getState().setGraph(g.nodes || [], g.edges || [])
                } catch (e: any) {
                  alert('Invalid JSON')
                }
              }} className="px-3 py-2 rounded-[var(--radius-sm)] border border-fp-border">Import DSL</button>
            </div>
          )}
                </div>
              </div>
            }
          >
            <div className="absolute inset-0">
              <ReactFlowProvider>
                <CanvasProvider>
                  <FlowCanvas showLanes={false} />
                </CanvasProvider>
              </ReactFlowProvider>
              <CommandPalette open={cmdOpen} onClose={()=> setCmdOpen(false)} onRun={(id)=>{
                setCmdOpen(false)
                const actions: Record<string, ()=>void> = {
                  save: ()=> saveNow(),
                  layout: ()=> (window as any).flowCanvasApi?.layout?.(),
                  fit: ()=> (window as any).flowCanvasApi?.fitView?.(),
                  fitSel: ()=> (window as any).flowCanvasApi?.fitSelection?.(),
                  copyDsl: ()=> { const dsl = toDsl(graph.nodes as any, graph.edges as any); navigator.clipboard.writeText(JSON.stringify(dsl, null, 2)) },
                  snap: ()=> (window as any).flowCanvasApi?.toggleSnap?.(),
                  quickAdd: ()=> setQuickOpen(true),
                  'left:narrow': ()=> (window as any).panelApi?.setLeft?.(((window as any).panelApi?.presets?.left?.narrow)||16),
                  'left:comfort': ()=> (window as any).panelApi?.setLeft?.(((window as any).panelApi?.presets?.left?.comfort)||22),
                  'left:wide': ()=> (window as any).panelApi?.setLeft?.(((window as any).panelApi?.presets?.left?.wide)||28),
                  'right:narrow': ()=> (window as any).panelApi?.setRight?.(((window as any).panelApi?.presets?.right?.narrow)||20),
                  'right:comfort': ()=> (window as any).panelApi?.setRight?.(((window as any).panelApi?.presets?.right?.comfort)||28),
                  'right:wide': ()=> (window as any).panelApi?.setRight?.(((window as any).panelApi?.presets?.right?.wide)||36),
                }
                actions[id]?.()
              }} />
              <QuickAddOverlay open={quickOpen} onClose={()=> setQuickOpen(false)} onChoose={(item)=>{
                setQuickOpen(false)
                ;(window as any).flowCanvasApi?.quickAdd?.(item)
              }} />
              <div className="relative z-[27]">
                <ControlDock />
              </div>
            </div>
          </PanelLayout>
          <ShortcutsModal open={shortcutsOpen} onClose={()=> setShortcutsOpen(false)} />
          <FloatingInspector open={floatOpen} selectedNodeId={selected} onClose={()=> setFloatOpen(false)} onSnapBack={()=> setFloatOpen(false)} />
        </div>
      </div>
      <VersionsModal
        open={versionsOpen}
        onClose={()=> setVersionsOpen(false)}
        onLoad={(id)=> { loadDraft(id); setVersionsOpen(false) }}
        onSaveVersion={async (name?: string) => {
          const nm = name || prompt('Version name', 'Version')
          if (!nm) return
          const dsl = toDsl(graph.nodes as any, graph.edges as any)
          const val = validateDsl(dsl)
          if (!val.ok) return alert('Validation errors: ' + val.errors.join(', '))
          const res = await fetch('/api/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nm, graph: dsl }) })
          if (res.ok) alert('Saved version')
        }}
      />
      {templatesOpen && <TemplatePicker onClose={()=> setTemplatesOpen(false)} />}
    </div>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-2 py-1 rounded-[var(--radius-sm)] border whitespace-nowrap ${active ? 'border-fp-primary text-fp-primary' : 'border-fp-border text-slate-600 hover:bg-slate-50'}`}>
      {label}
    </button>
  )
}

function InlineError({ field, node }: { field: string; node: any }) {
  const issues = validateNode(node)
  const msg = issues.find(i=>i.field===field)?.message
  if (!msg) return null
  return <div className="text-xs text-rose-600 mt-1">{msg}</div>
}

