import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import { AnimationController } from '../animation/animationController'
import { sound } from '../audio/soundEngine'
import { DEFAULT_BOARD } from '../game/boardConfig'
import type { BoardConfig, Player } from '../game/gameTypes'
import { actions, store, useApp } from '../hooks/useGame'
import { CameraRig } from './CameraRig'
import { Confetti, ImpactBurst } from './Effects'
import { GameBoard } from './GameBoard'
import { Ladder } from './Ladder'
import { PlayerToken } from './PlayerToken'
import { SceneEnvironment } from './SceneEnvironment'
import { Snake } from './Snake'

const DEMO_PLAYERS: Player[] = [
  { id: 'd1', name: 'Ava', colorId: 'crimson', isComputer: false, position: 0 },
  { id: 'd2', name: 'Leo', colorId: 'azure', isComputer: false, position: 12 },
  { id: 'd3', name: 'Maya', colorId: 'emerald', isComputer: false, position: 45 },
  { id: 'd4', name: 'Kai', colorId: 'amber', isComputer: false, position: 77 },
]

function makeController(board: BoardConfig) {
  return new AnimationController(board, {
    sound: (name) => sound.play(name),
    stage: (stage) => actions.setStage(stage),
  })
}

/**
 * Bridges the rules engine and the animation controller: starts the presentation for the
 * current phase and reports completion back with the roll id it was started for.
 */
function TurnDirector({ controller, gameKey }: { controller: AnimationController; gameKey: number }) {
  const phase = useApp((s) => s.game?.phase)
  const rollId = useApp((s) => s.game?.rollId)
  const winnerId = useApp((s) => s.game?.winnerId)

  useEffect(() => {
    const game = store.get().game
    if (!game?.pending) return
    const { pending, rollId: id } = game
    if (game.phase === 'MOVING_CHARACTER') {
      controller.playMove(pending, () => actions.movementFinished(gameKey, id))
    } else if (game.phase === 'SNAKE_BITE' || game.phase === 'CLIMBING_LADDER') {
      controller.playJump(pending, () => actions.transitionFinished(gameKey, id))
    } else return
    return () => controller.cancel()
  }, [phase, rollId, controller, gameKey])

  useEffect(() => {
    if (phase === 'GAME_OVER' && winnerId) controller.celebrate(winnerId)
  }, [phase, winnerId, controller])

  useFrame((_, delta) => {
    const { paused, settings } = store.get()
    const scale = paused ? 0 : settings.fastAnimations ? 1.8 : 1
    controller.update(Math.min(delta, 0.05) * scale)
  })
  return null
}

function PreviewDirector({ controller }: { controller: AnimationController }) {
  useEffect(() => controller.sync(DEMO_PLAYERS), [controller])
  useFrame((_, delta) => controller.update(Math.min(delta, 0.05)))
  return null
}

function World({ preview }: { preview: boolean }) {
  const game = useApp((s) => s.game)
  const gameKey = useApp((s) => s.gameKey)
  const board = preview || !game ? DEFAULT_BOARD : game.board
  const players = preview || !game ? DEMO_PLAYERS : game.players
  const currentId = preview || !game ? null : game.players[game.currentIndex]?.id
  const controller = useMemo(() => makeController(board), [board])
  // Make sure visuals exist before the first render of the tokens.
  useMemo(() => controller.sync(players), [controller, players])
  const shakeGroup = useRef<Group>(null)

  useFrame(() => {
    const g = shakeGroup.current
    if (!g) return
    const s = controller.shake
    g.position.set((Math.random() - 0.5) * s * 0.09, (Math.random() - 0.5) * s * 0.05, (Math.random() - 0.5) * s * 0.09)
  })

  return (
    <>
      <group ref={shakeGroup}>
        <GameBoard board={board} />
        {board.snakes.map((s, i) => (
          <Snake key={`${s.head}-${s.tail}`} snake={s} index={i} visual={controller.snakes[i]} />
        ))}
        {board.ladders.map((l) => (
          <Ladder key={`${l.bottom}-${l.top}`} ladder={l} />
        ))}
        {players.map((p) => {
          const visual = controller.characters.get(p.id)
          return visual ? <PlayerToken key={p.id} player={p} visual={visual} isCurrent={p.id === currentId && game?.phase !== 'GAME_OVER'} /> : null
        })}
        <ImpactBurst controller={controller} />
        {game?.phase === 'GAME_OVER' && !preview && <Confetti />}
      </group>
      {preview ? <PreviewDirector controller={controller} /> : <TurnDirector key={gameKey} controller={controller} gameKey={gameKey} />}
      <CameraRig controller={preview ? undefined : controller} autoRotate={preview} />
    </>
  )
}

export function GameScene({ preview = false, onReady }: { preview?: boolean; onReady?: () => void }) {
  const gameKey = useApp((s) => s.gameKey)
  const [dpr] = useState<[number, number]>(() => [1, Math.min(1.75, window.devicePixelRatio || 1)])
  return (
    <Canvas
      shadows
      dpr={dpr}
      camera={{ fov: 40, near: 0.1, far: 140, position: [0, 14, 14] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={() => onReady?.()}
      aria-label={preview ? '3D preview of the game board' : 'Interactive 3D Snakes and Ladders board'}
      role="img"
    >
      <SceneEnvironment />
      <World key={preview ? 'preview' : gameKey} preview={preview} />
    </Canvas>
  )
}
