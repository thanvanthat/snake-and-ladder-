import { useMemo } from 'react'
import { ladderPath } from '../animation/paths'
import { BOARD_TOP_Y } from '../game/boardCoordinates'
import type { Ladder as LadderConfig } from '../game/gameTypes'
import { woodTexture } from './textures'

const HALF_WIDTH = 0.16
const RUNG_SPACING = 0.2

/** Two rails + evenly spaced rungs, resting on its bottom square and on posts at the top. */
export function Ladder({ ladder }: { ladder: LadderConfig }) {
  const p = ladderPath(ladder)
  const wood = useMemo(() => woodTexture('#c08a52', '#6b4423'), [])
  const rungs = Math.max(2, Math.floor(p.length / RUNG_SPACING))
  const sideX = Math.cos(p.yaw)
  const sideZ = -Math.sin(p.yaw)

  return (
    <group>
      <group position={p.foot} rotation={[-p.pitch, p.yaw, 0, 'YXZ']}>
        {[1, -1].map((s) => (
          <mesh key={s} position={[HALF_WIDTH * s, 0.035, p.length / 2]} castShadow receiveShadow>
            <boxGeometry args={[0.045, 0.05, p.length + 0.1]} />
            <meshStandardMaterial map={wood} color="#d9a066" roughness={0.55} />
          </mesh>
        ))}
        {Array.from({ length: rungs }, (_, i) => (
          <mesh key={i} position={[0, 0.022, ((i + 0.5) * p.length) / rungs]} rotation-z={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.018, 0.018, HALF_WIDTH * 2 + 0.02, 8]} />
            <meshStandardMaterial color="#e8c48a" roughness={0.5} />
          </mesh>
        ))}
      </group>
      {/* Posts holding up the top end */}
      {[1, -1].map((s) => (
        <mesh
          key={s}
          position={[p.topEnd.x + sideX * HALF_WIDTH * s, BOARD_TOP_Y + p.height / 2, p.topEnd.z + sideZ * HALF_WIDTH * s]}
          castShadow
        >
          <cylinderGeometry args={[0.028, 0.034, p.height, 8]} />
          <meshStandardMaterial map={wood} color="#9a6a3c" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}
