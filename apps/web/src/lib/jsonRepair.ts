// Lightweight JSON repair/extraction for LLM outputs

function stripCodeFences(input: string): string {
  if (!input) return input
  const fence = /```[a-zA-Z0-9]*\n([\s\S]*?)```/g
  const m = fence.exec(input)
  if (m && m[1]) return m[1]
  return input
}

function extractFirstObject(input: string): string | null {
  const s = String(input || '')
  const start = s.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inStr: '"' | "'" | null = null
  let prev: string = ''
  for (let i = start; i < s.length; i++) {
    const ch: string = s[i] ?? ''
    if (inStr) {
      if (ch === inStr && prev !== '\\') inStr = null
    } else {
      if (ch === '"' || ch === "'") inStr = ch as any
      else if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) return s.slice(start, i + 1)
      }
    }
    prev = ch
  }
  return null
}

function basicRepairs(s: string): string {
  let out = s
  // Remove trailing commas before } or ]
  out = out.replace(/,\s*(\}|\])/g, '$1')
  // Ensure keys are quoted (best-effort; avoid touching already quoted keys)
  // e.g. {foo: "bar"} -> {"foo": "bar"}
  out = out.replace(/\{\s*([a-zA-Z0-9_]+)\s*:/g, '{ "$1":')
  out = out.replace(/,\s*([a-zA-Z0-9_]+)\s*:/g, ', "$1":')
  return out
}

export function parseJsonLoose<T = any>(raw: string): T {
  if (!raw) throw new Error('empty')
  const t0 = raw.trim()
  try { return JSON.parse(t0) as T } catch {}
  const unfenced = stripCodeFences(t0)
  try { return JSON.parse(unfenced) as T } catch {}
  const extracted = extractFirstObject(unfenced)
  if (extracted) {
    try { return JSON.parse(extracted) as T } catch {}
    const repaired = basicRepairs(extracted)
    try { return JSON.parse(repaired) as T } catch {}
  }
  const repairedWhole = basicRepairs(unfenced)
  return JSON.parse(repairedWhole) as T
}


