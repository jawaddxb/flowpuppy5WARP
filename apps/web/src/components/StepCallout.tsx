"use client"
import React from 'react'

export default function StepCallout({ title, detail, sample }: { title: string; detail: string; sample: any }) {
  return (
    <div className="pointer-events-auto bg-white border border-fp-border rounded-[var(--radius-sm)] shadow-fp-2 p-2 text-xs w-[240px] animate-[fadeIn_200ms_ease-out]">
      <div className="font-medium mb-0.5">{title}</div>
      <div className="text-slate-600 mb-1">{detail}</div>
      <div className="bg-slate-50 border border-fp-border rounded p-1 max-h-24 overflow-auto font-mono text-[10px]">{JSON.stringify(sample, null, 2)}</div>
    </div>
  )
}


