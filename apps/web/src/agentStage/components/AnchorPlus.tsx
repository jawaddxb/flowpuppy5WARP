"use client"
import React from 'react'

export function AnchorPlus({ onClick, className = '' }: { onClick: (e: React.MouseEvent)=>void; className?: string }) {
  return (
    <button
      data-testid="anchor-plus"
      aria-label="Add action"
      aria-hidden="true"
      tabIndex={-1}
      className={`absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full border bg-white px-2 text-sm shadow hover:bg-slate-50 z-[40] ${className}`}
      onClick={onClick}
    >+</button>
  )
}


