import { describe, it, expect } from 'vitest'
import { routeProviders, providers } from './providers'

describe('providers routing', () => {
  it('routes to claude by default if unknown', async () => {
    const list = await routeProviders([{ type: 'unknown' } as any])
    expect(list[0]!.name).toBe('claude')
  })

  it('returns providers in configured order', async () => {
    const list = await routeProviders([{ type: 'openai' }, { type: 'claude' }])
    expect(list[0]!.name).toBe('openai')
    expect(list[1]!.name).toBe('claude')
  })
})


