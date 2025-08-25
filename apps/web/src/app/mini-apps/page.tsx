"use client"
import { useState } from 'react'

export default function MiniAppsPage() {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Mini-Apps</h1>
      <div className="rounded-[var(--radius-lg)] border border-fp-border bg-fp-surface p-4 shadow-fp-1 flex items-center justify-between">
        <div>Publish your workflow as a mini-app.</div>
        <button onClick={()=>setOpen(true)} className="px-3 py-2 rounded-[var(--radius-sm)] bg-fp-primary text-white hover:bg-fp-primary-600">Publish</button>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-fp-border bg-fp-surface p-4 shadow-fp-1">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">Publish Mini‑App</div>
              <button onClick={()=>setOpen(false)} className="px-2 py-1 border border-fp-border rounded">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Name</label>
                <input className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1" placeholder="My Mini‑App" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Visibility</label>
                <select className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1">
                  <option>private</option>
                  <option>unlisted</option>
                  <option>public</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Theme</label>
                <select className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1">
                  <option>Light</option>
                  <option>Dark</option>
                </select>
              </div>
              <div className="rounded-[var(--radius-md)] border border-fp-border p-3 bg-white">
                <div className="text-xs text-slate-500 mb-1">Embed Preview</div>
                <div className="aspect-video bg-slate-100 rounded" />
                <div className="mt-2 text-xs font-mono bg-slate-50 p-2 rounded border border-fp-border">&lt;iframe src=&quot;https://app.flowpuppy.io/embed/mini-app-id?token=...&quot;/&gt;</div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>setOpen(false)} className="px-3 py-2 rounded-[var(--radius-sm)] border border-fp-border">Cancel</button>
              <button className="px-3 py-2 rounded-[var(--radius-sm)] bg-fp-primary text-white hover:bg-fp-primary-600">Publish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

