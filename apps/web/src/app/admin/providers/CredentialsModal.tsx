"use client"
import { useEffect, useState } from 'react'

type Field = { name: string; label?: string; type?: 'string'|'password'|'number'|'select'|'json'; placeholder?: string; required?: boolean; options?: Array<{ label: string; value: string }> }

export function CredentialsModal({ providerId, onClose, orgId }: { providerId: string; onClose: () => void; orgId?: string }) {
  const [fields, setFields] = useState<Field[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [present, setPresent] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/admin/providers/${providerId}/credentials${orgId ? `?org=${encodeURIComponent(orgId)}` : ''}`)
      const data = await res.json()
      setFields(data?.schema?.fields || [])
      setPresent(data?.present || {})
    })()
  }, [providerId])

  function update(name: string, v: string) {
    setValues(prev => ({ ...prev, [name]: v }))
  }

  async function save() {
    setSaving(true)
    try {
      const clear: string[] = []
      for (const f of fields) {
        if (!values[f.name] && present[f.name]) clear.push(f.name)
      }
      await fetch(`/api/admin/providers/${providerId}/credentials`, { method: 'POST', body: JSON.stringify({ values, clear, orgId }) })
      await new Promise(r => setTimeout(r, 50))
      onClose()
    } finally { setSaving(false) }
  }

  async function testConnection() {
    const res = await fetch(`/api/admin/providers/${providerId}/credentials/test`, { method: 'POST', body: JSON.stringify({ orgId }) })
    const data = await res.json()
    alert(data?.ok ? (data?.message || 'OK') : (data?.message || 'Failed'))
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40" data-testid="credentials-modal">
      <div className="w-[520px] max-w-[92vw] rounded-[var(--radius-lg)] bg-white shadow-fp-2 border border-fp-border">
        <div className="p-3 border-b border-fp-border flex items-center justify-between">
          <div className="font-medium">Edit Credentials</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">×</button>
        </div>
        <div className="p-4 space-y-3">
          {fields.map(f => (
            <div key={f.name}>
              <label className="block text-xs text-slate-500 mb-1">{f.label || f.name}{f.required ? ' *' : ''}</label>
              {f.type === 'select' ? (
                <select className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1" onChange={(e)=> update(f.name, e.target.value)}>
                  <option value="">Select…</option>
                  {(f.options || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              ) : f.type === 'json' ? (
                <textarea className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1 font-mono text-xs" rows={4} placeholder={f.placeholder || ''} onChange={(e)=> update(f.name, e.target.value)} />
              ) : (
                <input
                  type={f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : 'text'}
                  placeholder={f.placeholder || ''}
                  className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-1"
                  onChange={(e)=> update(f.name, e.target.value)}
                />
              )}
              {present[f.name] && !values[f.name] && (
                <div className="text-[11px] text-slate-500 mt-0.5">Saved • leave blank to keep, or type to replace</div>
              )}
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-fp-border flex items-center justify-end gap-2" data-testid="credentials-actions">
          <button onClick={onClose} className="px-3 py-1.5 border border-fp-border rounded">Cancel</button>
          <button onClick={testConnection} className="px-3 py-1.5 border border-fp-border rounded">Test connection</button>
          <button disabled={saving} onClick={save} className="px-3 py-1.5 rounded bg-fp-primary text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}


