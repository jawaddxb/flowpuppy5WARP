"use client"
import React from 'react'
import { ConnectionTile } from './ConnectionTile'
import { useGraphStore } from '@/store/graph'
import { flowDocToDsl } from '@/lib/flowdoc/adapter'
import { fromDsl } from '@/lib/dsl'
import AddActionMenu, { type CatalogGroup } from './AddActionMenu'

export default function AgentBuilderPanel({ connections, onConnect }: { connections: Array<{ key: string; name: string; status: 'missing'|'connected'|'error' }>; onConnect?: (key: string)=>void }) {
  const setGraph = useGraphStore(s => s.setGraph)
  const [planLoading, setPlanLoading] = React.useState(false)
  const [confirmLoading, setConfirmLoading] = React.useState(false)
  const [generateLoading, setGenerateLoading] = React.useState(false)
  const [prompt, setPrompt] = React.useState('Optimize energy usage with battery + solar')
  const [plan, setPlan] = React.useState<any | null>(null)
  const [spec, setSpec] = React.useState<any | null>(null)
  const [catalogOpen, setCatalogOpen] = React.useState(false)

  const catalogGroups = React.useMemo<CatalogGroup[]>(() => ([
    { id: 'top', title: 'Top Picks', items: [
      { id: 'http', title: 'HTTP Request', subtitle: 'Call any API' },
      { id: 'transform', title: 'Transform', subtitle: 'Code or mapping' },
      { id: 'email', title: 'Email', subtitle: 'Send via Gmail' },
      { id: 'switch', title: 'Decision (If/Else)', subtitle: 'Route by condition' },
    ]},
    { id: 'integrations', title: 'Integrations', items: [
      { id: 'slack', title: 'Slack' },
      { id: 'notion', title: 'Notion' },
      { id: 'sheets', title: 'Google Sheets' },
      { id: 'airtable', title: 'Airtable' },
      { id: 'discord', title: 'Discord' },
    ]},
    { id: 'logic', title: 'Logic', items: [
      { id: 'trycatch', title: 'Try/Catch' },
      { id: 'join', title: 'Join' },
      { id: 'parallel', title: 'Parallel' },
      { id: 'loop', title: 'Loop' },
    ]},
  ]), [])

  function quickAddById(id: string) {
    const map: Record<string, { type: string; label: string; defaults?: Record<string, any> }> = {
      http: { type: 'http', label: 'HTTP Request', defaults: { url: 'https://api.example.com', method: 'GET' } },
      transform: { type: 'transform', label: 'Transform', defaults: { script: '// return input' } },
      email: { type: 'email', label: 'Send Email', defaults: { to: '', subject: '' } },
      slack: { type: 'slack', label: 'Post to Slack', defaults: { channel: '#general', message: 'Hello' } },
      notion: { type: 'notion', label: 'Notion', defaults: { databaseId: '' } },
      sheets: { type: 'sheets', label: 'Google Sheets', defaults: { spreadsheetId: '' } },
      airtable: { type: 'airtable', label: 'Airtable', defaults: { baseId: '' } },
      discord: { type: 'discord', label: 'Discord', defaults: { channelId: '' } },
      switch: { type: 'switch', label: 'Decision', defaults: { cases: ['A','B'] } },
      trycatch: { type: 'trycatch', label: 'Try/Catch' },
      join: { type: 'join', label: 'Join', defaults: { strategy: 'all' } },
      parallel: { type: 'parallel', label: 'Parallel', defaults: { branches: 2 } },
      loop: { type: 'loop', label: 'Loop', defaults: { iterations: 3 } },
    }
    const item = map[id]
    if (!item) return
    try { (window as any).flowCanvasApi?.quickAdd?.(item) } catch {}
    try { localStorage.setItem('fp-apply-layout','1') } catch {}
  }

  async function callPlan() {
    setPlanLoading(true)
    try {
      const res = await fetch('/api/agent/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const j = await res.json()
      setPlan(j)
    } finally {
      setPlanLoading(false)
    }
  }

  async function callConfirm() {
    if (!plan) return
    setConfirmLoading(true)
    try {
      const res = await fetch('/api/agent/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selections: plan?.defaults || {} }) })
      const j = await res.json()
      setSpec(j?.agentSpec)
    } finally {
      setConfirmLoading(false)
    }
  }

  async function callGenerate() {
    if (!spec) return
    setGenerateLoading(true)
    try {
      const res = await fetch('/api/agent/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentSpec: spec }) })
      const j = await res.json()
      const flowDoc = j?.flowDoc
      if (flowDoc) {
        try { localStorage.setItem('fp-universal-flowdoc', JSON.stringify(flowDoc)) } catch {}
        const dsl = flowDocToDsl(flowDoc)
        const graph = fromDsl(dsl)
        setGraph(graph.nodes as any, graph.edges as any)
        try { localStorage.setItem('fp-apply-layout','1') } catch {}
      }
    } finally {
      setGenerateLoading(false)
    }
  }

  return (
    <div className="w-full h-full overflow-auto p-3">
      <div className="rounded-[12px] border border-fp-border bg-white p-3 mb-3">
        <div className="font-medium">Build Agent</div>
        <div className="text-sm text-slate-600">A guided builder to generate a runnable workflow.</div>
        <div className="mt-3 flex items-center gap-2">
          <input value={prompt} onChange={(e)=> setPrompt(e.target.value)} className="flex-1 border border-fp-border rounded px-2 py-1 text-sm" placeholder="What would you like to build?" />
          <button disabled={planLoading} onClick={callPlan} className="px-2 py-1 text-xs rounded bg-fp-primary text-white disabled:opacity-50">{planLoading? 'Planning…':'Plan'}</button>
          <button disabled={!plan || confirmLoading} onClick={callConfirm} className="px-2 py-1 text-xs rounded border border-fp-border disabled:opacity-50">{confirmLoading? 'Confirming…':'Confirm'}</button>
          <button disabled={!spec || generateLoading} onClick={callGenerate} className="px-2 py-1 text-xs rounded border border-fp-border disabled:opacity-50">{generateLoading? 'Generating…':'Generate'}</button>
          <button onClick={()=> setCatalogOpen(true)} className="px-2 py-1 text-xs rounded border border-fp-border">Add Action</button>
        </div>
        {plan && (
          <div className="mt-2 text-xs text-slate-600">
            <div className="font-medium mb-1">Options</div>
            <pre className="text-[11px] bg-slate-50 border border-slate-200 rounded p-2 overflow-auto">{JSON.stringify(plan.options, null, 2)}</pre>
          </div>
        )}
      </div>
      <div className="mb-3">
        <div className="font-medium mb-2">Connections required</div>
        <div className="space-y-2">
          {connections.map((c)=> (
            <ConnectionTile key={c.key} name={c.name} status={c.status} onConnect={()=> onConnect?.(c.key)} />
          ))}
        </div>
      </div>
      <div className="mb-3">
        <div className="font-medium mb-2">Plan</div>
        <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
          <li>Trigger on a schedule</li>
          <li>Fetch power prices and weather</li>
          <li>Analyze and make a decision</li>
          <li>Send an email with the recommendation</li>
        </ol>
      </div>
      {catalogOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-start justify-center pt-20" onClick={()=> setCatalogOpen(false)}>
          <div onClick={(e)=> e.stopPropagation()}>
            <AddActionMenu groups={catalogGroups} onSelect={(id)=> { setCatalogOpen(false); quickAddById(id) }} />
          </div>
        </div>
      )}
    </div>
  )
}


