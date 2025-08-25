import { safeFetch } from '@/lib/egress'
export async function execNotion(config: any): Promise<any> {
  const token = process.env.NOTION_TOKEN || ''
  const operation = String(config?.operation || 'createPage')
  const databaseId = String(config?.databaseId || '')
  if (token && operation === 'createPage' && databaseId) {
    const res = await safeFetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${token}`,
        'content-type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          Name: { title: [{ text: { content: String(config?.title || 'FlowPuppy') } }] },
        },
      }),
    })
    const data: any = await res.json().catch(()=> ({}))
    if (!res.ok) throw new Error(`notion ${data?.message || res.status}`)
    return { id: data.id || 'notion' }
  }
  return { id: 'mock-notion', ok: true }
}

export async function execSheets(config: any): Promise<any> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY || ''
  const operation = String(config?.operation || 'read')
  const spreadsheetId = String(config?.spreadsheetId || '')
  const range = String(config?.range || 'A1:B2')
  if (apiKey && operation === 'read' && spreadsheetId) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`
    const res = await safeFetch(url)
    const data: any = await res.json().catch(()=> ({}))
    if (!res.ok) throw new Error(`sheets ${data?.error?.message || res.status}`)
    return { values: data.values || [] }
  }
  return { ok: true, values: [] }
}

export async function execAirtable(config: any): Promise<any> {
  const apiKey = process.env.AIRTABLE_API_KEY || ''
  const baseId = String(config?.baseId || '')
  const table = String(config?.table || '')
  const operation = String(config?.operation || 'createRecord')
  if (apiKey && baseId && table && operation === 'createRecord') {
    const res = await safeFetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`, {
      method: 'POST',
      headers: { 'authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ records: [{ fields: config?.fields || { Name: 'FlowPuppy' } }] }),
    })
    const data: any = await res.json().catch(()=> ({}))
    if (!res.ok) throw new Error(`airtable ${data?.error?.message || res.status}`)
    return { created: (data.records || []).length }
  }
  return { ok: true }
}



