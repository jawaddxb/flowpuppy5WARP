"use client"
import { create } from 'zustand'

export type DraftNode = {
  id: string
  type: string
  label?: string
}

export type WorkflowDraft = {
  nodes: DraftNode[]
}

type WorkflowDraftState = {
  draft: WorkflowDraft | null
  setDraft: (draft: WorkflowDraft | null) => void
  currentDraftId?: string | null
  setCurrentDraftId: (id: string | null) => void
}

export const useWorkflowDraftStore = create<WorkflowDraftState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  currentDraftId: null,
  setCurrentDraftId: (id) => set({ currentDraftId: id }),
}))

