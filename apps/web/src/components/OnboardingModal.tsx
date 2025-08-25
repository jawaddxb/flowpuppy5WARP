"use client"
import React from 'react'

type Sample = { id: string; icon: string; title: string; description: string; prompt: string }

export default function OnboardingModal({
  open,
  onClose,
  context,
  samples,
  onTrySample,
}: {
  open: boolean
  onClose: () => void
  context: 'create' | 'builder'
  samples: Sample[]
  onTrySample: (prompt: string) => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[min(960px,92vw)] max-h-[86vh] overflow-auto rounded-[16px] shadow-2xl border border-fp-border bg-white p-5">
        <button className="absolute top-2 right-2 px-2 py-1 text-sm rounded border border-fp-border bg-white" onClick={onClose} aria-label="Close">✕</button>
        <div className="flex items-center gap-3 mb-2">
          <img alt="FlowPuppy" src="/puppy.svg" className="w-8 h-8" />
          <div className="text-xl font-semibold">Welcome to FlowPuppy</div>
        </div>
        <div className="text-slate-600 mb-4">
          I can conversationally create workflows that do multiple tasks for you—and even turn them into mini apps you can use and share.
        </div>
        <div className="text-sm font-medium mb-2">Try an example</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {samples.map((s)=> (
            <button key={s.id} className="group text-left border border-fp-border rounded-[12px] p-3 bg-gradient-to-b from-white to-fp-surface hover:shadow-fp-1 transition-all"
              onClick={()=> { onClose(); onTrySample(s.prompt) }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{s.icon}</span>
                <div className="font-semibold">{s.title}</div>
              </div>
              <div className="text-slate-600 text-sm">{s.description}</div>
              <div className="mt-2 text-xs text-fp-primary opacity-0 group-hover:opacity-100 transition-opacity">Try this →</div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm">
          {context==='create' ? (
            <div className="text-slate-600">Start typing below to build from scratch, or explore templates.</div>
          ) : (
            <div className="text-slate-600">Use the samples above to start a plan in Chat, or browse templates.</div>
          )}
        </div>
      </div>
    </div>
  )
}



