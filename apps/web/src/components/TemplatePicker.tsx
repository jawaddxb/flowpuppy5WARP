"use client"
import React from 'react'
import { useGraphStore } from '@/store/graph'

export default function TemplatePicker({ onClose }: { onClose: () => void }) {
  const addTemplate = (key: string) => {
    const { addNode } = useGraphStore.getState() as any
    if (key === 'http_email') {
      const id1 = `http_${Math.random().toString(36).slice(2,7)}`
      const id2 = `email_${Math.random().toString(36).slice(2,7)}`
      addNode({ id: id1, type: 'http', position: { x: 150, y: 150 }, data: { label: 'HTTP Request', method: 'GET', url: 'https://api.example.com' } })
      addNode({ id: id2, type: 'email', position: { x: 400, y: 150 }, data: { label: 'Email', to: 'user@example.com', subject: 'Hello' } })
      const { edges, setGraph, nodes } = useGraphStore.getState() as any
      setGraph(nodes, [...edges, { id: `e_${id1}_${id2}`, source: id1, target: id2, label: 'success', type: 'labeled' }])
    } else if (key === 'switch_parallel') {
      const sid = `switch_${Math.random().toString(36).slice(2,7)}`
      const a = `http_${Math.random().toString(36).slice(2,7)}`
      const b = `delay_${Math.random().toString(36).slice(2,7)}`
      addNode({ id: sid, type: 'switch', position: { x: 200, y: 100 }, data: { label: 'Switch', cases: ['A','B'] } })
      addNode({ id: a, type: 'http', position: { x: 450, y: 60 }, data: { label: 'HTTP A', method: 'GET', url: 'https://a.example.com' } })
      addNode({ id: b, type: 'delay', position: { x: 450, y: 160 }, data: { label: 'Delay B', ms: 500 } })
      const { edges, setGraph, nodes } = useGraphStore.getState() as any
      setGraph(nodes, [
        ...edges,
        { id: `e_${sid}_${a}`, source: sid, target: a, sourceHandle: 'case:A', label: 'A', type: 'labeled' },
        { id: `e_${sid}_${b}`, source: sid, target: b, sourceHandle: 'case:B', label: 'B', type: 'labeled' },
      ])
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[var(--radius-lg)] border border-fp-border bg-white shadow-fp-1 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Insert template</div>
          <button onClick={onClose} className="px-2 py-1 text-xs rounded border border-fp-border">Close</button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <button onClick={()=>addTemplate('http_email')} className="text-left px-3 py-2 rounded border border-fp-border hover:bg-slate-50">
            <div className="font-medium text-sm">HTTP → Email</div>
            <div className="text-xs text-slate-500">Fetch data then send an email</div>
          </button>
          <button onClick={()=>addTemplate('switch_parallel')} className="text-left px-3 py-2 rounded border border-fp-border hover:bg-slate-50">
            <div className="font-medium text-sm">Switch to parallel paths</div>
            <div className="text-xs text-slate-500">Route based on case to different steps</div>
          </button>
        </div>
      </div>
    </div>
  )
}



