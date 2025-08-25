"use client"
import { create } from 'zustand'

export type Org = { id: string; name: string }
export type User = { id: string; email: string; name?: string; role?: 'admin'|'user' }

type AuthState = {
  user: User | null
  orgs: Org[]
  currentOrgId: string | null
  signIn: (email: string) => void
  signOut: () => void
  setOrg: (orgId: string) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  orgs: [{ id: 'org-demo', name: 'Demo Org' }],
  currentOrgId: 'org-demo',
  signIn: (email) => set({ user: { id: 'user-demo', email, role: 'admin' } }),
  signOut: () => set({ user: null }),
  setOrg: (orgId) => set({ currentOrgId: orgId }),
}))

