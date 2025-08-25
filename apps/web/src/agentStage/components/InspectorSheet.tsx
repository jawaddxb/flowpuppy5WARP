"use client"
import React from 'react'
import { useGraph } from '@/agentStage/graph/store'

export default function InspectorSheet() {
  const nodeId = useGraph(s=> s.activeNodeId)
  const flow = useGraph(s=> s.flow)
  const update = useGraph(s=> s.updateNodeData)
  const close = () => useGraph.setState({ activeNodeId: null })
  const node = React.useMemo(()=> (flow.nodes||[]).find((n:any)=> n.id===nodeId) || null, [flow, nodeId])
  const open = !!node
  if (!open) return null
  const kind = String(node?.type||'').toLowerCase()
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/20" onClick={close} />
      <div className="absolute right-0 top-0 h-full w-[384px] bg-white border-l border-[#e2e8f0] shadow-xl overflow-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#e2e8f0]">
          <div className="text-sm font-semibold">Inspector</div>
          <button className="text-xs rounded border border-[#e2e8f0] px-2 py-0.5" onClick={close}>Done</button>
        </div>
        <div className="p-3 space-y-3 text-sm">
          {/* Agent Step */}
          {kind==='agent' || node?.provider==='ai' ? (
            <Field title="Agent Step">
              <Label>Prompt</Label>
              <textarea className="w-full rounded border border-[#e2e8f0] p-2 h-24 text-xs" onChange={(e)=> update(node.id, { prompt: e.target.value })} />
              <Label className="mt-2">Model</Label>
              <select className="w-full rounded border border-[#e2e8f0] p-1 text-xs" onChange={(e)=> update(node.id, { model: e.target.value })}><option>claude-3.5</option><option>gpt-4o</option></select>
              <Label className="mt-2">Ask-for-confirmation</Label>
              <select className="w-full rounded border border-[#e2e8f0] p-1 text-xs" onChange={(e)=> update(node.id, { confirm: e.target.value })}><option>Never</option><option>On uncertainty</option><option>Always</option></select>
              <Label className="mt-2">Skills</Label>
              <input className="w-full rounded border border-[#e2e8f0] p-1 text-xs" placeholder="search, summarize" onChange={(e)=> update(node.id, { skills: e.target.value })} />
              <button className="mt-2 text-xs rounded border border-[#e2e8f0] px-2 py-1">Add exit condition</button>
            </Field>
          ) : null}
          {/* Knowledge Base */}
          {node?.provider==='ai' && (node as any)?.data?.kbase ? (
            <Field title="Knowledge Base">
              <Label>Website URL</Label>
              <div className="flex items-center gap-2">
                <input className="flex-1 rounded border border-[#e2e8f0] p-1 text-xs" placeholder="https://example.com" onChange={(e)=> update(node.id, { kbase: { ...(node as any).data?.kbase, url: e.target.value } })} />
                <button className="text-xs rounded border border-[#e2e8f0] px-2 py-1">Crawl</button>
              </div>
              <Label className="mt-2">Query Mode</Label>
              <select className="w-full rounded border border-[#e2e8f0] p-1 text-xs" onChange={(e)=> update(node.id, { kbase: { ...(node as any).data?.kbase, mode: e.target.value } })}>
                <option>Auto</option>
                <option>Prompt AI</option>
                <option>Set Manually</option>
              </select>
            </Field>
          ) : null}
          {/* Enter Loop */}
          {kind==='loop' ? (
            <Field title="Enter Loop">
              <Label>Items to loop through</Label>
              <input className="w-full rounded border border-[#e2e8f0] p-1 text-xs" onChange={(e)=> update(node.id, { items: e.target.value })} />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label>Max Cycles</Label>
                  <input type="number" className="w-full rounded border border-[#e2e8f0] p-1 text-xs" onChange={(e)=> update(node.id, { maxCycles: Number(e.target.value||0) })} />
                </div>
                <div>
                  <Label>Max Concurrent</Label>
                  <input type="number" className="w-full rounded border border-[#e2e8f0] p-1 text-xs" onChange={(e)=> update(node.id, { maxConcurrent: Number(e.target.value||0) })} />
                </div>
              </div>
              <Label className="mt-2">Output</Label>
              <input className="w-full rounded border border-[#e2e8f0] p-1 text-xs" onChange={(e)=> update(node.id, { output: e.target.value })} />
            </Field>
          ) : null}
          {/* Condition */}
          {kind==='decision' ? (
            <Field title="Condition">
              <div className="flex items-center justify-between"><Label>Go down this path if …</Label><div className="flex items-center gap-2"><button className="text-[11px] rounded border border-[#e2e8f0] px-2 py-0.5" onClick={()=> navigator.clipboard.writeText('')}>Copy</button><button className="text-[11px] rounded border border-[#e2e8f0] px-2 py-0.5">Ask AI</button></div></div>
              <textarea className="w-full rounded border border-[#e2e8f0] p-2 h-20 text-xs" onChange={(e)=> update(node.id, { condition: e.target.value })} />
            </Field>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-[#e2e8f0] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,.05),_0_8px_16px_rgba(0,0,0,.04)]">
      <div className="text-[13px] font-semibold mb-2 text-[#0f172a]">{title}</div>
      {children}
    </div>
  )
}
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-xs text-[#475569] ${className||''}`}>{children}</label>
}


