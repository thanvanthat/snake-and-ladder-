import { canRoll, currentPlayer } from './gameEngine'
import type { GameState } from './gameTypes'

/** Pause before the computer rolls, so humans can follow what is happening. */
export const AI_THINK_MS = 950

/**
 * The computer has no decisions to make in Snakes & Ladders: it rolls the same fair die
 * through the same engine path as a human, only when it is genuinely its turn.
 */
export function shouldComputerRoll(state: GameState, paused: boolean): boolean {
  return !paused && canRoll(state) && currentPlayer(state).isComputer
}
