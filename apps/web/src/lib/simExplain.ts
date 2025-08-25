export type SimExplain = { title: string; detail: string; sample: any }

export function describeNode(node: any): SimExplain {
  const type = String(node?.type || '').toLowerCase()
  const cfg = (node?.data || {}) as Record<string, any>
  switch (type) {
    case 'input':
      return { title: 'Trigger', detail: `Starts the workflow when an event hits ${cfg.path || '/webhook'}.`, sample: { path: cfg.path || '/webhook', method: 'POST', body: { id: 'evt_123', payload: '...' } } }
    case 'http':
      return { title: 'Call an API', detail: `Requests ${cfg.method || 'GET'} ${cfg.url || 'https://api.example.com'} and reads the response.`, sample: { status: 200, headers: { 'content-type': 'application/json' }, body: { ok: true, items: 3 } } }
    case 'transform':
      return { title: 'Transform data', detail: 'Cleans, maps, or computes fields for the next step.', sample: { total: 42, summary: 'Calculated from inputs' } }
    case 'switch':
      return { title: 'Choose a path', detail: 'Evaluates a condition and routes to the matching branch.', sample: { branch: cfg.case || 'default', reason: 'Condition evaluated to true' } }
    case 'delay':
      return { title: 'Wait', detail: `Pauses for ${cfg.ms ? `${cfg.ms} ms` : 'a short time'} before continuing.`, sample: { waitedMs: cfg.ms || 1000 } }
    case 'email':
      return { title: 'Send an email', detail: `Sends an email to ${cfg.to || 'user@example.com'}.`, sample: { to: cfg.to || 'user@example.com', subject: cfg.subject || 'Hello from your workflow', id: 'msg_123' } }
    case 'slack':
      return { title: 'Notify Slack', detail: `Posts a message to ${cfg.channel || '#general'}.`, sample: { channel: cfg.channel || '#general', text: cfg.text || 'Workflow update: success ✅' } }
    default:
      return { title: cfg.label || 'Step', detail: 'Performs an action and passes its result to the next step.', sample: { ok: true } }
  }
}


