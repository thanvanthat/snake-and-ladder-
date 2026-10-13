import { useSyncExternalStore } from 'react'
import { sound } from '../audio/soundEngine'
import { DEFAULT_BOARD } from '../game/boardConfig'
import { rollDie } from '../game/dice'
import { canRoll, createGame, diceSettled, movementFinished, rollDice, transitionFinished } from '../game/gameEngine'
import { FINAL_SQUARE, type AnimationStage, type GameState, type PlayerSetup, type TurnPlan } from '../game/gameTypes'
import {
  loadGame,
  loadSettings,
  loadSetup,
  saveGame,
  saveSettings,
  saveSetup,
  type Settings,
  type SetupDraft,
} from '../game/storage'

export type Screen = 'home' | 'setup' | 'game'

export interface Toast {
  id: number
  tone: 'snake' | 'ladder' | 'info' | 'win'
  text: string
}

export interface AppState {
  screen: Screen
  settings: Settings
  setup: SetupDraft
  game: GameState | null
  /** Changes on every new game; stale animation callbacks from an older game are ignored. */
  gameKey: number
  paused: boolean
  stage: AnimationStage
  toast: Toast | null
  cameraResetId: number
  savedGame: GameState | null
}

function initialState(): AppState {
  const settings = loadSettings()
  sound.configure(settings.soundOn, settings.volume)
  return {
    screen: 'home',
    settings,
    setup: loadSetup(),
    game: null,
    gameKey: 0,
    paused: false,
    stage: 'IDLE',
    toast: null,
    cameraResetId: 0,
    savedGame: loadGame(),
  }
}

let state: AppState = initialState()
const listeners = new Set<() => void>()
let toastId = 0

export const store = {
  get: (): AppState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

function set(patch: Partial<AppState>): void {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

/** Selector must return existing references or primitives. */
export function useApp<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(state))
}

function setGame(game: GameState, extra: Partial<AppState> = {}): void {
  saveGame(game)
  set({ game, ...extra })
}

function toast(tone: Toast['tone'], text: string): Partial<AppState> {
  return { toast: { id: ++toastId, tone, text } }
}

/** Message for a turn that just completed (plain moves are silent). */
function announce(plan: TurnPlan, game: GameState): Partial<AppState> {
  const name = game.players.find((p) => p.id === plan.playerId)?.name ?? 'Player'
  if (plan.won) return toast('win', `${name} reached square ${FINAL_SQUARE} and wins!`)
  const again = game.rules.bonusOnSix && plan.roll === 6 ? ' Rolled a 6, so roll again!' : ''
  if (plan.needsOne) return toast('info', `${name} needs a 1 to enter the board.${again}`)
  if (plan.overshoot) return toast('info', `${name} needs exactly ${FINAL_SQUARE - plan.from} to finish.${again}`)
  if (plan.jump?.kind === 'snake') return toast('snake', `${name} was bitten by a snake! Back to square ${plan.final}.${again}`)
  if (plan.jump?.kind === 'ladder') return toast('ladder', `${name} climbed a ladder! Up to square ${plan.final}.${again}`)
  if (again) return toast('info', `${name} rolled a 6 and rolls again!`)
  return {}
}

function freshGame(game: GameState): Partial<AppState> {
  return { screen: 'game', game, gameKey: state.gameKey + 1, paused: false, stage: 'IDLE', toast: null }
}

export const actions = {
  goHome(): void {
    set({ screen: 'home', paused: false, savedGame: loadGame() })
  },

  goSetup(): void {
    set({ screen: 'setup' })
  },

  startGame(setups: PlayerSetup[], draft: SetupDraft): void {
    saveSetup(draft)
    const game = createGame(setups, DEFAULT_BOARD, { enterOnOne: draft.enterOnOne, bonusOnSix: draft.bonusOnSix })
    saveGame(game)
    set({ ...freshGame(game), setup: draft })
  },

  continueGame(): void {
    const game = loadGame()
    if (game) set(freshGame(game))
  },

  restartGame(): void {
    if (!state.game) return
    const setups = state.game.players.map(({ name, colorId, isComputer }) => ({ name, colorId, isComputer }))
    const game = createGame(setups, state.game.board, state.game.rules)
    saveGame(game)
    set(freshGame(game))
  },

  roll(): void {
    const game = state.game
    if (!game || state.paused || !canRoll(game)) return
    sound.play('dice')
    setGame(rollDice(game, rollDie()))
  },

  diceSettled(key: number, rollId: number): void {
    if (key !== state.gameKey || !state.game) return
    const next = diceSettled(state.game, rollId)
    if (next !== state.game) setGame(next)
  },

  movementFinished(key: number, rollId: number): void {
    const prev = state.game
    if (key !== state.gameKey || !prev?.pending) return
    const plan = prev.pending
    const next = movementFinished(prev, rollId)
    if (next === prev) return
    setGame(next, next.pending ? {} : announce(plan, next))
  },

  transitionFinished(key: number, rollId: number): void {
    const prev = state.game
    if (key !== state.gameKey || !prev?.pending) return
    const plan = prev.pending
    const next = transitionFinished(prev, rollId)
    if (next === prev) return
    setGame(next, announce(plan, next))
  },

  setStage(stage: AnimationStage): void {
    if (stage !== state.stage) set({ stage })
  },

  togglePause(): void {
    if (!state.game || state.game.phase === 'GAME_OVER') return
    set({ paused: !state.paused })
  },

  resetCamera(): void {
    set({ cameraResetId: state.cameraResetId + 1 })
  },

  updateSettings(patch: Partial<Settings>): void {
    const settings = { ...state.settings, ...patch }
    saveSettings(settings)
    sound.configure(settings.soundOn, settings.volume)
    set({ settings })
  },

  dismissToast(id: number): void {
    if (state.toast?.id === id) set({ toast: null })
  },
}

/** Test helper: reset the singleton store. */
export function __resetStore(): void {
  state = initialState()
  listeners.forEach((l) => l())
}
