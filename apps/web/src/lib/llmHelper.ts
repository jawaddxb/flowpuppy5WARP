import type { AiProvider } from '@/lib/providers'
import { parseJsonLoose } from '@/lib/jsonRepair'

export type JsonSchemaSpec = { name: string; schema: any; strict?: boolean }

export async function callWithSchemaFallback<T = any>(
  providers: AiProvider[],
  prompt: string,
  jsonSchema: JsonSchemaSpec,
  attemptsPerProvider = 2,
  delayMs = 250
): Promise<{ ok: true; data: T } | { ok: false; errors: string[] }> {
  const failures: string[] = []
  for (const p of providers) {
    for (let attempt = 0; attempt < attemptsPerProvider; attempt++) {
      const r = await p.call({ prompt, jsonSchema })
      if (!r.ok || !r.text) { failures.push(`${p.name}: ${r.error || 'no text'}`); break }
      try {
        const j = parseJsonLoose<T>(r.text)
        return { ok: true, data: j }
      } catch {
        if (attempt === 0) { await new Promise(res => setTimeout(res, delayMs)); continue }
        failures.push(`${p.name}: invalid json`)
      }
    }
  }
  return { ok: false, errors: failures }
}


export type LlmAttemptLog = {
  provider: string
  attempt: number
  ms: number
  outcome: 'ok' | 'invalid_json' | 'schema_invalid' | 'domain_invalid' | 'error'
  error?: string
}

export async function callLlmJsonWithZod<T = any>(
  providers: AiProvider[],
  prompt: string,
  zodSchema: { safeParse: (v: unknown) => { success: boolean; data?: T } },
  jsonSchema?: JsonSchemaSpec,
  attemptsPerProvider = 2,
  delayMs = 250,
  extraCheck?: (j: T) => boolean
): Promise<{ ok: true; data: T; provider: string; logs: LlmAttemptLog[] } | { ok: false; logs: LlmAttemptLog[] }> {
  const logs: LlmAttemptLog[] = []
  // If a strict JSON schema is provided, instruct providers to use it where supported
  for (const p of providers) {
    for (let attempt = 0; attempt < attemptsPerProvider; attempt++) {
      const t0 = Date.now()
      try {
        const r = await p.call({ prompt, jsonSchema })
        const ms = Date.now() - t0
        if (!r.ok || !r.text) {
          logs.push({ provider: p.name, attempt: attempt + 1, ms, outcome: 'error', error: r.error || 'no text' })
          break
        }
        try {
          const j = parseJsonLoose<any>(r.text)
          const v = zodSchema.safeParse(j)
          if (!v.success) {
            if (attempt === 0) {
              logs.push({ provider: p.name, attempt: attempt + 1, ms, outcome: 'schema_invalid' })
              await new Promise(res => setTimeout(res, delayMs))
              continue
            }
            logs.push({ provider: p.name, attempt: attempt + 1, ms, outcome: 'schema_invalid' })
            break
          }
          if (extraCheck && !extraCheck(v.data as T)) {
            if (attempt === 0) {
              logs.push({ provider: p.name, attempt: attempt + 1, ms, outcome: 'domain_invalid' })
              await new Promise(res => setTimeout(res, delayMs))
              continue
            }
            logs.push({ provider: p.name, attempt: attempt + 1, ms, outcome: 'domain_invalid' })
            break
          }
          logs.push({ provider: p.name, attempt: attempt + 1, ms, outcome: 'ok' })
          return { ok: true, data: (v.data as T), provider: p.name, logs }
        } catch {
          if (attempt === 0) {
            logs.push({ provider: p.name, attempt: attempt + 1, ms, outcome: 'invalid_json' })
            await new Promise(res => setTimeout(res, delayMs))
            continue
          }
          logs.push({ provider: p.name, attempt: attempt + 1, ms, outcome: 'invalid_json' })
          break
        }
      } catch (e: any) {
        const ms = Date.now() - t0
        logs.push({ provider: p.name, attempt: attempt + 1, ms, outcome: 'error', error: String(e?.message || e) })
        break
      }
    }
  }
  return { ok: false, logs }
}


