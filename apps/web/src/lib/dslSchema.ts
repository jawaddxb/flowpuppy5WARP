import { z } from 'zod'

export const PositionSchema = z.object({ x: z.number(), y: z.number() }).partial()
export const SizeSchema = z.object({ width: z.number(), height: z.number() })

export const DslNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  config: z.record(z.string(), z.any()).optional(),
  position: PositionSchema.optional(),
  size: SizeSchema.optional(),
  parentId: z.string().optional(),
})

export const DslEdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
})

export const WorkflowDslSchema = z.object({
  version: z.number(),
  nodes: z.array(DslNodeSchema).min(1),
  edges: z.array(DslEdgeSchema),
})

export type WorkflowDslType = z.infer<typeof WorkflowDslSchema>

export function validateDslStrict(dsl: unknown): { ok: true } | { ok: false; errors: string[] } {
  const res = WorkflowDslSchema.safeParse(dsl)
  if (!res.success) {
    const errs = res.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`)
    return { ok: false, errors: errs }
  }
  // Additional constraints: no duplicate node ids; edges reference existing ids
  const ids = new Set<string>()
  for (const n of res.data.nodes) {
    if (ids.has(n.id)) return { ok: false, errors: [`duplicate node id: ${n.id}`] }
    ids.add(n.id)
  }
  for (const e of res.data.edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) return { ok: false, errors: [`edge references missing node: ${e.source}->${e.target}`] }
  }
  return { ok: true }
}


