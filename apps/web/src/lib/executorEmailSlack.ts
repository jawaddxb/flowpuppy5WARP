export async function sendEmail(config: any): Promise<any> {
  const to = String(config?.to || '')
  const subject = String(config?.subject || '')
  const body = String(config?.body || '')
  if (!to) throw new Error('email.to required')
  const sgKey = process.env.SENDGRID_API_KEY
  const fromEmail = String(config?.from || process.env.SENDGRID_FROM || '')
  if (sgKey && fromEmail) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${sgKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail },
        subject,
        content: [{ type: 'text/plain', value: body }],
      }),
    })
    if (!res.ok) {
      const txt = await res.text().catch(()=> '')
      throw new Error(`sendgrid ${res.status}: ${txt}`)
    }
    return { to, subject, id: res.headers.get('x-message-id') || 'sendgrid', body }
  }
  // fallback mock
  return { to, subject, id: 'mock-email', body }
}

export async function sendSlack(config: any): Promise<any> {
  const channel = String(config?.channel || '')
  const message = String(config?.message || '')
  const token = String(config?.tokenSecret || process.env.SLACK_BOT_TOKEN || '')
  if (!channel) throw new Error('slack.channel required')
  if (token) {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${token}`,
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ channel, text: message || ' ' }),
    })
    const data: any = await res.json().catch(()=> ({}))
    if (!data.ok) throw new Error(`slack error: ${data.error || res.status}`)
    return { channel, message, id: data.ts || 'slack', usedToken: true }
  }
  return { channel, message, id: 'mock-slack', usedToken: false }
}

export async function sendDiscord(config: any): Promise<any> {
  const webhookUrl = String(config?.webhookUrl || '')
  const channelId = String(config?.channelId || '')
  const token = String(config?.tokenSecret || process.env.DISCORD_BOT_TOKEN || '')
  const message = String(config?.message || '')
  if (webhookUrl) {
    const res = await fetch(webhookUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: message || ' ' }) })
    if (!res.ok) throw new Error(`discord webhook ${res.status}`)
    return { id: 'discord-webhook', ok: true }
  }
  if (token && channelId) {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'authorization': `Bot ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ content: message || ' ' }),
    })
    const data: any = await res.json().catch(()=> ({}))
    if (!res.ok) throw new Error(`discord error: ${data?.message || res.status}`)
    return { id: data.id || 'discord', ok: true }
  }
  return { id: 'mock-discord', ok: true }
}


