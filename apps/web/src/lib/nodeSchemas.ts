import { z } from 'zod'

export type FieldMeta = {
  key: string
  label: string
  widget: 'text' | 'number' | 'textarea' | 'select' | 'csv' | 'secret'
  options?: string[]
  placeholder?: string
}

export type NodeSchema = {
  type: string
  schema: z.ZodObject<any>
  fields: FieldMeta[]
}

const inputSchema = z.object({ label: z.string().optional(), path: z.string().min(1, 'Path is required').optional() })
const httpSchema = z.object({
  label: z.string().optional(),
  method: z.string().default('GET'),
  url: z.string().min(1, 'URL is required').optional(),
  headers: z.record(z.string(), z.any()).optional(),
  body: z.any().optional(),
})
const emailSchema = z.object({ label: z.string().optional(), to: z.string().min(1, 'Recipient is required').optional(), subject: z.string().optional(), body: z.string().optional() })
const slackSchema = z.object({ label: z.string().optional(), channel: z.string().optional(), message: z.string().optional(), tokenSecret: z.string().optional() })
const transformSchema = z.object({ label: z.string().optional(), script: z.string().optional() })
const delaySchema = z.object({ label: z.string().optional(), ms: z.number().int().positive().optional() })
const loopSchema = z.object({ label: z.string().optional(), iterations: z.number().int().positive().optional(), var: z.string().optional(), breakIf: z.string().optional() })
const switchSchema = z.object({ label: z.string().optional(), cases: z.array(z.string()).optional() })
const joinSchema = z.object({ label: z.string().optional(), strategy: z.string().optional() })
const trycatchSchema = z.object({ label: z.string().optional(), retries: z.number().int().nonnegative().optional(), onError: z.string().optional() })
const notionSchema = z.object({ label: z.string().optional(), operation: z.string().optional(), databaseId: z.string().optional() })
const sheetsSchema = z.object({ label: z.string().optional(), operation: z.string().optional(), spreadsheetId: z.string().optional(), range: z.string().optional() })
const airtableSchema = z.object({ label: z.string().optional(), operation: z.string().optional(), baseId: z.string().optional(), table: z.string().optional() })
const discordSchema = z.object({ label: z.string().optional(), channelId: z.string().optional(), message: z.string().optional(), tokenSecret: z.string().optional() })
const subflowSchema = z.object({ label: z.string().optional(), subflowId: z.string().optional() })

export const NODE_SCHEMAS: Record<string, NodeSchema> = {
  input: {
    type: 'input',
    schema: inputSchema,
    fields: [
      { key: 'label', label: 'Label', widget: 'text', placeholder: 'Trigger' },
      { key: 'path', label: 'Path (Trigger)', widget: 'text', placeholder: '/webhook/new-order' },
    ],
  },
  http: {
    type: 'http',
    schema: httpSchema,
    fields: [
      { key: 'method', label: 'Method', widget: 'select', options: ['GET','POST','PUT','PATCH','DELETE'] },
      { key: 'url', label: 'URL', widget: 'text', placeholder: 'https://api.example.com' },
      { key: 'headers', label: 'Headers (JSON)', widget: 'textarea', placeholder: '{"Authorization":"Bearer ..."}' },
      { key: 'body', label: 'Body (JSON)', widget: 'textarea', placeholder: '{"key":"value"}' },
    ],
  },
  email: { type: 'email', schema: emailSchema, fields: [
    { key: 'to', label: 'To', widget: 'text', placeholder: 'user@example.com' },
    { key: 'subject', label: 'Subject', widget: 'text' },
    { key: 'body', label: 'Body', widget: 'textarea' },
  ] },
  slack: { type: 'slack', schema: slackSchema, fields: [
    { key: 'channel', label: 'Channel', widget: 'text', placeholder: '#general' },
    { key: 'message', label: 'Message', widget: 'text' },
    { key: 'tokenSecret', label: 'Token secret', widget: 'secret' },
  ] },
  transform: { type: 'transform', schema: transformSchema, fields: [
    { key: 'script', label: 'Script (JS)', widget: 'textarea', placeholder: '// input is the payload\nreturn input' },
  ] },
  delay: { type: 'delay', schema: delaySchema, fields: [ { key: 'ms', label: 'Delay (ms)', widget: 'number' } ] },
  loop: { type: 'loop', schema: loopSchema, fields: [ { key: 'iterations', label: 'Iterations', widget: 'number' }, { key: 'var', label: 'Variable', widget: 'text' }, { key: 'breakIf', label: 'Break condition (JS)', widget: 'text' } ] },
  switch: { type: 'switch', schema: switchSchema, fields: [ { key: 'cases', label: 'Cases', widget: 'csv', placeholder: 'A, B, C' } ] },
  join: { type: 'join', schema: joinSchema, fields: [ { key: 'strategy', label: 'Strategy', widget: 'select', options: ['all','any'] } ] },
  trycatch: { type: 'trycatch', schema: trycatchSchema, fields: [ { key: 'retries', label: 'Retry attempts', widget: 'number' }, { key: 'onError', label: 'On error', widget: 'select', options: ['route','suppress','propagate'] } ] },
  notion: { type: 'notion', schema: notionSchema, fields: [ { key: 'operation', label: 'Operation', widget: 'select', options:['createPage','updatePage'] }, { key: 'databaseId', label: 'Database ID', widget: 'text' } ] },
  sheets: { type: 'sheets', schema: sheetsSchema, fields: [ { key: 'operation', label: 'Operation', widget: 'select', options:['append','read'] }, { key: 'spreadsheetId', label: 'Spreadsheet ID', widget: 'text' }, { key: 'range', label: 'Range', widget: 'text' } ] },
  airtable: { type: 'airtable', schema: airtableSchema, fields: [ { key: 'operation', label: 'Operation', widget: 'select', options:['createRecord','updateRecord'] }, { key: 'baseId', label: 'Base ID', widget: 'text' }, { key: 'table', label: 'Table', widget: 'text' } ] },
  discord: { type: 'discord', schema: discordSchema, fields: [ { key: 'channelId', label: 'Channel ID', widget: 'text' }, { key: 'message', label: 'Message', widget: 'text' }, { key: 'tokenSecret', label: 'Token secret', widget: 'secret' } ] },
  subflow: { type: 'subflow', schema: subflowSchema, fields: [ { key: 'subflowId', label: 'Workflow ID', widget: 'text' } ] },
}


