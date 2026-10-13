import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { MeshStandardMaterial, SphereGeometry, TubeGeometry, Vector3, type Group, type Mesh } from 'three'
import type { SnakeVisual } from '../animation/animationController'
import { neckPoint, SNAKE_RADIUS, snakePath, type SnakePath } from '../animation/paths'
import type { Snake as SnakeConfig } from '../game/gameTypes'
import { SNAKE_SCHEMES, snakeSkinTexture } from './textures'

const NECK_SEGMENTS = 10
const neckSphere = new SphereGeometry(1, 14, 10)
const headSphere = new SphereGeometry(0.1, 22, 16)
const smallSphere = new SphereGeometry(1, 10, 8)

function taper(u: number): number {
  if (u < 0.08) return 0.85 + 0.15 * (u / 0.08)
  if (u > 0.5) return Math.max(0.07, 1 - ((u - 0.5) / 0.5) ** 1.3 * 0.93)
  return 1
}

/** Tube along the shared curve, tapered towards the tail, with UVs scaled by length. */
function buildBody(path: SnakePath): TubeGeometry {
  const segments = Math.ceil(path.length * 26)
  const radial = 12
  const geo = new TubeGeometry(path.curve, segments, SNAKE_RADIUS, radial, false)
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  const center = new Vector3()
  const v = new Vector3()
  for (let i = 0; i <= segments; i++) {
    const u = i / segments
    path.curve.getPointAt(u, center)
    const s = taper(u)
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j
      v.fromBufferAttribute(pos, k).sub(center).multiplyScalar(s).add(center)
      pos.setXYZ(k, v.x, v.y, v.z)
      uv.setX(k, uv.getX(k) * path.length * 1.6)
    }
  }
  pos.needsUpdate = true
  uv.needsUpdate = true
  return geo
}

export function Snake({ snake, index, visual }: { snake: SnakeConfig; index: number; visual: SnakeVisual }) {
  const path = snakePath(snake)
  const scheme = SNAKE_SCHEMES[index % SNAKE_SCHEMES.length]
  const body = useMemo(() => buildBody(path), [path])
  const mats = useMemo(
    () => ({
      skin: new MeshStandardMaterial({ map: snakeSkinTexture(scheme), roughness: 0.42, metalness: 0.05 }),
      base: new MeshStandardMaterial({ color: scheme.base, roughness: 0.42 }),
      pattern: new MeshStandardMaterial({ color: scheme.pattern, roughness: 0.5 }),
      belly: new MeshStandardMaterial({ color: scheme.accent, roughness: 0.55 }),
      mouth: new MeshStandardMaterial({ color: '#6e1a2a', roughness: 0.7 }),
      eye: new MeshStandardMaterial({ color: '#f6d743', roughness: 0.2, emissive: '#4a3a00', emissiveIntensity: 0.4 }),
      pupil: new MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.2 }),
      fang: new MeshStandardMaterial({ color: '#fbf7ef', roughness: 0.3 }),
      tongue: new MeshStandardMaterial({ color: '#d7263d', roughness: 0.5 }),
    }),
    [scheme],
  )
  useEffect(
    () => () => {
      body.dispose()
      Object.values(mats).forEach((m) => m.dispose())
    },
    [body, mats],
  )

  const head = useRef<Group>(null)
  const jaw = useRef<Group>(null)
  const tongue = useRef<Group>(null)
  const neck = useRef<(Mesh | null)[]>([])
  const side = useMemo(() => new Vector3(-path.dir.z, 0, path.dir.x), [path])
  const tmp = useMemo(() => new Vector3(), [])

  useFrame(({ clock }) => {
    if (!visual.active) {
      // Idle: gentle sway, breathing bob, periodic tongue flick.
      const t = clock.elapsedTime + index * 1.7
      visual.head.copy(path.restHead).addScaledVector(side, 0.025 * Math.sin(t * 0.9))
      visual.head.y += 0.015 * Math.sin(t * 1.8)
      visual.yaw = path.restYaw + 0.3 * Math.sin(t * 0.7)
      visual.pitch = 0.06 * Math.sin(t * 1.3)
      const flick = t % 3.4
      visual.tongue = flick < 0.45 ? Math.sin((flick / 0.45) * Math.PI) : 0
      visual.jaw = visual.tongue > 0 ? 0.1 : 0
    }
    if (head.current) {
      head.current.position.copy(visual.head)
      head.current.rotation.set(-visual.pitch, visual.yaw, 0, 'YXZ')
    }
    if (jaw.current) jaw.current.rotation.x = visual.jaw * 0.85
    if (tongue.current) {
      tongue.current.visible = visual.tongue > 0.02
      tongue.current.scale.set(1, 1, Math.max(0.01, visual.tongue))
    }
    for (let i = 0; i < NECK_SEGMENTS; i++) {
      const m = neck.current[i]
      if (!m) continue
      const t = i / NECK_SEGMENTS
      neckPoint(path.neckBase, visual.head, path.dir, t, tmp)
      m.position.copy(tmp)
      m.scale.setScalar(SNAKE_RADIUS * (0.86 - 0.18 * t))
    }
  })

  return (
    <group>
      <mesh geometry={body} material={mats.skin} castShadow receiveShadow />
      {Array.from({ length: NECK_SEGMENTS }, (_, i) => (
        <mesh key={i} ref={(m) => (neck.current[i] = m)} geometry={neckSphere} material={mats.base} castShadow />
      ))}
      <group ref={head}>
        {/* Skull / upper jaw */}
        <mesh geometry={headSphere} material={mats.base} position={[0, 0.012, 0.075]} scale={[0.86, 0.5, 1.35]} castShadow />
        <mesh geometry={headSphere} material={mats.pattern} position={[0, 0.04, 0.06]} scale={[0.62, 0.18, 1.05]} />
        {/* Eyes with vertical slit pupils */}
        {[1, -1].map((s) => (
          <group key={s}>
            <mesh geometry={smallSphere} material={mats.eye} position={[0.058 * s, 0.035, 0.1]} scale={0.022} />
            <mesh geometry={smallSphere} material={mats.pupil} position={[0.072 * s, 0.035, 0.114]} rotation-y={0.78 * s} scale={[0.006, 0.017, 0.006]} />
            <mesh geometry={smallSphere} material={mats.pupil} position={[0.017 * s, 0.026, 0.205]} scale={0.006} />
          </group>
        ))}
        {/* Fangs, hidden inside the lower jaw when the mouth is closed */}
        {[1, -1].map((s) => (
          <mesh key={s} material={mats.fang} position={[0.035 * s, -0.022, 0.165]} rotation-x={Math.PI}>
            <coneGeometry args={[0.009, 0.042, 6]} />
          </mesh>
        ))}
        {/* Lower jaw hinged at the back of the head */}
        <group ref={jaw} position={[0, -0.006, 0]}>
          <mesh geometry={headSphere} material={mats.belly} position={[0, -0.016, 0.072]} scale={[0.74, 0.24, 1.25]} castShadow />
          <mesh geometry={headSphere} material={mats.mouth} position={[0, -0.004, 0.08]} scale={[0.6, 0.08, 1.08]} />
        </group>
        {/* Forked tongue */}
        <group ref={tongue} position={[0, -0.012, 0.16]}>
          <mesh material={mats.tongue} position={[0, 0, 0.05]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.006, 0.007, 0.1, 6]} />
          </mesh>
          {[1, -1].map((s) => (
            <mesh key={s} material={mats.tongue} position={[0.012 * s, 0, 0.115]} rotation={[Math.PI / 2, 0, -0.45 * s]}>
              <cylinderGeometry args={[0.003, 0.005, 0.04, 5]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}
