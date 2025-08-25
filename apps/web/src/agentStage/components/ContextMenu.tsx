"use client"
import React from 'react'

export default function ContextMenu({ x, y, onAdd, onClose }: { x: number; y: number; onAdd: ()=>void; onClose: ()=>void }) {
  React.useEffect(()=>{
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])
  return (
    <div className="fixed z-[70]" style={{ left: x, top: y }} onClick={(e)=> e.stopPropagation()}>
      <div className="min-w-[160px] rounded-md border border-[#e2e8f0] bg-white shadow-[0_8px_28px_rgba(2,6,23,.15)] p-1 text-sm">
        <button className="w-full text-left px-2 py-1 rounded hover:bg-slate-50" onClick={()=> { onAdd(); onClose() }}>Add action</button>
        <button className="w-full text-left px-2 py-1 rounded hover:bg-slate-50" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}



