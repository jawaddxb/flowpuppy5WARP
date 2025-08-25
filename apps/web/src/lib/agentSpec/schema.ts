import { z } from 'zod'

export const ZScheduleSpec = z.object({
  type: z.enum(['interval','cron']),
  value: z.string(),
})

// Loosen AgentSpec to allow LLM-shaped fields while enforcing a name
export const ZAgentSpec = z.object({
  name: z.string().min(1),
}).passthrough()

export type AgentSpecZ = z.infer<typeof ZAgentSpec>


