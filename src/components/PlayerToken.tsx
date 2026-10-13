import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group, Mesh } from 'three'
import type { CharacterVisual } from '../animation/animationController'
import type { Player } from '../game/gameTypes'
import { APPEARANCES } from '../game/players'
import { HumanCharacter } from './HumanCharacter'

const GROUNDED = new Set(['idle', 'walk', 'hit', 'celebrate'])

/** Places a character at its visual position each frame; never computes positions itself. */
export function PlayerToken({ player, visual, isCurrent }: { player: Player; visual: CharacterVisual; isCurrent: boolean }) {
  const root = useRef<Group>(null)
  const marker = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const tag = useRef<HTMLDivElement>(null)
  const appearance = APPEARANCES[player.colorId]

  useFrame(({ clock }) => {
    if (!root.current) return
    root.current.position.copy(visual.position)
    root.current.rotation.y = visual.yaw
    if (ring.current) ring.current.visible = GROUNDED.has(visual.pose)
    if (marker.current) {
      marker.current.visible = isCurrent && !visual.busy
      if (tag.current) tag.current.style.display = marker.current.visible ? '' : 'none'
      marker.current.position.y = 0.97 + Math.sin(clock.elapsedTime * 3.2) * 0.04
      marker.current.rotation.y = clock.elapsedTime * 1.6 - visual.yaw
    }
  })

  return (
    <group ref={root}>
      <HumanCharacter appearance={appearance} source={visual} scale={0.95} />
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.006}>
        <ringGeometry args={[0.15, 0.2, 36]} />
        <meshBasicMaterial color={appearance.accent} transparent opacity={isCurrent ? 0.95 : 0.5} depthWrite={false} />
      </mesh>
      <group ref={marker}>
        <mesh rotation-x={Math.PI}>
          <coneGeometry args={[0.065, 0.13, 4]} />
          <meshStandardMaterial color={appearance.accent} emissive={appearance.accent} emissiveIntensity={0.45} />
        </mesh>
        {isCurrent && (
          <Html position={[0, 0.16, 0]} center distanceFactor={9} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <div ref={tag} className="whitespace-nowrap rounded-full bg-black/70 px-2.5 py-0.5 text-[13px] font-bold text-white shadow" style={{ borderBottom: `3px solid ${appearance.accent}` }}>
              {player.name}
            </div>
          </Html>
        )}
      </group>
    </group>
  )
}
