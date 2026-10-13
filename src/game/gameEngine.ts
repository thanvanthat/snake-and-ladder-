import { DEFAULT_BOARD, findJump } from './boardConfig'
import {
  DIE_FACES,
  FINAL_SQUARE,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  TRADITIONAL_RULES,
  type BoardConfig,
  type GameRules,
  type GameState,
  type HistoryEvent,
  type Player,
  type PlayerSetup,
  type TurnPlan,
} from './gameTypes'

/**
 * Pure rules engine. No React, no rendering, no timers.
 *
 * Turn lifecycle (each step is an explicit signal; anything out of order is ignored):
 *   READY --rollDice--> ROLLING_DICE --diceSettled--> MOVING_CHARACTER
 *     --movementFinished--> (SNAKE_BITE | CLIMBING_LADDER --transitionFinished-->) READY | GAME_OVER
 */

export function createGame(setups: PlayerSetup[], board: BoardConfig = DEFAULT_BOARD, rules: GameRules = TRADITIONAL_RULES): GameState {
  if (setups.length < MIN_PLAYERS || setups.length > MAX_PLAYERS) {
    throw new RangeError(`A game needs ${MIN_PLAYERS}-${MAX_PLAYERS} players`)
  }
  const players: Player[] = setups.map((s, i) => ({
    id: `p${i + 1}`,
    name: s.name.trim().slice(0, MAX_NAME_LENGTH) || `Player ${i + 1}`,
    colorId: s.colorId,
    isComputer: s.isComputer,
    position: 0,
  }))
  return {
    players,
    currentIndex: 0,
    phase: 'READY',
    rollId: 0,
    lastRoll: null,
    pending: null,
    winnerId: null,
    history: [],
    board,
    rules,
  }
}

export function planTurn(playerId: string, from: number, roll: number, board: BoardConfig, rules: GameRules = TRADITIONAL_RULES): TurnPlan {
  if (!Number.isInteger(roll) || roll < 1 || roll > DIE_FACES) throw new RangeError(`Invalid roll ${roll}`)
  if (rules.enterOnOne && from === 0 && roll !== 1) {
    // House rule: only a 1 lets a player onto the board.
    return { playerId, roll, from, steps: [], landed: from, jump: null, final: from, overshoot: false, needsOne: true, won: false }
  }
  const target = from + roll
  if (target > FINAL_SQUARE) {
    // Exact roll required: the player stays where they are.
    return { playerId, roll, from, steps: [], landed: from, jump: null, final: from, overshoot: true, needsOne: false, won: false }
  }
  const steps = Array.from({ length: roll }, (_, i) => from + i + 1)
  // Only the landing square matters; squares passed over never trigger anything.
  const jump = findJump(board, target)
  const final = jump ? jump.to : target
  return { playerId, roll, from, steps, landed: target, jump, final, overshoot: false, needsOne: false, won: final === FINAL_SQUARE }
}

export const currentPlayer = (s: GameState): Player => s.players[s.currentIndex]

export const canRoll = (s: GameState): boolean => s.phase === 'READY' && s.winnerId === null

export function rollDice(s: GameState, value: number): GameState {
  if (!canRoll(s)) return s
  const player = currentPlayer(s)
  const pending = planTurn(player.id, player.position, value, s.board, s.rules)
  return { ...s, phase: 'ROLLING_DICE', rollId: s.rollId + 1, lastRoll: value, pending }
}

export function diceSettled(s: GameState, rollId: number): GameState {
  if (s.phase !== 'ROLLING_DICE' || rollId !== s.rollId || !s.pending) return s
  return { ...s, phase: 'MOVING_CHARACTER' }
}

export function movementFinished(s: GameState, rollId: number): GameState {
  if (s.phase !== 'MOVING_CHARACTER' || rollId !== s.rollId || !s.pending) return s
  const plan = s.pending
  const next = { ...s, players: withPosition(s.players, plan.playerId, plan.landed) }
  if (plan.jump) return { ...next, phase: plan.jump.kind === 'snake' ? 'SNAKE_BITE' : 'CLIMBING_LADDER' }
  return completeTurn(next, plan)
}

export function transitionFinished(s: GameState, rollId: number): GameState {
  if ((s.phase !== 'SNAKE_BITE' && s.phase !== 'CLIMBING_LADDER') || rollId !== s.rollId || !s.pending) return s
  const plan = s.pending
  return completeTurn({ ...s, players: withPosition(s.players, plan.playerId, plan.final) }, plan)
}

/** Resolve an in-flight turn instantly (used to recover a valid checkpoint). */
export function settlePending(s: GameState): GameState {
  let state = s
  for (let guard = 0; state.pending && guard < 4; guard++) {
    if (state.phase === 'ROLLING_DICE') state = diceSettled(state, state.rollId)
    else if (state.phase === 'MOVING_CHARACTER') state = movementFinished(state, state.rollId)
    else if (state.phase === 'SNAKE_BITE' || state.phase === 'CLIMBING_LADDER') state = transitionFinished(state, state.rollId)
    else state = { ...state, pending: null }
  }
  return state
}

function completeTurn(s: GameState, plan: TurnPlan): GameState {
  const event: HistoryEvent = plan.won ? 'win' : plan.needsOne ? 'needsOne' : plan.overshoot ? 'overshoot' : (plan.jump?.kind ?? 'move')
  const history = [
    ...s.history,
    { turn: s.history.length + 1, playerId: plan.playerId, roll: plan.roll, from: plan.from, to: plan.final, event },
  ]
  if (plan.won) return { ...s, phase: 'GAME_OVER', winnerId: plan.playerId, pending: null, history }
  // House rule: a 6 earns another roll for the same player.
  const next = s.rules.bonusOnSix && plan.roll === 6 ? s.currentIndex : (s.currentIndex + 1) % s.players.length
  return { ...s, phase: 'READY', pending: null, history, currentIndex: next }
}

function withPosition(players: Player[], id: string, position: number): Player[] {
  return players.map((p) => (p.id === id ? { ...p, position } : p))
}
