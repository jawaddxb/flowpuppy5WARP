"use client"
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'

export default function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [theme, setTheme] = useState<'light'|'dark'>('light')

  useEffect(() => {
    const saved = window.localStorage.getItem('fp-theme') as 'light'|'dark'|null
    const t = saved ?? 'light'
    setTheme(t)
    document.documentElement.classList.toggle('dark', t === 'dark')
  }, [])

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    window.localStorage.setItem('fp-theme', next)
  }
  return (
    <header className="h-14 border-b border-fp-border bg-fp-bg flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <button onClick={onToggleSidebar} aria-label="Toggle sidebar" className="px-2 py-1 rounded-[var(--radius-sm)] border border-fp-border hover:bg-white">☰</button>
        <span className="font-semibold">FlowPuppy</span>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="org-switch" className="sr-only">Organization</label>
        <OrgSwitcher />
        <button onClick={toggleTheme} aria-label="Toggle theme" className="px-2 py-1 rounded-[var(--radius-sm)] border border-fp-border hover:bg-white text-fp-text">{theme === 'light' ? 'Light' : 'Dark'}</button>
        <div className="w-8 h-8 rounded-full bg-slate-200" />
      </div>
    </header>
  )
}

function OrgSwitcher() {
  const orgs = useAuthStore(s => s.orgs)
  const currentOrgId = useAuthStore(s => s.currentOrgId)
  const setOrg = useAuthStore(s => s.setOrg)
  // Load from API when available
  useEffect(() => {
    fetch('/api/orgs').then(r=>r.json()).then(res => {
      if (res?.orgs?.length) {
        // Shallow store update without losing current selection
        // @ts-ignore minimal mock store shape
        useAuthStore.setState((prev: any) => ({ ...prev, orgs: res.orgs, currentOrgId: prev.currentOrgId ?? res.orgs[0]?.id }))
      }
    }).catch(()=>{})
  }, [])
  return (
    <select id="org-switch" aria-label="Organization" value={currentOrgId ?? undefined} onChange={(e)=>{ setOrg(e.target.value); try { localStorage.setItem('fp-current-org-id', e.target.value) } catch {} }} className="border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 bg-white text-sm">
      {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  )
}

