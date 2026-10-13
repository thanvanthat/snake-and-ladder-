import { RoundedBox } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Quaternion, Vector3, type Group } from 'three'
import { clamp01, easeOutCubic } from '../animation/easing'
import { DICE_FACE_NORMALS, diceFaceQuaternion, PIP_LAYOUT } from '../game/dice'
import { store } from '../hooks/useGame'

interface DiceProps {
  value: number | null
  rollId: number
  rolling: boolean
  onSettled: (rollId: number) => void
}

interface Roll {
  id: number
  t: number
  duration: number
  target: Quaternion
  axes: [Vector3, Vector3]
  turns: [number, number]
  start: Vector3
  bounces: number
  height: number
  settled: boolean
}

const Z = new Vector3(0, 0, 1)
const spinA = new Quaternion()
const spinB = new Quaternion()
const rand = (min: number, max: number) => min + Math.random() * (max - min)
function randomAxis(): Vector3 {
  const z = rand(-1, 1)
  const a = rand(0, Math.PI * 2)
  const r = Math.sqrt(1 - z * z)
  return new Vector3(r * Math.cos(a), r * Math.sin(a), z)
}

/** Pips are placed using the same face normals the rotation table is built from. */
function Pips() {
  const pips = useMemo(() => {
    const out: { position: Vector3; quaternion: Quaternion; red: boolean }[] = []
    for (const [valueKey, normal] of Object.entries(DICE_FACE_NORMALS)) {
      const value = Number(valueKey)
      const n = new Vector3(...normal)
      const t1 = Math.abs(n.y) > 0.5 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
      const t2 = new Vector3().crossVectors(n, t1)
      const q = new Quaternion().setFromUnitVectors(Z, n)
      for (const [a, b] of PIP_LAYOUT[value]) {
        out.push({
          position: n.clone().multiplyScalar(0.502).addScaledVector(t1, a * 0.25).addScaledVector(t2, b * 0.25),
          quaternion: q,
          red: value === 1,
        })
      }
    }
    return out
  }, [])
  return (
    <>
      {pips.map((p, i) => (
        <mesh key={i} position={p.position} quaternion={p.quaternion}>
          <circleGeometry args={[p.red ? 0.12 : 0.085, 24]} />
          <meshStandardMaterial color={p.red ? '#c62828' : '#1d1b26'} roughness={0.35} polygonOffset polygonOffsetFactor={-1} />
        </mesh>
      ))}
    </>
  )
}

function Die({ value, rollId, rolling, onSettled }: DiceProps) {
  const ref = useRef<Group>(null)
  const roll = useRef<Roll | null>(null)

  useFrame(({ clock }, delta) => {
    const g = ref.current
    if (!g) return
    const { paused, settings } = store.get()

    if (rolling && value !== null && roll.current?.id !== rollId) {
      // Every throw differs: tumble axes, spin amount, bounces, start spot and final angle.
      const turns = (min: number, extra: number) => (Math.random() < 0.5 ? -1 : 1) * (min + Math.floor(Math.random() * extra)) * Math.PI * 2
      roll.current = {
        id: rollId,
        t: 0,
        duration: settings.fastAnimations ? rand(0.55, 0.75) : rand(0.95, 1.45),
        target: diceFaceQuaternion(value, rand(0, Math.PI * 2)),
        axes: [randomAxis(), randomAxis()],
        turns: [turns(2, 3), turns(1, 2)],
        start: new Vector3(rand(-0.45, 0.45), 0, rand(-0.35, 0.35)),
        bounces: rand(2, 3.6),
        height: rand(0.55, 1),
        settled: false,
      }
    }

    const r = roll.current
    if (r && !r.settled) {
      if (!paused) r.t += Math.min(delta, 0.05)
      const t = clamp01(r.t / r.duration)
      const left = 1 - easeOutCubic(t)
      // Spins unwind to zero, so the die always ends exactly on the engine's value.
      spinA.setFromAxisAngle(r.axes[0], r.turns[0] * left)
      spinB.setFromAxisAngle(r.axes[1], r.turns[1] * left)
      g.quaternion.copy(r.target).multiply(spinA).multiply(spinB)
      g.position.copy(r.start).multiplyScalar(left)
      g.position.y = Math.abs(Math.sin(t * Math.PI * r.bounces)) * (1 - t) ** 1.6 * r.height
      if (t >= 1) {
        r.settled = true
        g.quaternion.copy(r.target)
        g.position.set(0, 0, 0)
        onSettled(r.id)
      }
    } else if (r) {
      g.position.y = Math.sin(clock.elapsedTime * 2) * 0.03
    } else {
      // Before the first roll: slow showcase spin.
      g.rotation.set(0.5, clock.elapsedTime * 0.6, 0.2)
      g.position.y = Math.sin(clock.elapsedTime * 2) * 0.04
    }
  })

  return (
    <group ref={ref}>
      <RoundedBox args={[1, 1, 1]} radius={0.12} smoothness={4}>
        <meshPhysicalMaterial color="#fbf7ee" roughness={0.25} clearcoat={0.8} clearcoatRoughness={0.2} />
      </RoundedBox>
      <Pips />
    </group>
  )
}

export function Dice3D(props: DiceProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 3.7, 1.9], fov: 32 }}
      gl={{ alpha: true, antialias: true }}
      aria-hidden
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[1.5, 5, 2.5]} intensity={2.2} />
      <directionalLight position={[-3, 1, 2]} intensity={0.6} color="#cfe3ff" />
      <Die {...props} />
    </Canvas>
  )
}
