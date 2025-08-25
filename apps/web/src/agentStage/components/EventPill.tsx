"use client"
import React from 'react'

export default function EventPill({ label, onAdd }: { label: string; onAdd?: () => void }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">{label}</span>
      <button aria-label={`Add for ${label}`} onClick={onAdd} className="h-4 w-4 rounded-full border border-[#e2e8f0] bg-white flex items-center justify-center text-[12px]">+</button>
    </div>
  )
}



