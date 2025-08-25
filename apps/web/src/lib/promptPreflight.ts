export function preflightPrompt(input: string): { ok: boolean; reasons?: string[]; suggestions?: string[] } {
  const text = String(input || '').trim().toLowerCase()
  const reasons: string[] = []
  if (!text || text.length < 8) {
    reasons.push('too short')
  }
  // Heuristics: need a trigger and an action+destination
  const hasTrigger = /(when|every|daily|hourly|at\s+\d|on\s+new|incoming|schedule)/.test(text)
  const hasAction = /(send|post|tweet|email|notify|create|write|update|insert|publish)/.test(text)
  const hasDestination = /(slack|twitter|x\b|gmail|email|outlook|airtable|notion|google\s*sheets|webhook|discord)/.test(text)
  if (!hasTrigger) reasons.push('missing trigger (when/every/at)')
  if (!hasAction) reasons.push('missing action (send/post/email/…)')
  if (!hasDestination) reasons.push('missing destination/provider (Slack/Twitter/Gmail/…)')
  const ok = reasons.length === 0
  const suggestions = ok ? [] : [
    'Add a trigger: "Every weekday at 9am…" or "When a new row is added…"',
    'Add an action: "…post the top 3 headlines" or "…send an email"',
    'Name a destination/provider: "…to Slack #announcements" or "…via Gmail"'
  ]
  return { ok, reasons, suggestions }
}


