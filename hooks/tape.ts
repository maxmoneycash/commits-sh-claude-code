// Pure helpers for the commits.sh mod: number formats, the turn tape, the
// band's layout at a width, the cache countdown and the day ledger. No `$`,
// so tests run them directly.

export type Usage = {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}

/** Every token the request counted, the way commits.sh counts them everywhere. */
export function tokensOf(usage: Usage): number {
  const n = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0)
  return n(usage.input_tokens) + n(usage.output_tokens) + n(usage.cache_read_input_tokens) + n(usage.cache_creation_input_tokens)
}

/** 950, 12.4K, 38.2M, 1.24B, 211.8B: three significant figures, no unit. */
export function compact(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0'
  const units: Array<[number, string]> = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']]
  for (const [size, unit] of units) {
    if (value >= size) {
      const scaled = value / size
      const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2
      return `${scaled.toFixed(digits).replace(/\.0+$|(\.\d*?)0+$/, '$1')}${unit}`
    }
  }
  return String(Math.round(value))
}

/** $0.42, $14.10, $187, $1.2K. */
export function dollars(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '$0'
  if (value >= 1000) return `$${compact(value)}`
  if (value >= 100) return `$${Math.round(value)}`
  return `$${value.toFixed(2)}`
}

const BARS = '▁▂▃▄▅▆▇█'

/** One block character per value, scaled to the largest; a zero is the lowest bar. */
export function tape(values: readonly number[]): string {
  const max = Math.max(0, ...values)
  if (max <= 0) return values.map(() => BARS[0]).join('')
  return values.map((value) => BARS[Math.min(BARS.length - 1, Math.round((Math.max(0, value) / max) * (BARS.length - 1)))]).join('')
}

/** Today's 24 hours as cells: a bar for an hour that spent tokens, a dot for
 * a past hour that spent none, a space for the hours still ahead. */
export function hourCells(hours: readonly number[], nowHour: number): Array<{ char: string; isSpent: boolean }> {
  const bars = tape(hours.map((value) => Math.max(0, value)))
  return hours.map((value, hour) => (value > 0
    ? { char: [...bars][hour] ?? BARS[0]!, isSpent: true }
    : { char: hour <= nowHour ? '·' : ' ', isSpent: false }))
}

/** `3:41`, `0:09`, or null once the cache has lapsed. */
export function cacheLeft(lastAt: number | null, ttlMs: number | null, now: number): number | null {
  if (lastAt === null || ttlMs === null) return null
  const left = lastAt + ttlMs - now
  return left > 0 ? left : 0
}

export function clockLabel(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}h`
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

// ---- the band: powerline pills, solid bars ------------------------------------
// Max's pick (Nov 26, direction B): filled pills in his statusline's palette,
// then solid 5H / 7D bars, then today. Every color is a raw hex the terminal
// draws in truecolor; the desktop app paints the same spans.

export const PALETTE = {
  mint: '#7df9aa', navy: '#1c3a5e', blue: '#3b76f0', white: '#f4f4f5', yellow: '#fcf392', teal: '#8dfbd2',
  ink: '#09090b', green: '#50fa7b', orange: '#ffa500', red: '#ff4646', track: '#2e2e33', dim: '#8b8b94',
} as const

export type Pill = { kind: 'pill'; key: string; text: string; fg: string; bg: string; drop: number }
export type BarPiece = { kind: 'bar'; key: string; label: string; pct: number; color: string; cells: number; drop: number }
export type Plain = { kind: 'plain'; key: string; label: string; value: string; drop: number }
export type Piece = Pill | BarPiece | Plain

export type BandFigures = {
  sessionTokens: number
  turnTokens: readonly number[]
  sessionUsd: number | null
  todayTokens: number | null
  cacheMs: number | null
  fiveHourPct: number | null
  sevenDayPct: number | null
  isWorking: boolean
}

export const TAPE_TURNS = 16
const GAP = 1
const BAR_GAP = 3
export const BAR_CELLS = 16

/** A limit's color: green, orange past half, red past 80%. */
export function limitColor(pct: number): string {
  return pct >= 80 ? PALETTE.red : pct >= 50 ? PALETTE.orange : PALETTE.green
}

/** The band's pieces in reading order; null before the first turn. `drop`
 * is the order narrow columns give them up (lowest first); the brand and
 * the session never go. */
export function bandPieces(f: BandFigures): Piece[] | null {
  if (f.sessionTokens <= 0 && f.turnTokens.length === 0) return null
  const out: Piece[] = [
    { kind: 'pill', key: 'brand', text: ' ◆ commits.sh ', fg: PALETTE.navy, bg: PALETTE.mint, drop: 99 },
    { kind: 'pill', key: 'session', text: ` ${compact(f.sessionTokens)} tok `, fg: PALETTE.white, bg: PALETTE.blue, drop: 98 },
  ]
  if (f.sessionUsd !== null) out.push({ kind: 'pill', key: 'usd', text: ` ${dollars(f.sessionUsd)} `, fg: PALETTE.ink, bg: PALETTE.yellow, drop: 5 })
  if (f.cacheMs !== null && !f.isWorking) {
    const cold = f.cacheMs <= 0
    const late = !cold && f.cacheMs < 60_000
    out.push({
      kind: 'pill', key: 'cache', text: cold ? ' ⏱ cold ' : ` ⏱ ${clockLabel(f.cacheMs)} `,
      fg: PALETTE.ink, bg: cold ? PALETTE.red : late ? PALETTE.orange : PALETTE.teal, drop: 4,
    })
  }
  if (f.fiveHourPct !== null) out.push({ kind: 'bar', key: 'five', label: '5H', pct: f.fiveHourPct, color: limitColor(f.fiveHourPct), cells: BAR_CELLS, drop: 3 })
  if (f.sevenDayPct !== null) out.push({ kind: 'bar', key: 'seven', label: '7D', pct: f.sevenDayPct, color: limitColor(f.sevenDayPct), cells: BAR_CELLS, drop: 2 })
  if (f.todayTokens !== null && f.todayTokens > f.sessionTokens) out.push({ kind: 'plain', key: 'today', label: 'today', value: compact(f.todayTokens), drop: 1 })
  return out
}

/** Cells a piece takes, with the gap before it. */
export function pieceWidth(p: Piece, isFirst: boolean): number {
  const body = p.kind === 'pill' ? [...p.text].length
    : p.kind === 'bar' ? p.label.length + 1 + p.cells + 1 + `${Math.round(p.pct)}%`.length
    : p.label.length + 1 + [...p.value].length
  return body + (isFirst ? 0 : p.kind === 'pill' ? GAP : BAR_GAP)
}

/** The pieces that fit `columns`, giving up the lowest `drop` first. */
export function fitPieces(pieces: readonly Piece[], columns: number): Piece[] {
  const kept = [...pieces]
  const total = () => kept.reduce((sum, p, i) => sum + pieceWidth(p, i === 0), 0)
  while (kept.length > 2 && total() > columns) {
    let at = 0
    for (let i = 1; i < kept.length; i++) if (kept[i]!.drop < kept[at]!.drop) at = i
    kept.splice(at, 1)
  }
  return kept
}

/** A solid bar: filled cells and track cells. */
export function barCells(pct: number, cells: number): { filled: number; empty: number } {
  const filled = Math.max(0, Math.min(cells, Math.round((Math.max(0, pct) / 100) * cells)))
  return { filled, empty: cells - filled }
}

// ---- the day ledger ----------------------------------------------------------

/** One session's share of a day, as stored under `day:<date>:<session>`. */
export type DayShare = { tokens: number; usd: number; turns: number; hours: number[] }

export const emptyShare = (): DayShare => ({ tokens: 0, usd: 0, turns: 0, hours: Array(24).fill(0) })

/** `2026-11-26` in the machine's local time. */
export function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function readShare(value: unknown): DayShare | null {
  const v = value as DayShare | null
  if (!v || typeof v !== 'object') return null
  const ok = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0
  if (!ok(v.tokens) || !ok(v.usd) || !ok(v.turns) || !Array.isArray(v.hours) || v.hours.length !== 24 || !v.hours.every(ok)) return null
  return v
}

export function sumShares(shares: readonly DayShare[]): DayShare {
  const out = emptyShare()
  for (const share of shares) {
    out.tokens += share.tokens
    out.usd += share.usd
    out.turns += share.turns
    share.hours.forEach((value, hour) => { out.hours[hour] = (out.hours[hour] ?? 0) + value })
  }
  return out
}

/** Store keys of days older than `keepDays` (the ledger prunes itself). */
export function staleDayKeys(keys: readonly string[], today: string, keepDays = 8): string[] {
  const cutoff = Date.parse(`${today}T00:00:00Z`) - keepDays * 86_400_000
  return keys.filter((key) => {
    const m = /^day:(\d{4}-\d{2}-\d{2}):/.exec(key)
    return m !== null && Date.parse(`${m[1]}T00:00:00Z`) < cutoff
  })
}

// ---- commits.sh ---------------------------------------------------------------

export type Pulse = { total: number; rate: number | null; ageSec: number | null; at: number }

/** commits.sh's pulse for a handle, or null when it is not connected or unreadable. */
export function readPulse(text: string, at: number): Pulse | null {
  try {
    const body = JSON.parse(text) as { connected?: boolean; total?: number; rate?: number | null; ageSec?: number | null }
    if (body.connected !== true || typeof body.total !== 'number' || !Number.isFinite(body.total)) return null
    return {
      total: body.total,
      rate: typeof body.rate === 'number' && Number.isFinite(body.rate) ? body.rate : null,
      ageSec: typeof body.ageSec === 'number' && Number.isFinite(body.ageSec) ? body.ageSec : null,
      at,
    }
  } catch {
    return null
  }
}

export const HANDLE = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i

/** `2m ago`, `just now`. */
export function ago(seconds: number): string {
  if (seconds < 45) return 'just now'
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`
  return `${Math.round(seconds / 86_400)}d ago`
}

/** `2h 14m`, `Fri 09:00` for a reset more than a day out. */
export function resetLabel(iso: string | undefined, now: number): string | null {
  const at = Date.parse(iso ?? '')
  if (!Number.isFinite(at)) return null
  const ms = at - now
  if (ms <= 0) return 'now'
  if (ms < 86_400_000) {
    const minutes = Math.round(ms / 60_000)
    return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`
  }
  const d = new Date(at)
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
  return `${day} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** A bar of `cells` block characters filled to `fraction` (eighths at the edge). */
export function meter(fraction: number, cells: number): string {
  const f = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0))
  const eighths = Math.round(f * cells * 8)
  const full = Math.floor(eighths / 8)
  const part = eighths % 8
  return '█'.repeat(full) + (part ? '▏▎▍▌▋▊▉'[part - 1] : '') + ' '.repeat(Math.max(0, cells - full - (part ? 1 : 0)))
}

/** A short model name: `claude-opus-5-5` → `opus-5-5`. */
export function modelName(model: string): string {
  return model.replace(/^claude-/, '').replace(/-\d{8}$/, '')
}
