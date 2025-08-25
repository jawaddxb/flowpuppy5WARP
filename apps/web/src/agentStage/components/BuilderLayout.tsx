"use client"
import React from 'react'
import AgentFlowCanvas from '@/agentStage/components/FlowCanvas'
import AddActionModal from '@/agentStage/components/AddActionModal'
import { useGraph } from '@/agentStage/graph/store'
import { flowDocToDsl } from '@/lib/flowdoc/adapter'
import { dslToFlowDoc } from '@/lib/flowdoc/fromDsl'
import { useRouter } from 'next/navigation'
import TestSheet from '@/agentStage/components/TestSheet'
import { deriveRequiredProviders } from '@/lib/connections'

export default function BuilderLayout({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  const [showLanes, setShowLanes] = React.useState<boolean>(false)
  const router = useRouter()
  const flow = useGraph(s=>s.flow)
  const openAdd = (useGraph as any).getState?.().openAdd
  const activeId = useGraph(s=> s.activeNodeId)
  const [testOpen, setTestOpen] = React.useState(false)
  const uiMode = (useGraph as any).getState?.().uiMode as 'beginner'|'pro'
  const setUiMode = (useGraph as any).getState?.().setUiMode as (m:'beginner'|'pro')=>void
  const dirty = (useGraph as any).getState?.().dirty as boolean
  const markSaved = (useGraph as any).getState?.().markSaved as ()=>void
  const undo = (useGraph as any).getState?.().undo as ()=>void
  const strictIssues = useGraph(s=> s.strictIssues)

  // Right pane open/pin state (persisted)
  const [rightOpen, setRightOpen] = React.useState<boolean>(false)
  const [rightPinned, setRightPinned] = React.useState<boolean>(false)
  React.useEffect(()=>{ try {
    setRightOpen(localStorage.getItem('fp-right-open')==='1')
    setRightPinned(localStorage.getItem('fp-right-pinned')==='1')
  } catch {}
  }, [])
  React.useEffect(()=>{ try { localStorage.setItem('fp-right-open', rightOpen ? '1':'0') } catch {} }, [rightOpen])
  React.useEffect(()=>{ try { localStorage.setItem('fp-right-pinned', rightPinned ? '1':'0') } catch {} }, [rightPinned])

  async function copyDsl() {
    try { const dsl = flowDocToDsl(flow as any); await navigator.clipboard.writeText(JSON.stringify(dsl, null, 2)) } catch {}
  }
  function openInBuilder() {
    try {
      const dsl = flowDocToDsl(flow as any)
      localStorage.setItem('fp-last-dsl', JSON.stringify(dsl))
      localStorage.setItem('fp-apply-layout', '1')
      router.push('/builder')
    } catch {}
  }
  React.useEffect(()=>{ try { setShowLanes(localStorage.getItem('fp-show-lanes')==='1') } catch {} }, [])
  React.useEffect(()=>{ try { localStorage.setItem('fp-show-lanes', showLanes ? '1' : '0') } catch {} }, [showLanes])

  React.useEffect(() => {
    try { (window as any).__openAdd = openAdd } catch {}
    function onKey(e: KeyboardEvent) {
      const tgt = e.target as HTMLElement | null
      const isForm = tgt && (tgt.tagName==='INPUT' || tgt.tagName==='TEXTAREA' || (tgt as any).isContentEditable)
      if (isForm) return
      if ((e.key === '+' || e.key === '=') && !e.shiftKey) return // avoid confusion
      if (e.key === '+') {
        e.preventDefault()
        if (activeId && openAdd) openAdd({ kind:'node', nodeId: activeId })
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault(); setShowLanes(v=>!v)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault(); copyDsl()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault(); importDsl()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault(); openInBuilder()
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault(); setRightOpen(true)
      } else if (e.key === 'Escape') {
        if (!rightPinned) setRightOpen(false)
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault(); setRightOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); try { delete (window as any).__openAdd } catch {} }
  }, [activeId])
  async function importDsl() {
    try {
      const txt = await navigator.clipboard.readText()
      const parsed = JSON.parse(txt)
      if (parsed && parsed.nodes && parsed.edges) {
        const flowDoc = dslToFlowDoc(parsed)
        // ensure version per spec v1.1
        ;(flowDoc as any).version = '1.1'
        ;(window as any).alert?.('Imported DSL from clipboard')
        localStorage.setItem('fp-universal-flowdoc', JSON.stringify(flowDoc))
        ;(useGraph as any).getState?.().setFlow(flowDoc as any)
      } else {
        alert('Clipboard does not contain a valid DSL JSON')
      }
    } catch {
      alert('Failed to import DSL from clipboard')
    }
  }
  // Context-open logic: open when a node is selected, when issues exist, or when required connections are present
  React.useEffect(()=>{
    const hasIssues = Array.isArray(strictIssues) && strictIssues.length>0
    let needsConn = false
    try { const req = deriveRequiredProviders(flow as any); needsConn = Array.isArray(req) && req.length>0 } catch {}
    if ((activeId || hasIssues || needsConn) && !rightOpen) setRightOpen(true)
    if (!rightPinned && !activeId && !hasIssues && !needsConn) setRightOpen(false)
  }, [activeId, strictIssues, flow, rightPinned, rightOpen])
  const cols = rightOpen ? '360px 1fr 360px' : '360px 1fr 0px'
  return (
    <div className="h-[calc(100vh-56px)] w-full">
      <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-white px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <button className="rounded-md border border-[#e2e8f0] px-2 py-1">Settings</button>
          <button className="rounded-md border border-[#e2e8f0] px-2 py-1">Canvas</button>
          <a href="/tasks" className="rounded-md border border-[#e2e8f0] px-2 py-1">Tasks</a>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button className={`rounded-md border px-2 py-1 text-xs ${dirty?'bg-amber-50 border-amber-400 text-amber-800':''}`} onClick={()=>{ try { localStorage.setItem('fp-universal-flowdoc', JSON.stringify((useGraph as any).getState?.().flow||{})) } catch {}; markSaved && markSaved() }}>{dirty?'Save*':'Saved'}</button>
          <button className="rounded-md border px-2 py-1 text-xs" onClick={()=> undo && undo()}>Undo</button>
          <div className="flex items-center gap-1">
            <span className="text-[12px] text-slate-600">Mode:</span>
            <button className={`rounded-md border px-2 py-1 text-xs ${uiMode==='beginner'?'bg-slate-100':''}`} onClick={()=> setUiMode && setUiMode('beginner')}>Beginner</button>
            <button className={`rounded-md border px-2 py-1 text-xs ${uiMode==='pro'?'bg-slate-100':''}`} onClick={()=> setUiMode && setUiMode('pro')}>Pro</button>
          </div>
          <button className="rounded-md border px-2 py-1 text-xs" onClick={()=>{ try { const cur = localStorage.getItem('fp-ff-primaryPath')==='1'; localStorage.setItem('fp-ff-primaryPath', cur?'0':'1'); location.reload() } catch {} }}>Primary Path Style</button>
          <button className="rounded-md border border-[#e2e8f0] px-2 py-1" onClick={()=> setShowLanes(v=>!v)}>{showLanes ? 'Hide lanes' : 'Show lanes'}</button>
          <button className="rounded-md border border-[#e2e8f0] px-2 py-1" onClick={copyDsl}>Export DSL</button>
          <button className="rounded-md border border-[#e2e8f0] px-2 py-1" onClick={importDsl}>Import DSL</button>
          <button className="rounded-md border border-[#e2e8f0] px-2 py-1" onClick={openInBuilder}>Open in Builder</button>
          <button className="rounded-md border border-[#e2e8f0] px-3 py-1">Share</button>
          <div className="flex items-center gap-1">
            <button className="rounded-md border border-[#e2e8f0] px-2 py-1 text-xs" onClick={()=> setRightOpen(v=>!v)}>{rightOpen?'Hide Panel':'Show Panel'}</button>
            <button className={`rounded-md border px-2 py-1 text-xs ${rightPinned?'bg-slate-100':''}`} onClick={()=> setRightPinned(v=>!v)}>{rightPinned?'Pinned':'Pin'}</button>
          </div>
          <button
            className={`rounded-md border border-[#e2e8f0] px-3 py-1 ${dirty ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={()=> { if (!dirty) setTestOpen(true) }}
            aria-disabled={dirty}
            title={dirty ? 'Save before Test' : 'Test'}
          >
            Test
          </button>
          <button className="rounded-md bg-slate-900 px-3 py-1 text-white">Deploy</button>
        </div>
      </div>
      <div className="grid h-[calc(100vh-56px-44px)] min-h-0" style={{ gridTemplateColumns: cols }}>
        <aside className="border-r border-[#e2e8f0] bg-[#f8fafc] h-full min-h-0 overflow-hidden flex flex-col">{left}</aside>
        <main className="relative overflow-hidden bg-white">
          <AgentFlowCanvas showLanes={showLanes} />
          <AddActionModal />
          <TestSheet open={testOpen} onClose={()=> setTestOpen(false)} />
        </main>
        <aside className={`border-l border-[#e2e8f0] bg-white overflow-auto hidden md:block ${rightOpen?'':'pointer-events-none opacity-0'}`}>{right}</aside>
      </div>
      {/* Mobile slide-over */}
      {rightOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={()=> { if (!rightPinned) setRightOpen(false) }} />
          <div className="absolute right-0 top-0 h-full w-[92vw] max-w-[420px] bg-white border-l border-[#e2e8f0] shadow-xl">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#e2e8f0]">
              <div className="text-sm font-medium">Panel</div>
              <div className="flex items-center gap-2">
                <button className="rounded-md border px-2 py-1 text-xs" onClick={()=> setRightPinned(v=>!v)}>{rightPinned?'Unpin':'Pin'}</button>
                <button className="rounded-md border px-2 py-1 text-xs" onClick={()=> { if (!rightPinned) setRightOpen(false) }}>Close</button>
              </div>
            </div>
            <div className="h-[calc(100%-40px)] overflow-auto">{right}</div>
          </div>
        </div>
      )}
    </div>
  )
}


