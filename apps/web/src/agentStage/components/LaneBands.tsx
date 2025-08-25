"use client"
import React from 'react'

export function LaneBands({ lanes }: { lanes: {id:string; title?:string; order:number}[] }) {
  const sorted = lanes.slice().sort((a,b)=>a.order-b.order)
  const colW = 300, gutter = 24
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute top-0 left-0 right-0 h-8 flex">
        {sorted.map((lane, i) => (
          <div key={lane.id} style={{ width: colW, marginLeft: i===0?0:gutter }} className="text-[12px] font-semibold leading-4 text-slate-600 uppercase px-2 py-1">
            {(lane.title || '').toUpperCase()}
          </div>
        ))}
      </div>
      <div className="absolute top-8 left-0 right-0 bottom-0 flex">
        {sorted.map((lane, i) => (
          <div key={lane.id} style={{ width: colW, marginLeft: i===0?0:gutter }} className="h-full">
            <div style={{ background: 'rgba(241,245,249,.35)', width: '100%', height: '100%', borderRight: '1px solid #e2e8f0' }} />
          </div>
        ))}
      </div>
    </div>
  )
}



