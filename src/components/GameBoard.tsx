import { RoundedBox } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { Color, InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { BOARD_TOP_Y, CELL_SIZE, GRID, START_PAD_CENTER, squareToWorld } from '../game/boardCoordinates'
import { FINAL_SQUARE, type BoardConfig } from '../game/gameTypes'
import { boardLabelTexture, cellColor, woodTexture } from './textures'

const CELL_HEIGHT = 0.12
const FRAME = GRID * CELL_SIZE + 1.2

/** One instanced draw call for all 100 bevelled cells. */
function useCells(): InstancedMesh {
  const mesh = useMemo(() => {
    const geometry = new RoundedBoxGeometry(CELL_SIZE * 0.95, CELL_HEIGHT, CELL_SIZE * 0.95, 2, 0.035)
    const material = new MeshStandardMaterial({ roughness: 0.62, metalness: 0.02 })
    const m = new InstancedMesh(geometry, material, FINAL_SQUARE)
    const dummy = new Object3D()
    const color = new Color()
    for (let square = 1; square <= FINAL_SQUARE; square++) {
      dummy.position.copy(squareToWorld(square, BOARD_TOP_Y - CELL_HEIGHT / 2))
      dummy.updateMatrix()
      m.setMatrixAt(square - 1, dummy.matrix)
      m.setColorAt(square - 1, color.set(cellColor(square)))
    }
    m.receiveShadow = true
    return m
  }, [])
  useEffect(() => () => {
    mesh.geometry.dispose()
    ;(mesh.material as MeshStandardMaterial).dispose()
  }, [mesh])
  return mesh
}

function Flag({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 1.1, 10]} />
        <meshStandardMaterial color="#e8e2d4" metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0.2, 0.95, 0]} castShadow>
        <boxGeometry args={[0.38, 0.24, 0.02]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color="#f2c14e" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

export function GameBoard({ board }: { board: BoardConfig }) {
  const cells = useCells()
  const labels = useMemo(() => boardLabelTexture(board), [board])
  const wood = useMemo(() => woodTexture('#7a4a2b', '#3a2112'), [])
  const finish = squareToWorld(FINAL_SQUARE)

  return (
    <group>
      {/* Frame and plinth */}
      <RoundedBox args={[FRAME, 0.5, FRAME]} radius={0.12} smoothness={3} position={[0, -0.05, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={wood} color="#a06a45" roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[FRAME + 0.7, 0.3, FRAME + 0.7]} radius={0.1} smoothness={3} position={[0, -0.4, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={wood} color="#5a3420" roughness={0.6} />
      </RoundedBox>

      <primitive object={cells} />

      {/* Numbers and markings */}
      <mesh position={[0, BOARD_TOP_Y + 0.003, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[GRID * CELL_SIZE, GRID * CELL_SIZE]} />
        <meshStandardMaterial map={labels} transparent depthWrite={false} roughness={0.85} polygonOffset polygonOffsetFactor={-2} />
      </mesh>

      {/* Start pad (logical position 0) */}
      <group position={[START_PAD_CENTER.x, 0, START_PAD_CENTER.z]}>
        <RoundedBox args={[1.3, BOARD_TOP_Y + 0.55, 1.3]} radius={0.08} smoothness={3} position={[0, (BOARD_TOP_Y - 0.55) / 2, 0]} castShadow receiveShadow>
          <meshStandardMaterial map={wood} color="#a06a45" roughness={0.5} />
        </RoundedBox>
        <mesh position={[0, BOARD_TOP_Y + 0.002, 0]} rotation-x={-Math.PI / 2} receiveShadow>
          <circleGeometry args={[0.56, 40]} />
          <meshStandardMaterial color="#f5ecd7" roughness={0.7} />
        </mesh>
        <mesh position={[0, BOARD_TOP_Y + 0.004, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.5, 0.56, 40]} />
          <meshStandardMaterial color="#e07a5f" roughness={0.6} />
        </mesh>
        <Flag position={[-0.5, BOARD_TOP_Y, -0.5]} color="#3d9a8b" />
      </group>

      {/* Finish flag on the frame next to square 100 */}
      <Flag position={[finish.x - 0.82, 0.2, finish.z - 0.3]} color="#e9b949" />
    </group>
  )
}
