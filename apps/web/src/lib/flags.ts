// Simple feature flag helper
export function isAgentBuildEnabled(): boolean {
  // Default ON; set NEXT_PUBLIC_AGENT_BUILD=0 to disable.
  const v = process.env.NEXT_PUBLIC_AGENT_BUILD
  if (v === '0') return false
  return true
}

export function isPrimaryPathStylingEnabled(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const v = window.localStorage.getItem('fp-ff-primaryPath')
      if (v != null) return v === '1'
    } catch {}
  }
  return true
}



