import { useEffect, useMemo } from 'react'
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
} from 'three'

const SKY = '#bfe0ee'

function seeded(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

/** Low-poly trees, rocks and bushes, instanced (a handful of draw calls in total). */
function useDecorations(): Object3D {
  const group = useMemo(() => {
    const rand = seeded(42)
    const root = new Object3D()
    const dummy = new Object3D()
    const color = new Color()
    const spots: { x: number; z: number; s: number }[] = []
    while (spots.length < 34) {
      const angle = rand() * Math.PI * 2
      const radius = 9.5 + rand() * 9
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      if (z > 4 && Math.abs(x) < 9) continue // keep the camera side clear
      spots.push({ x, z, s: 0.7 + rand() * 0.8 })
    }

    const trunks = new InstancedMesh(new CylinderGeometry(0.12, 0.18, 1, 7), new MeshStandardMaterial({ color: '#6b4a2f', roughness: 0.9 }), spots.length)
    const crowns = new InstancedMesh(new ConeGeometry(0.85, 1.9, 7), new MeshStandardMaterial({ roughness: 0.8, flatShading: true }), spots.length * 2)
    spots.forEach(({ x, z, s }, i) => {
      dummy.position.set(x, -0.05 + 0.5 * s, z)
      dummy.scale.set(s, s, s)
      dummy.rotation.set(0, rand() * 6, 0)
      dummy.updateMatrix()
      trunks.setMatrixAt(i, dummy.matrix)
      for (let tier = 0; tier < 2; tier++) {
        const ts = s * (1 - tier * 0.28)
        dummy.position.set(x, -0.05 + s * (1.5 + tier * 0.95), z)
        dummy.scale.set(ts, ts, ts)
        dummy.updateMatrix()
        crowns.setMatrixAt(i * 2 + tier, dummy.matrix)
        crowns.setColorAt(i * 2 + tier, color.setHSL(0.3 + rand() * 0.06, 0.45, 0.32 + tier * 0.06))
      }
    })

    const rockCount = 26
    const rocks = new InstancedMesh(new DodecahedronGeometry(0.35, 0), new MeshStandardMaterial({ roughness: 0.95, flatShading: true }), rockCount)
    const bushes = new InstancedMesh(new IcosahedronGeometry(0.4, 1), new MeshStandardMaterial({ roughness: 0.85, flatShading: true }), rockCount)
    for (let i = 0; i < rockCount; i++) {
      const angle = rand() * Math.PI * 2
      const radius = 8.2 + rand() * 6
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const s = 0.4 + rand() * 0.9
      dummy.position.set(x, -0.5 + 0.15 * s, z)
      dummy.scale.set(s, s * 0.7, s)
      dummy.rotation.set(rand(), rand() * 6, rand())
      dummy.updateMatrix()
      rocks.setMatrixAt(i, dummy.matrix)
      rocks.setColorAt(i, color.setHSL(0.08, 0.08, 0.55 + rand() * 0.15))

      const bx = Math.cos(angle + 0.4) * (radius + 0.8)
      const bz = Math.sin(angle + 0.4) * (radius + 0.8)
      dummy.position.set(bx, -0.45 + 0.2 * s, bz)
      dummy.scale.set(s, s * 0.8, s)
      dummy.updateMatrix()
      bushes.setMatrixAt(i, dummy.matrix)
      bushes.setColorAt(i, color.setHSL(0.25 + rand() * 0.1, 0.5, 0.38 + rand() * 0.1))
    }

    for (const m of [trunks, crowns, rocks, bushes]) {
      m.castShadow = true
      m.receiveShadow = true
      root.add(m)
    }
    return root
  }, [])

  useEffect(() => () => {
    group.traverse((o) => {
      if (o instanceof InstancedMesh) {
        o.geometry.dispose()
        ;(o.material as MeshStandardMaterial).dispose()
      }
    })
  }, [group])
  return group
}

export function SceneEnvironment() {
  const decorations = useDecorations()
  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 26, 62]} />
      <hemisphereLight args={['#eaf6ff', '#6d8f4e', 1.1]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[7, 14, 7]}
        intensity={2.4}
        color="#fff4e2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />
      <directionalLight position={[-8, 6, -6]} intensity={0.45} color="#c9dcff" />

      {/* Ground, stone dais under the board */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.56, 0]} receiveShadow>
        <circleGeometry args={[70, 64]} />
        <meshStandardMaterial color="#93c47d" roughness={1} />
      </mesh>
      <mesh position={[0, -0.58, 0]} receiveShadow>
        <cylinderGeometry args={[9.4, 9.8, 0.1, 64]} />
        <meshStandardMaterial color="#d9cbb0" roughness={0.9} />
      </mesh>
      <primitive object={decorations} />
    </>
  )
}
