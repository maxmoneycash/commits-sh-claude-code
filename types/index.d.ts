export type ModelSplit = Record<string, number>

export type SessionFigures = {
  /** Tokens of every request this session, main thread and agents. */
  tokens: number
  /** Tokens per main-thread turn, oldest first (the tape). */
  turns: number[]
  /** Tokens by model. */
  models: ModelSplit
  /** Cache reads and all input, for the hit rate. */
  cacheRead: number
  input: number
  /** When the last request went out, and how long its cache holds. */
  lastAt: number | null
  ttlMs: number | null
  /** The engine's estimate (session.measure). */
  usd: number | null
  fiveHour: { pct: number; resetsAt?: string } | null
  sevenDay: { pct: number; resetsAt?: string } | null
  isWorking: boolean
}

export type TodayFigures = { tokens: number; usd: number; turns: number; hours: number[] }

export type PulseFigures = { total: number; rate: number | null; ageSec: number | null; at: number }

declare module 'claude-code' {
  interface PluginState {
    'commits-sh': {
      session: Shaped<SessionFigures>
      /** Every other session's share of today (this one's is added live). */
      others: Shaped<TodayFigures>
      pulse: Shaped<PulseFigures | null>
      handle: string | null
      isBandOn: boolean
      /** Redrawn by the cache clock. */
      now: number
    }
  }
}
