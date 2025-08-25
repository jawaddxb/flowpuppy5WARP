"use client"
import { useEffect, useMemo, useState } from 'react'

type Manifest = { name: string; slug: string; icon?: string; description?: string; inputs: Array<{ name: string; label: string; type: string; required?: boolean; default?: any; help?: string }>; theme?: { accent?: string } }

export default function NewMiniApp() {
  const [step, setStep] = useState(1)
  const [manifest, setManifest] = useState<Manifest>({ name: 'Untitled', slug: 'untitled', icon: '🐶', description: '', inputs: [ { name:'query', label: 'Query', type: 'string', required: true } ], theme: { accent: '#10b981' } })
  const qs = useMemo(()=> new URLSearchParams(typeof window!=='undefined' ? window.location.search : ''), [])
  useEffect(()=>{ const s = qs.get('slug'); if (s) setManifest(m=> ({ ...m, slug: s })) }, [qs])

  function saveDraft() {
    try {
      const raw = localStorage.getItem('fp-mini-apps')
      const arr = raw ? JSON.parse(raw) : []
      const idx = Array.isArray(arr) ? arr.findIndex((m:any)=> m.slug===manifest.slug) : -1
      const item = { name: manifest.name, slug: manifest.slug, icon: manifest.icon, description: manifest.description, manifest }
      if (idx>=0) arr[idx] = item; else arr.push(item)
      localStorage.setItem('fp-mini-apps', JSON.stringify(arr))
      alert('Saved')
    } catch {}
  }

  // Redirect to AI studio for the guided experience
  useEffect(()=>{ window.location.replace('/apps/studio') }, [])
  return <div className="p-6">Redirecting to Mini App Studio…</div>
}


