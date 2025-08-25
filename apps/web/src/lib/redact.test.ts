import { describe, it, expect } from 'vitest'
import { redactSensitive } from './redact'

describe('redactSensitive', () => {
  it('redacts likely secret keys', () => {
    const input = { token: 'abc', nested: { apiKey: 'xyz' }, safe: 'ok' }
    const out = redactSensitive(input)
    expect(out.token).toBe('***')
    expect(out.nested.apiKey).toBe('***')
    expect(out.safe).toBe('ok')
  })

  it('redacts likely secret string values', () => {
    const input = { header: 'Bearer sk-THISISASECRETKEY', id: '123', plain: 'hello' }
    const out = redactSensitive(input)
    expect(out.header).toBe('***')
    expect(out.id).toBe('123')
    expect(out.plain).toBe('hello')
  })
})


