export const FINAL_SQUARE = 100
export const DIE_FACES = 6
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 4
export const MAX_NAME_LENGTH = 16

export const PLAYER_COLOR_IDS = ['crimson', 'azure', 'emerald', 'amber', 'violet', 'teal'] as const
export type PlayerColorId = (typeof PLAYER_COLOR_IDS)[number]

export interface PlayerSetup {
  name: string
  colorId: PlayerColorId
  isComputer: boolean
}

export interface Player extends PlayerSetup {
  id: string
  /** 0 = off the board (before square 1), 1..100 on the board. */
  position: number
}

export interface Snake {
  head: number
  tail: number
}

export interface Ladder {
  bottom: number
  top: number
}

/** Optional house rules, kept separate from the traditional defaults. */
export interface GameRules {
  /** A player must roll a 1 to move from the start onto square 1. */
  enterOnOne: boolean
  /** Rolling a 6 gives the same player another roll. */
  bonusOnSix: boolean
}

export const TRADITIONAL_RULES: GameRules = { enterOnOne: false, bonusOnSix: false }

export interface BoardConfig {
  snakes: readonly Snake[]
  ladders: readonly Ladder[]
}

export type JumpKind = 'snake' | 'ladder'

export interface Jump {
  kind: JumpKind
  from: number
  to: number
}

/** Everything a single roll does, decided up front by the rules engine. */
export interface TurnPlan {
  playerId: string
  roll: number
  from: number
  /** Squares visited one at a time. Empty when the roll overshoots 100. */
  steps: number[]
  /** Square reached after walking. */
  landed: number
  /** Snake or ladder resolved on the landing square (never on squares passed over). */
  jump: Jump | null
  final: number
  overshoot: boolean
  /** Still at the start because the enter-on-one rule needs a 1. */
  needsOne: boolean
  won: boolean
}

export type GamePhase =
  | 'READY'
  | 'ROLLING_DICE'
  | 'MOVING_CHARACTER'
  | 'SNAKE_BITE'
  | 'CLIMBING_LADDER'
  | 'GAME_OVER'

export type HistoryEvent = 'move' | 'snake' | 'ladder' | 'overshoot' | 'needsOne' | 'win'

export interface HistoryEntry {
  turn: number
  playerId: string
  roll: number
  from: number
  to: number
  event: HistoryEvent
}

export interface GameState {
  players: Player[]
  currentIndex: number
  phase: GamePhase
  /** Increments on every roll; animation completion signals must quote it. */
  rollId: number
  lastRoll: number | null
  pending: TurnPlan | null
  winnerId: string | null
  history: HistoryEntry[]
  board: BoardConfig
  rules: GameRules
}

/** Fine-grained presentation stages reported by the animation controller. */
export type AnimationStage =
  | 'IDLE'
  | 'MOVING_CHARACTER'
  | 'SNAKE_TURNING'
  | 'SNAKE_PREPARING_BITE'
  | 'SNAKE_STRIKING'
  | 'CHARACTER_REACTING'
  | 'SLIDING_DOWN_SNAKE'
  | 'CLIMBING_LADDER'
  | 'RESTORING_CHARACTER'
  | 'CELEBRATING'
