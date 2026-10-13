import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  Color,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PlaneGeometry,
  Vector3,
  type Group,
  type Mesh,
} from 'three'
import type { AnimationController } from '../animation/animationController'
import { BOARD_HALF, BOARD_TOP_Y } from '../game/boardCoordinates'

const SPARKS = 14

/** Cartoon "snap" at the bite contact point: expanding ring + sparks. No gore. */
export function ImpactBurst({ controller }: { controller: AnimationController }) {
  const group = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const sparks = useMemo(() => {
    const m = new InstancedMesh(new OctahedronGeometry(1, 0), new MeshBasicMaterial({ color: '#fff3b0' }), SPARKS)
    m.frustumCulled = false
    return m
  }, [])
  const dirs = useMemo(
    () => Array.from({ length: SPARKS }, (_, i) => new Vector3(Math.cos(i * 2.4), 0.4 + ((i * 0.37) % 0.8), Math.sin(i * 2.4)).normalize()),
    [],
  )
  const dummy = useMemo(() => new Object3D(), [])
  useEffect(() => () => {
    sparks.geometry.dispose()
    ;(sparks.material as MeshBasicMaterial).dispose()
  }, [sparks])

  useFrame(() => {
    const impact = controller.impact
    if (!group.current) return
    group.current.visible = impact !== null
    if (!impact) return
    const a = impact.age
    if (ring.current) {
      ring.current.position.copy(impact.position)
      ring.current.scale.setScalar(0.08 + a * 0.75)
      ;(ring.current.material as MeshBasicMaterial).opacity = Math.max(0, 1 - a * 1.6)
    }
    dirs.forEach((d, i) => {
      dummy.position.copy(impact.position).addScaledVector(d, a * 0.9)
      dummy.position.y -= a * a * 0.6
      dummy.scale.setScalar(Math.max(0.0001, 0.035 * (1 - a)))
      dummy.rotation.set(a * 9 + i, a * 7, 0)
      dummy.updateMatrix()
      sparks.setMatrixAt(i, dummy.matrix)
    })
    sparks.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={group} visible={false}>
      <Billboard>
        <mesh ref={ring}>
          <ringGeometry args={[0.7, 1, 32]} />
          <meshBasicMaterial color="#ffffff" transparent depthWrite={false} />
        </mesh>
      </Billboard>
      <primitive object={sparks} />
    </group>
  )
}

const CONFETTI = 260
const CONFETTI_COLORS = ['#e63946', '#f4a024', '#e9c46a', '#2a9d5f', '#3a86ff', '#8e5cf7', '#ff7eb6']

/** Falling confetti over the board while a winner is celebrated. */
export function Confetti() {
  const mesh = useMemo(() => {
    const m = new InstancedMesh(new PlaneGeometry(0.09, 0.05), new MeshStandardMaterial({ side: 2, roughness: 0.6 }), CONFETTI)
    const color = new Color()
    for (let i = 0; i < CONFETTI; i++) m.setColorAt(i, color.set(CONFETTI_COLORS[i % CONFETTI_COLORS.length]))
    m.frustumCulled = false
    return m
  }, [])
  const particles = useMemo(
    () =>
      Array.from({ length: CONFETTI }, () => ({
        p: new Vector3((Math.random() - 0.5) * BOARD_HALF * 2.4, 3 + Math.random() * 6, (Math.random() - 0.5) * BOARD_HALF * 2.4),
        speed: 0.7 + Math.random() * 1.1,
        spin: new Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        sway: Math.random() * Math.PI * 2,
      })),
    [],
  )
  const dummy = useMemo(() => new Object3D(), [])
  useEffect(() => () => {
    mesh.geometry.dispose()
    ;(mesh.material as MeshStandardMaterial).dispose()
  }, [mesh])

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime
    particles.forEach((c, i) => {
      c.p.y -= c.speed * dt
      c.p.x += Math.sin(t * 1.5 + c.sway) * dt * 0.4
      if (c.p.y < BOARD_TOP_Y) c.p.y = 6 + Math.random() * 3
      dummy.position.copy(c.p)
      dummy.rotation.set(t * c.spin.x, t * c.spin.y, t * c.spin.z)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  return <primitive object={mesh} />
}
