"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGraphStore } from '@/store/graph'
import { fromDsl } from '@/lib/dsl'

export default function HomePage() {
  const router = useRouter()
  useEffect(() => {
    try {
      // Do not auto-seed any workflow; first-run remains blank by default
    } catch {}
  }, [router])
  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-lg)] fp-hero-gradient p-6 shadow-fp-1">
        <h1 className="text-2xl font-semibold">Welcome to FlowPuppy</h1>
        <p className="text-slate-600 mt-1">Conversational workflow creation and beautiful mini-apps.</p>
        <div className="mt-4 flex gap-2">
          <a href="/create" className="inline-flex items-center px-3 py-2 rounded-[var(--radius-sm)] bg-fp-primary text-white hover:bg-fp-primary-600 transition-colors">Create with AI</a>
          <a href="/templates" className="inline-flex items-center px-3 py-2 rounded-[var(--radius-sm)] border border-fp-border hover:bg-white">Browse Templates</a>
          <a href="/apps" className="inline-flex items-center px-3 py-2 rounded-[var(--radius-sm)] border border-fp-border hover:bg-white">Mini Apps</a>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <HomeCard title="Recent Workflows" />
        <HomeCard title="Drafts" />
        <HomeCard title="Mini Apps" />
      </div>
    </div>
  )
}

function HomeCard({ title }: { title: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-fp-border bg-fp-surface p-4 min-h-40 shadow-fp-1">
      <div className="font-medium mb-2">{title}</div>
      <div className="text-slate-500 text-sm">Coming soon</div>
    </div>
  )
}

