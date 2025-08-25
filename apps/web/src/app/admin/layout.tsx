"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  const router = useRouter()
  useEffect(() => {
    // E2E bypass: when hooks enabled or cookie present, skip redirect
    const e2e = String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()
    const hasCookie = typeof document !== 'undefined' && document.cookie.includes('fp-dev-auth=1')
    if (e2e === '1' || e2e === 'true' || hasCookie) return
    if (!user) { router.replace('/login?next=' + encodeURIComponent('/admin/providers')); return }
    if (user && user.role !== 'admin') { router.replace('/'); return }
  }, [user, router])
  return <>{children}</>
}

