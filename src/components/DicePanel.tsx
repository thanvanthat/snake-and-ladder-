import { Dices } from 'lucide-react'
import { lazy, Suspense, useCallback } from 'react'
import { canRoll, currentPlayer } from '../game/gameEngine'
import type { AnimationStage, GameState } from '../game/gameTypes'
import { actions, useApp } from '../hooks/useGame'

const Dice3D = lazy(() => import('./Dice3D').then((m) => ({ default: m.Dice3D })))

const STAGE_TEXT: Partial<Record<AnimationStage, string>> = {
  MOVING_CHARACTER: 'Walking',
  SNAKE_TURNING: 'A snake notices you…',
  SNAKE_PREPARING_BITE: 'The snake rears back…',
  SNAKE_STRIKING: 'Snake strike!',
  CHARACTER_REACTING: 'Bitten!',
  SLIDING_DOWN_SNAKE: 'Sliding down the snake…',
  CLIMBING_LADDER: 'Climbing the ladder…',
  RESTORING_CHARACTER: 'Landing…',
  CELEBRATING: 'Victory!',
}

function statusText(game: GameState, stage: AnimationStage, paused: boolean): string {
  const player = currentPlayer(game)
  if (game.phase === 'GAME_OVER') {
    const winner = game.players.find((p) => p.id === game.winnerId)
    return `${winner?.name ?? 'Someone'} wins!`
  }
  if (paused) return 'Game paused'
  if (game.phase === 'READY') {
    const verb = game.rules.enterOnOne && player.position === 0 ? 'roll a 1 to enter the board' : 'roll the die'
    return player.isComputer ? `${player.name} is about to roll…` : `${player.name}, ${verb}!`
  }
  if (game.phase === 'ROLLING_DICE') return `${player.name} is rolling…`
  const stageText = STAGE_TEXT[stage]
  if (game.pending?.needsOne) return `Rolled ${game.lastRoll}: needs a 1 to enter`
  if (game.pending?.overshoot) return `Rolled ${game.lastRoll}: too high, needs an exact roll`
  if (stage === 'MOVING_CHARACTER') return `Rolled ${game.lastRoll}: moving ${game.lastRoll} square${game.lastRoll === 1 ? '' : 's'}`
  return stageText ?? `Rolled ${game.lastRoll}`
}

export function DicePanel({ game }: { game: GameState }) {
  const paused = useApp((s) => s.paused)
  const stage = useApp((s) => s.stage)
  const gameKey = useApp((s) => s.gameKey)
  const player = currentPlayer(game)
  const humanTurn = canRoll(game) && !player.isComputer && !paused
  const onSettled = useCallback((rollId: number) => actions.diceSettled(gameKey, rollId), [gameKey])

  return (
    <div className="panel flex items-center gap-3 p-3">
      <div className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28">
        <Suspense fallback={null}>
          <Dice3D value={game.lastRoll} rollId={game.rollId} rolling={game.phase === 'ROLLING_DICE'} onSettled={onSettled} />
        </Suspense>
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-2 min-h-[2.5rem] text-sm font-medium text-white/80" aria-live="polite">
          {statusText(game, stage, paused)}
        </p>
        <button className="btn-primary w-full" onClick={actions.roll} disabled={!humanTurn} aria-keyshortcuts="Space">
          <Dices size={18} /> Roll Dice
        </button>
        {game.lastRoll !== null && game.phase !== 'ROLLING_DICE' && (
          <p className="sr-only">Last roll: {game.lastRoll}</p>
        )}
      </div>
    </div>
  )
}
