function isLikelySecretKey(key: string): boolean {
  const k = key.toLowerCase()
  return k.includes('token') || k.includes('secret') || k.includes('authorization') || k === 'api-key' || k.includes('apikey')
}

function isLikelySecretValue(value: string): boolean {
  if (!value) return false
  if (/^Bearer\s+\S{10,}/i.test(value)) return true
  if (/^[A-Za-z0-9_\-]{24,}$/.test(value)) return true
  if (/^sk-\w{20,}/.test(value)) return true
  return false
}

export function redactSensitive(input: any): any {
  if (input === null || input === undefined) return input
  if (typeof input === 'string') {
    if (isLikelySecretValue(input)) return '***'
    return input
  }
  if (Array.isArray(input)) return input.map(redactSensitive)
  if (typeof input === 'object') {
    const out: any = Array.isArray(input) ? [] : {}
    for (const [k, v] of Object.entries(input)) {
      if (isLikelySecretKey(k)) {
        out[k] = '***'
      } else {
        out[k] = redactSensitive(v)
      }
    }
    return out
  }
  return input
}



