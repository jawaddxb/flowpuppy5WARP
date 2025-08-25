"use client"
import React from 'react'

export default function BranchChip({ label, onAdd }: { label: string; onAdd?: () => void }) {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#e2e8f0] bg-white text-[11px] text-slate-700 shadow-sm">
      <span>{label}</span>
      <button data-testid="branch-chip-add" aria-label={`Add under ${label}`} onClick={onAdd} className="h-4 w-4 rounded-full border border-[#e2e8f0] flex items-center justify-center">+</button>
    </div>
  )
}



