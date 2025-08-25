import { describe, it, expect } from 'vitest'
import { EXAMPLE_NFT_DISCORD, validateFlowDoc } from './universalDsl'

describe('universalDsl', () => {
  it('validates the example document', () => {
    const res = validateFlowDoc(EXAMPLE_NFT_DISCORD)
    if (res.ok === false) {
      // helps debugging locally if schema drifts
      // eslint-disable-next-line no-console
      console.error(res.errors)
    }
    expect(res.ok).toBe(true)
  })
})



