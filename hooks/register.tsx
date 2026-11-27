// commits.sh for Claude Code: your token tape where the tokens are spent.
// The band above the prompt, a pane (/commits), a status line entry and an
// opt-in commits.sh look for the desktop app. See DESIGN.md.
//
// Every figure but one is pushed by the engine after each request, so the mod
// never polls. The exception is commits.sh's own pulse, read only for a
// connected handle, at most every five minutes, only right after a turn.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { PulseFigures, SessionFigures, TodayFigures } from '../types'
import { makeColors } from './make-colors.js'
import {
  HANDLE, PALETTE, ago, bandPieces, barCells, limitColor, cacheLeft, clockLabel, compact, dayKey, dollars, emptyShare, fitPieces,
  hourCells, modelName, readPulse, readShare, resetLabel, staleDayKeys, sumShares, tape, tokensOf, type DayShare,
} from './tape'

const PANE = 'commits'
const PULSE_EVERY_MS = 5 * 60_000

const freshSession = (): SessionFigures => ({
  tokens: 0, turns: [], models: {}, cacheRead: 0, input: 0, lastAt: null, ttlMs: null,
  usd: null, fiveHour: null, sevenDay: null, isWorking: false,
})

const session = atom({ plugin: 'commits-sh', key: 'session' } as const, freshSession(), { shape: 'session-1' })
const others = atom({ plugin: 'commits-sh', key: 'others' } as const, emptyShare() as TodayFigures, { shape: 'today-1' })
const pulse = atom({ plugin: 'commits-sh', key: 'pulse' } as const, null as PulseFigures | null, { shape: 'pulse-1' })
const handle = atom({ plugin: 'commits-sh', key: 'handle' } as const, null as string | null)
const isBandOn = atom({ plugin: 'commits-sh', key: 'isBandOn' } as const, true)
const now = atom({ plugin: 'commits-sh', key: 'now' } as const, 0)

// The commits.sh look: zinc surfaces, the site's green as the signal.
const { theme: COLORS } = makeColors({
  label: 'commits.sh',
  roles: { accent: '#22c55e', danger: '#ef4444', success: '#22c55e', warning: '#f59e0b', pro: '#a78bfa' },
  light: {
    roles: { accent: '#16a34a', success: '#16a34a', danger: '#dc2626', warning: '#d97706' },
    gray: { anchors: { 'surface-0': '#f4f4f5', 'surface-1': '#fafafa', 'surface-2': '#ffffff', 'text-primary': '#09090b', 'text-secondary': '#3f3f46', 'text-muted': '#63636b' } },
  },
  dark: {
    gray: { anchors: { 'surface-0': '#09090b', 'surface-1': '#111113', 'surface-2': '#18181b', 'surface-3': '#1c1c20', 'text-primary': '#fafafa', 'text-secondary': '#d4d4d8', 'text-muted': '#a1a1aa' } },
  },
})
const LOOK: ThemeSetArgs = { colors: COLORS }

// This session's share of today, kept in memory and saved after each turn.
// Module variables start over on a reload; session.start reads the share back.
const ctx = { shareDay: '', share: emptyShare(), usdAtDayStart: 0, sessionId: '', mainTurn: '', lastPulseTry: 0 }

function shareKey(): string {
  return `day:${ctx.shareDay}:${ctx.sessionId}`
}

async function refreshOthers($: EngineInterface): Promise<void> {
  const today = dayKey(await $.clock.now())
  const keys = await $.store.keys()
  const mine = shareKey()
  const shares: DayShare[] = []
  for (const key of keys) {
    if (!key.startsWith(`day:${today}:`) || key === mine) continue
    const value = readShare(await $.store.get(key))
    if (value) shares.push(value)
  }
  const sum = sumShares(shares)
  await update($, others, () => sum)
}

async function showStatus($: EngineInterface): Promise<void> {
  const s = await read($, session)
  $.ui.status(s.tokens > 0 ? `${compact(s.tokens)} tok${s.usd !== null ? ` · ${dollars(s.usd)} est` : ''}` : undefined)
}

async function maybePulse($: EngineInterface): Promise<void> {
  const who = await read($, handle)
  const at = await $.clock.now()
  if (!who || at - ctx.lastPulseTry < PULSE_EVERY_MS) return
  ctx.lastPulseTry = at
  try {
    const res = await $.http.fetch(`https://commits.sh/api/usage/pulse?handle=${encodeURIComponent(who)}`)
    const value = res.ok ? readPulse(res.text, at) : null
    await update($, pulse, () => value)
  } catch {
    // Unreachable: the pane keeps the last reading with its age.
  }
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    ctx.sessionId = (await $.session.id()).slice(0, 12)
    await $.command.register({ name: 'commits', description: 'Your commits.sh token tape', argumentHint: '[connect <handle> | disconnect | theme on|off | band on|off]' })
    const stored = await $.store.get('handle')
    await update($, handle, () => (typeof stored === 'string' && HANDLE.test(stored) ? stored : null))
    const band = await $.store.get('band')
    await update($, isBandOn, () => band !== 'off')
    const today = dayKey(await $.clock.now())
    for (const key of staleDayKeys(await $.store.keys(), today)) await $.store.delete(key)
    // A reload keeps the session's figures but not this module's variables.
    const saved = readShare(await $.store.get(`day:${today}:${ctx.sessionId}`))
    if (saved && ctx.shareDay !== today) {
      ctx.shareDay = today
      ctx.share = saved
      ctx.usdAtDayStart = Math.max(0, ((await read($, session)).usd ?? 0) - saved.usd)
    }
    await refreshOthers($)
    if ((await $.store.get('theme')) === 'on') {
      try { await $.theme.set(LOOK) } catch (error) { $.ui.log(String(error)) }
    }
    // The cache countdown: a redraw every five seconds while it means something.
    $.clock.every(5_000, async () => {
      const s = await read($, session)
      const at = await $.clock.now()
      const left = cacheLeft(s.lastAt, s.ttlMs, at)
      if (left !== null && left > -60_000) await update($, now, () => at)
    })
    await maybePulse($)

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (!e.agentId) await update($, session, (s) => ({ ...s, isWorking: true }))
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const sentAt = await $.clock.now()
    const result = yield* next(e)
    const usage = result.usage
    if (!usage) return result
    const tokens = tokensOf(usage)
    const cached = usage.cache_read_input_tokens > 0 || usage.cache_creation_input_tokens > 0
    const ttlMs = (usage.ephemeral_1h_input_tokens ?? 0) > 0 ? 3_600_000 : cached ? 300_000 : null
    // A main-thread step of a new turn starts a bar; agents' steps add to it.
    const isNewTurn = !e.agentId && e.turnId !== ctx.mainTurn
    if (isNewTurn) ctx.mainTurn = e.turnId
    await update($, session, (s) => {
      const turns = isNewTurn || s.turns.length === 0 ? [...s.turns, tokens] : [...s.turns.slice(0, -1), (s.turns[s.turns.length - 1] ?? 0) + tokens]
      const model = modelName(usage.model)
      return {
        ...s,
        tokens: s.tokens + tokens,
        turns: turns.slice(-200),
        models: { ...s.models, [model]: (s.models[model] ?? 0) + tokens },
        cacheRead: s.cacheRead + usage.cache_read_input_tokens,
        input: s.input + usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens,
        lastAt: !e.agentId && ttlMs !== null ? sentAt : s.lastAt,
        ttlMs: !e.agentId && ttlMs !== null ? ttlMs : s.ttlMs,
      }
    })
    // Today's share: the tokens land in the hour they were spent.
    const day = dayKey(sentAt)
    if (day !== ctx.shareDay) {
      ctx.shareDay = day
      ctx.share = emptyShare()
      ctx.usdAtDayStart = (await read($, session)).usd ?? 0
    }
    ctx.share.tokens += tokens
    const spentHour = new Date(sentAt).getHours()
    ctx.share.hours[spentHour] = (ctx.share.hours[spentHour] ?? 0) + tokens
    if (isNewTurn) ctx.share.turns += 1
    await update($, now, () => sentAt)
    await showStatus($)
    return result
  })

  on('session.measure', async ($, e, next) => {
    const limit = (kind: string) => {
      const window = e.rateLimits.find((one) => one.kind === kind)
      return window ? { pct: window.percentUsed, resetsAt: window.resetsAt } : null
    }
    await update($, session, (s) => ({ ...s, usd: e.cost?.usd ?? s.usd, fiveHour: limit('five_hour'), sevenDay: limit('seven_day') }))
    if (ctx.shareDay && e.cost) ctx.share.usd = Math.max(0, e.cost.usd - ctx.usdAtDayStart)
    await showStatus($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    // A subagent's turn ends inside the main one.
    if (e.agentId) return result
    await update($, session, (s) => ({ ...s, isWorking: false }))
    if (ctx.shareDay) await $.store.set(shareKey(), ctx.share)
    await refreshOthers($)
    await maybePulse($)
    return result
  })

  on('command.run', { command: 'commits' }, async ($, e) => {
    const [verb, value] = e.args.trim().split(/\s+/)
    switch ((verb ?? '').toLowerCase()) {
      case '':
        await $.ui.open({ id: PANE, title: 'commits.sh' })
        return { text: 'commits.sh pane opened.' }
      case 'connect': {
        const who = (value ?? '').replace(/^@/, '')
        if (!HANDLE.test(who)) return { text: 'Usage: /commits connect <github-handle>' }
        await $.store.set('handle', who)
        await update($, handle, () => who)
        ctx.lastPulseTry = 0
        await maybePulse($)
        const p = await read($, pulse)
        return { text: p ? `Connected to commits.sh/${who}.` : `Saved ${who}. commits.sh has no live usage for that handle yet: pair the Mac app at commits.sh/connect.` }
      }
      case 'disconnect':
        await $.store.delete('handle')
        await update($, handle, () => null)
        await update($, pulse, () => null)
        return { text: 'Disconnected from commits.sh.' }
      case 'theme': {
        if (value === 'off') {
          await $.store.set('theme', 'off')
          await $.theme.clear()
          return { text: 'commits.sh look off.' }
        }
        await $.store.set('theme', 'on')
        const set = await $.theme.set(LOOK)
        return { text: set.isDrawn ? 'commits.sh look on.' : `Saved. ${set.reason ?? 'This surface draws no themes'}; the desktop app will show it.` }
      }
      case 'band': {
        const isOn = value !== 'off'
        await $.store.set('band', isOn ? 'on' : 'off')
        await update($, isBandOn, () => isOn)
        return { text: `Band ${isOn ? 'on' : 'off'}.` }
      }
      default:
        return { text: 'Usage: /commits [connect <handle> | disconnect | theme on|off | band on|off]' }
    }
  })

  // ---- the band ------------------------------------------------------------------

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, isBandOn))) return next(e)
    const s = await read($, session)
    const rest = await read($, others)
    const at = Math.max(await read($, now), s.lastAt ?? 0)
    const pieces = bandPieces({
      sessionTokens: s.tokens,
      turnTokens: s.turns,
      sessionUsd: s.usd,
      todayTokens: rest.tokens + ctx.share.tokens,
      cacheMs: cacheLeft(s.lastAt, s.ttlMs, at),
      fiveHourPct: s.fiveHour?.pct ?? null,
      sevenDayPct: s.sevenDay?.pct ?? null,
      isWorking: e.props.isWorking,
    })
    if (!pieces) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    // One Text of runs: pills are cell backgrounds, bars solid blocks.
    const fitted = fitPieces(pieces, e.props.bodyColumns)
    return (
      <Box flexDirection="row">
        <Text mono wrap="truncate-end">
          {fitted.map((piece, i) => {
            const gap = i === 0 ? '' : piece.kind === 'pill' ? ' ' : '   '
            if (piece.kind === 'pill') {
              return <Text key={piece.key}>{gap}<Text bold color={piece.fg} backgroundColor={piece.bg}>{piece.text}</Text></Text>
            }
            if (piece.kind === 'bar') {
              const { filled, empty } = barCells(piece.pct, piece.cells)
              return (
                <Text key={piece.key}>
                  {gap}<Text color={PALETTE.dim}>{piece.label} </Text>
                  <Text color={piece.color}>{'█'.repeat(filled)}</Text><Text color={PALETTE.track}>{'█'.repeat(empty)}</Text>
                  <Text bold color={piece.color}> {Math.round(piece.pct)}%</Text>
                </Text>
              )
            }
            return <Text key={piece.key}>{gap}<Text color={PALETTE.dim}>{piece.label} </Text><Text bold>{piece.value}</Text></Text>
          })}
        </Text>
      </Box>
    )
  })

  // ---- the pane ------------------------------------------------------------------

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Link } = $.ui.resolve(e)
    const s = await read($, session)
    const rest = await read($, others)
    const p = await read($, pulse)
    const who = await read($, handle)
    const at = Math.max(await read($, now), s.lastAt ?? 0)
    const today = sumShares([rest, ctx.share])
    const hour = new Date(at || Date.now()).getHours()
    const cols = Math.max(32, Math.min(64, e.viewport?.columns ?? 56))
    const pill = (key: string, text: string, bg: string, fg: string = PALETTE.ink) => <Text key={key} bold color={fg} backgroundColor={bg}>{` ${text} `}</Text>
    const dim = (text: string) => <Text color={PALETTE.dim}>{text}</Text>
    const rule = <Text color={PALETTE.track}>{'─'.repeat(cols)}</Text>
    const bar = (key: string, pct: number, cells: number, color: string) => {
      const { filled, empty } = barCells(pct, cells)
      return <Text key={key}><Text color={color}>{'█'.repeat(filled)}</Text><Text color={PALETTE.track}>{'█'.repeat(empty)}</Text></Text>
    }
    const models = Object.entries(s.models).sort((a, b) => b[1] - a[1]).slice(0, 4)
    const top = models[0]?.[1] ?? 0
    const hitRate = s.input > 0 ? (s.cacheRead / s.input) * 100 : null
    const cache = cacheLeft(s.lastAt, s.ttlMs, at)
    const limit = (label: string, w: SessionFigures['fiveHour']) => w && (
      <Text key={label} mono>
        {dim(`${label} `)}{bar(`${label}-bar`, w.pct, 24, limitColor(w.pct))}
        <Text bold color={limitColor(w.pct)}>{` ${Math.round(w.pct)}%`}</Text>
        {resetLabel(w.resetsAt, at) ? dim(`  ${resetLabel(w.resetsAt, at)}`) : null}
      </Text>
    )

    return (
      <Box flexDirection="column">
        <Text mono>
          {pill('brand', '◆ commits.sh', PALETTE.mint, PALETTE.navy)}
          {who ? <Text> {pill('who', `@${who}`, PALETTE.blue, PALETTE.white)}</Text> : null}
        </Text>
        <Text> </Text>
        <Text mono>
          {dim('TODAY  ')}{pill('today', `${compact(today.tokens)} tok`, PALETTE.blue, PALETTE.white)}{' '}
          {pill('today-usd', dollars(today.usd), PALETTE.yellow)}{dim(`  ${today.turns} turns`)}
        </Text>
        <Text mono>
          {hourCells(today.hours, hour).map((cell, i) => (
            <Text key={`h${i}`} color={cell.isSpent ? (i === hour ? PALETTE.green : '#2fbf5f') : PALETTE.track}>{cell.isSpent ? cell.char : cell.char === '·' ? '▁' : ' '}</Text>
          ))}
        </Text>
        <Text mono>{dim('00'.padEnd(22))}{dim('23')}</Text>
        {rule}
        <Text mono>
          {dim('SESSION  ')}{pill('session', `${compact(s.tokens)} tok`, PALETTE.blue, PALETTE.white)}
          {s.usd !== null ? <Text> {pill('session-usd', dollars(s.usd), PALETTE.yellow)}</Text> : null}
          {cache !== null ? <Text> {pill('cache', cache > 0 ? `⏱ ${clockLabel(cache)}` : '⏱ cold', cache <= 0 ? PALETTE.red : cache < 60_000 ? PALETTE.orange : PALETTE.teal)}</Text> : null}
        </Text>
        {models.map(([name, tokens]) => (
          <Text key={name} mono>
            {dim(name.padEnd(12).slice(0, 12))}<Text bold>{compact(tokens).padStart(6)}</Text>{'  '}
            {bar(`${name}-bar`, top > 0 ? (tokens / top) * 100 : 0, Math.max(10, cols - 22), PALETTE.blue)}
          </Text>
        ))}
        {hitRate !== null ? <Text mono>{dim('cache hits  ')}<Text bold color={PALETTE.teal}>{`${hitRate.toFixed(1)}%`}</Text></Text> : null}
        {s.fiveHour || s.sevenDay ? rule : null}
        {limit('5H', s.fiveHour)}
        {limit('7D', s.sevenDay)}
        {rule}
        {who && p ? (
          <Text mono>
            {dim('ALL AGENTS  ')}{pill('all', `${compact(p.total)} tok`, PALETTE.mint, PALETTE.navy)}
            {p.rate !== null && p.rate > 0 ? dim(`  ${compact(p.rate)}/min`) : null}
            {p.ageSec !== null ? dim(`  ${ago(p.ageSec + Math.max(0, (at - p.at) / 1000))}`) : null}
          </Text>
        ) : null}
        {who
          ? <Link href={`https://commits.sh/${who}`}>commits.sh/{who}</Link>
          : <Text mono>{dim('connect: ')}<Text bold>/commits connect &lt;handle&gt;</Text></Text>}
      </Box>
    )
  })
}

