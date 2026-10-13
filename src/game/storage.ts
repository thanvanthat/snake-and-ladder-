import { DEFAULT_BOARD } from './boardConfig'
import { planTurn, settlePending } from './gameEngine'
import {
  DIE_FACES,
  FINAL_SQUARE,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_COLOR_IDS,
  type BoardConfig,
  type GamePhase,
  type GameState,
  type HistoryEntry,
  type HistoryEvent,
  type Player,
  type PlayerColorId,
} from './gameTypes'

const KEYS = {
  settings: 'snl3d.settings.v1',
  setup: 'snl3d.setup.v1',
  game: 'snl3d.game.v1',
} as const

export interface Settings {
  soundOn: boolean
  volume: number
  fastAnimations: boolean
  cinematicCamera: boolean
}

export const DEFAULT_SETTINGS: Settings = { soundOn: true, volume: 0.7, fastAnimations: false, cinematicCamera: true }

export type GameMode = 'local' | 'computer'

export interface SetupDraft {
  mode: GameMode
  count: number
  players: { name: string; colorId: PlayerColorId }[]
  /** House rule: roll a 1 to enter the board. */
  enterOnOne: boolean
  /** House rule: a 6 earns another roll. */
  bonusOnSix: boolean
}

export const DEFAULT_SETUP: SetupDraft = {
  mode: 'local',
  count: 2,
  enterOnOne: true,
  bonusOnSix: true,
  players: [
    { name: 'Ava', colorId: 'crimson' },
    { name: 'Leo', colorId: 'azure' },
    { name: 'Maya', colorId: 'emerald' },
    { name: 'Kai', colorId: 'amber' },
  ],
}

// ---------- low level ----------

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage blocked or full: the game keeps working, it just will not persist.
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max
const isColor = (v: unknown): v is PlayerColorId => PLAYER_COLOR_IDS.includes(v as PlayerColorId)
const isName = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= MAX_NAME_LENGTH
const PHASES: GamePhase[] = ['READY', 'ROLLING_DICE', 'MOVING_CHARACTER', 'SNAKE_BITE', 'CLIMBING_LADDER', 'GAME_OVER']
const EVENTS: HistoryEvent[] = ['move', 'snake', 'ladder', 'overshoot', 'needsOne', 'win']

// ---------- settings ----------

export function parseSettings(raw: unknown): Settings {
  if (!isRecord(raw)) return { ...DEFAULT_SETTINGS }
  return {
    soundOn: typeof raw.soundOn === 'boolean' ? raw.soundOn : DEFAULT_SETTINGS.soundOn,
    volume: typeof raw.volume === 'number' && raw.volume >= 0 && raw.volume <= 1 ? raw.volume : DEFAULT_SETTINGS.volume,
    fastAnimations: typeof raw.fastAnimations === 'boolean' ? raw.fastAnimations : DEFAULT_SETTINGS.fastAnimations,
    cinematicCamera: typeof raw.cinematicCamera === 'boolean' ? raw.cinematicCamera : DEFAULT_SETTINGS.cinematicCamera,
  }
}

export function loadSettings(): Settings {
  const raw = read(KEYS.settings)
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  // First visit with reduced motion requested: shorter animations, no camera swoops.
  if (raw === null && reduceMotion) return { ...DEFAULT_SETTINGS, fastAnimations: true, cinematicCamera: false }
  return parseSettings(raw)
}
export const saveSettings = (s: Settings): void => write(KEYS.settings, s)

// ---------- setup ----------

export function parseSetup(raw: unknown): SetupDraft {
  if (!isRecord(raw) || !Array.isArray(raw.players) || raw.players.length !== MAX_PLAYERS) return structuredClone(DEFAULT_SETUP)
  const players = raw.players.map((p, i) =>
    isRecord(p) && isName(p.name) && isColor(p.colorId) ? { name: p.name, colorId: p.colorId } : DEFAULT_SETUP.players[i],
  )
  if (new Set(players.map((p) => p.colorId)).size !== players.length) return structuredClone(DEFAULT_SETUP)
  return {
    mode: raw.mode === 'computer' ? 'computer' : 'local',
    count: isInt(raw.count, MIN_PLAYERS, MAX_PLAYERS) ? raw.count : DEFAULT_SETUP.count,
    players,
    enterOnOne: typeof raw.enterOnOne === 'boolean' ? raw.enterOnOne : DEFAULT_SETUP.enterOnOne,
    bonusOnSix: typeof raw.bonusOnSix === 'boolean' ? raw.bonusOnSix : DEFAULT_SETUP.bonusOnSix,
  }
}

export const loadSetup = (): SetupDraft => parseSetup(read(KEYS.setup))
export const saveSetup = (s: SetupDraft): void => write(KEYS.setup, s)

// ---------- game ----------

function parsePlayer(raw: unknown): Player | null {
  if (!isRecord(raw)) return null
  const { id, name, colorId, isComputer, position } = raw
  if (typeof id !== 'string' || !isName(name) || !isColor(colorId) || typeof isComputer !== 'boolean') return null
  if (!isInt(position, 0, FINAL_SQUARE)) return null
  return { id, name, colorId, isComputer, position }
}

function parseHistory(raw: unknown, ids: Set<string>): HistoryEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((h): h is HistoryEntry =>
      isRecord(h) &&
      isInt(h.turn, 1, 1e6) &&
      typeof h.playerId === 'string' && ids.has(h.playerId) &&
      isInt(h.roll, 1, DIE_FACES) &&
      isInt(h.from, 0, FINAL_SQUARE) &&
      isInt(h.to, 0, FINAL_SQUARE) &&
      EVENTS.includes(h.event as HistoryEvent),
    )
    .slice(-200)
}

/**
 * Validates untrusted saved data. Returns null if anything is inconsistent.
 * A game saved mid-turn is resolved to its post-turn checkpoint (the roll already happened),
 * so animations are never resumed half way through.
 */
export function parseGame(raw: unknown, board: BoardConfig = DEFAULT_BOARD): GameState | null {
  if (!isRecord(raw) || !Array.isArray(raw.players)) return null
  const players = raw.players.map(parsePlayer)
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS || players.some((p) => p === null)) return null
  const valid = players as Player[]
  const ids = new Set(valid.map((p) => p.id))
  if (ids.size !== valid.length) return null
  if (new Set(valid.map((p) => p.colorId)).size !== valid.length) return null

  const { currentIndex, phase, rollId, lastRoll, winnerId, pending } = raw
  if (!isInt(currentIndex, 0, valid.length - 1)) return null
  if (!PHASES.includes(phase as GamePhase)) return null
  if (!isInt(rollId, 0, Number.MAX_SAFE_INTEGER)) return null
  if (lastRoll !== null && !isInt(lastRoll, 1, DIE_FACES)) return null
  if (winnerId !== null && !(typeof winnerId === 'string' && ids.has(winnerId))) return null

  let state: GameState = {
    players: valid,
    currentIndex,
    phase: phase as GamePhase,
    rollId,
    lastRoll: lastRoll as number | null,
    pending: null,
    winnerId: winnerId as string | null,
    history: parseHistory(raw.history, ids),
    board,
    rules: {
      enterOnOne: isRecord(raw.rules) && raw.rules.enterOnOne === true,
      bonusOnSix: isRecord(raw.rules) && raw.rules.bonusOnSix === true,
    },
  }

  const animating = state.phase !== 'READY' && state.phase !== 'GAME_OVER'
  if (animating) {
    // Re-derive the plan from the rules instead of trusting the saved one.
    if (!isRecord(pending) || pending.playerId !== valid[currentIndex].id || !isInt(pending.roll, 1, DIE_FACES) || !isInt(pending.from, 0, FINAL_SQUARE)) return null
    state = { ...state, pending: planTurn(pending.playerId, pending.from, pending.roll, board, state.rules) }
    state = settlePending(state)
  }

  const atFinish = state.players.filter((p) => p.position === FINAL_SQUARE)
  if (state.phase === 'GAME_OVER') {
    if (!state.winnerId || atFinish.length !== 1 || atFinish[0].id !== state.winnerId) return null
  } else if (state.winnerId !== null || atFinish.length > 0) {
    return null
  }
  return state
}

export const loadGame = (): GameState | null => parseGame(read(KEYS.game))

export function saveGame(state: GameState): void {
  const settled = settlePending(state)
  if (settled.phase === 'GAME_OVER') return clearGame()
  const { board, ...rest } = settled
  write(KEYS.game, rest)
}

export function clearGame(): void {
  try {
    localStorage.removeItem(KEYS.game)
  } catch {
    // ignore
  }
}
