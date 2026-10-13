import { Canvas, useFrame } from '@react-three/fiber'
import { Home, RotateCcw, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { PoseSource } from './HumanCharacter'
import { HumanCharacter } from './HumanCharacter'
import type { GameState } from '../game/gameTypes'
import { APPEARANCES } from '../game/players'
import { Modal } from './Modal'
import { Avatar } from './PlayerCard'

function Celebrator({ source }: { source: PoseSource }) {
  useFrame((_, delta) => {
    source.poseTime += Math.min(delta, 0.05)
  })
  return null
}

/** The winning character, celebrating in its own small 3D view. */
function WinnerFigure({ colorId }: { colorId: GameState['players'][number]['colorId'] }) {
  const source = useMemo<PoseSource>(() => ({ pose: 'celebrate', poseTime: 0, lean: 0 }), [])
  return (
    <Canvas camera={{ position: [0, 0.45, 1.5], fov: 34 }} dpr={[1, 2]} gl={{ alpha: true }} aria-hidden>
      <ambientLight intensity={0.9} />
      <directionalLight position={[1, 2, 2]} intensity={2.2} />
      <group position={[0, -0.32, 0]}>
        <HumanCharacter appearance={APPEARANCES[colorId]} source={source} scale={0.9} />
      </group>
      <Celebrator source={source} />
    </Canvas>
  )
}

export function WinnerModal({ game, onPlayAgain, onHome }: { game: GameState; onPlayAgain: () => void; onHome: () => void }) {
  const winner = game.players.find((p) => p.id === game.winnerId)
  const [show, setShow] = useState(false)

  // Let the in-scene celebration play for a moment before the modal appears.
  useEffect(() => {
    if (!winner) {
      setShow(false)
      return
    }
    const t = window.setTimeout(() => setShow(true), 1600)
    return () => window.clearTimeout(t)
  }, [winner])

  if (!winner) return null
  const standings = [...game.players].sort((a, b) => b.position - a.position)

  return (
    <Modal open={show} title="We have a winner!">
      <div className="flex flex-col items-center text-center">
        <div className="h-44 w-44">
          <WinnerFigure colorId={winner.colorId} />
        </div>
        <p className="flex items-center gap-2 font-display text-3xl font-extrabold" style={{ color: APPEARANCES[winner.colorId].accent }}>
          <Trophy className="text-amber-300" /> {winner.name} wins!
        </p>
        <p className="mt-1 text-sm text-white/60">Reached square 100 in {game.history.filter((h) => h.playerId === winner.id).length} turns.</p>
      </div>
      <ol className="mt-5 space-y-2" aria-label="Final positions">
        {standings.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
            <span className="w-5 text-center font-bold text-white/50">{i + 1}</span>
            <Avatar player={p} size={30} />
            <span className="flex-1 truncate text-left font-semibold">{p.name}</span>
            <span className="text-sm text-white/60">{p.position === 0 ? 'Start' : `Square ${p.position}`}</span>
          </li>
        ))}
      </ol>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button className="btn-secondary" onClick={onHome}>
          <Home size={18} /> Home
        </button>
        <button className="btn-primary" onClick={onPlayAgain} autoFocus>
          <RotateCcw size={18} /> Play Again
        </button>
      </div>
    </Modal>
  )
}
