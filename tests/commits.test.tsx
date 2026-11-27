import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'commits-sh',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 }, view: {},
  },
} as const

const usage = (n: number) => ({
  input_tokens: n, output_tokens: n, cache_read_input_tokens: 8 * n, cache_creation_input_tokens: 0, model: 'claude-opus-5-5',
})

/** The engine beneath the mod: a session id, a store, a clock. */
function engine(on: any) {
  const store = new Map<string, unknown>()
  let clock = Date.parse('2026-11-26T15:00:00')
  on('session.id', () => ({ value: 'session-test-1' }))
  on('store.get', (_: unknown, e: { key: string }) => ({ value: store.get(e.key) }))
  on('store.set', (_: unknown, e: { key: string; value: unknown }) => { store.set(e.key, e.value); return { value: undefined } })
  on('store.delete', (_: unknown, e: { key: string }) => { store.delete(e.key); return { value: undefined } })
  on('store.keys', () => ({ value: [...store.keys()] }))
  on('clock.now', () => ({ value: (clock += 1000) }))
  on('clock.every', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'commits' } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('turn.start', (_: unknown, e: { turnId: string }) => ({ turnId: e.turnId }))
  return store
}

async function oneTurn($: any, on: any, turnId: string, n: number) {
  await $.turn.start({ turnId })
  const stream = $.turn.step({ turnId, index: 0, model: 'claude-opus-5-5', messageCount: 1 })
  for await (const _ of stream) { /* chunks */ }
  await stream.result
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1000, isAborted: false, turnId })
}

test('the band shows the session tape, est. dollars and the cache countdown, on every surface', async ($, on) => {
  let next = 0
  const sizes = [1_000_000, 3_000_000, 2_000_000]
  engine(on)
  on('turn.step', async function* (_, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: usage(sizes[next++]! / 10) }
  })
  on('turn.complete', () => ({ text: '' }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  for (const id of ['t1', 't2', 't3']) await oneTurn($, on, id, 0)
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 62 }], cost: { usd: 14.1 }, changed: [] })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const found = await ui.findAll({ type: 'Text' })
    const all = found.map((t) => t.text).join(' ')
    expect(all).toContain('◆ commits.sh')
    expect(all).toContain('6M tok')
    expect(all).toContain('$14.10')
    expect(all).toMatch(/⏱ \d:\d\d/)
    expect(all).toMatch(/5H █+ 62%/)
    await ui.unmount()
  }

  // A narrow column gives up today, 7D, 5H, the cache and the dollars, in that
  // order; the brand and the session stay.
  const narrow = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, bodyColumns: 30 } })
  const thin = (await narrow.findAll({ type: 'Text' })).map((t) => t.text).join(' ')
  expect(thin).toContain('◆ commits.sh')
  expect(thin).toContain('6M tok')
  expect(thin).not.toContain('5H')
  expect(thin).not.toContain('⏱')
  await narrow.unmount()
})

test('nothing shows before the first turn', async ($, on) => {
  engine(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()
})

test('/commits connect checks the handle and reads the pulse once', async ($, on) => {
  const fetched: string[] = []
  const store = engine(on)
  on('http.fetch', (_, e) => {
    fetched.push(e.url)
    return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify({ connected: true, total: 211_800_000_000, rate: 4_400_000, ageSec: 8 }) } }
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect((await $.command.run({ command: 'commits', args: 'connect not/valid' } as any)).text).toContain('Usage')
  expect((await $.command.run({ command: 'commits', args: 'connect @maxmoneycash' } as any)).text).toBe('Connected to commits.sh/maxmoneycash.')
  expect(fetched).toEqual(['https://commits.sh/api/usage/pulse?handle=maxmoneycash'])
  expect(store.get('handle')).toBe('maxmoneycash')
})

test('the pane draws today, the session, limits and the connect hint, on every surface', async ($, on) => {
  engine(on)
  on('turn.step', async function* (_, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: usage(400_000) }
  })
  on('turn.complete', () => ({ text: '' }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  for (const id of ['t1', 't2']) await oneTurn($, on, id, 0)
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 23, resetsAt: '2026-11-26T18:00:00' }, { kind: 'seven_day', percentUsed: 61 }], cost: { usd: 3.2 }, changed: [] })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'commits-sh', surface, component: 'Pane', requestId: 'commits', props: { title: 'commits.sh', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } })
    const lines = (await ui.findAll({ type: 'Text' })).map((t) => t.text)
    const all = lines.join('\n')
    expect(all).toContain('TODAY')
    expect(all).toContain('◆ commits.sh')
    expect(all).toContain('SESSION')
    expect(all).toContain('5H')
    expect(all).toContain('/commits connect')
    expect(all).toMatch(/5H █+ 23%/)
    await ui.unmount()
  }
})

test('/commits caps on draws rounded powerline caps around each pill in the terminal', async ($, on) => {
  engine(on)
  on('turn.step', async function* (_, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: usage(100_000) }
  })
  on('turn.complete', () => ({ text: '' }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await oneTurn($, on, 't1', 0)
  expect((await $.command.run({ command: 'commits', args: 'caps on' } as any)).text).toContain('Nerd Font')
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const all = (await ui.findAll({ type: 'Text' })).map((t) => t.text).join('')
  expect(all).toContain(' ◆ commits.sh ')
  await ui.unmount()
})
