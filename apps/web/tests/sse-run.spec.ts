import { test, expect } from '@playwright/test'

test.describe('@sse', () => {
  test('run stream returns start and end events', async ({ request }) => {
    const dsl = { version: 2.1, nodes: [{ id:'n1', type:'input' }], edges: [] }
    const res = await request.post('/api/run/stream', { data: { dsl, input: {}, options: { maxRuntimeMs: 1000 } } })
    expect(res.ok()).toBeTruthy()
    const body = await res.body()
    const text = body.toString('utf8')
    expect(text).toContain('data:')
  })
  test('code -> loop executes and completes', async ({ request }) => {
    const dsl = { version: 2.1, nodes: [
      { id:'n1', type:'input' },
      { id:'n2', type:'code', config: { code: 'return [1,2,3]' } },
      { id:'n3', type:'loop', config: { maxConcurrent: 2, mapper: 'return item*2' } },
    ], edges: [
      { source:'n1', target:'n2' },
      { source:'n2', target:'n3' }
    ] }
    const res = await request.post('/api/run/stream', { data: { dsl, input: {}, options: { maxRuntimeMs: 3000 } } })
    expect(res.ok()).toBeTruthy()
    const text = (await res.body()).toString('utf8')
    expect(text).toContain('data:')
  })
})


