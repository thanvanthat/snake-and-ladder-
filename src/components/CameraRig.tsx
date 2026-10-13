import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ElementRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import type { AnimationController } from '../animation/animationController'
import { dampFactor } from '../animation/easing'
import { store, useApp } from '../hooks/useGame'

const BOARD_TARGET = new Vector3(-0.45, 0, 0.25)
const HALF_WIDTH = 6.9 // board + start pad
const HALF_DEPTH = 6.0

/** Distance/elevation that frames the whole board for the current aspect ratio. */
function defaultView(camera: PerspectiveCamera, aspect: number): { position: Vector3; target: Vector3 } {
  const polar = aspect < 0.9 ? 0.6 : 0.78 // more top-down on portrait screens
  const halfV = (camera.fov * Math.PI) / 360
  const halfH = Math.atan(Math.tan(halfV) * aspect)
  const projectedDepth = HALF_DEPTH * Math.cos(polar) + 0.8
  const distance = Math.max(projectedDepth / Math.tan(halfV), HALF_WIDTH / Math.tan(halfH)) * 1.04
  const position = BOARD_TARGET.clone().add(new Vector3(0, Math.cos(polar) * distance, Math.sin(polar) * distance))
  return { position, target: BOARD_TARGET.clone() }
}

export function CameraRig({ controller, autoRotate = false }: { controller?: AnimationController; autoRotate?: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const controls = useRef<ElementRef<typeof OrbitControls>>(null)
  const resetId = useApp((s) => s.cameraResetId)
  const view = useMemo(() => defaultView(camera, size.width / Math.max(1, size.height)), [camera, size.width, size.height])
  const goal = useRef<{ position: Vector3; target: Vector3 } | null>(null)
  const beforeFocus = useRef<{ position: Vector3; target: Vector3 } | null>(null)
  const dragging = useRef(false)
  const first = useRef(true)

  // Snap to the framed view initially; glide back on explicit reset or resize.
  useEffect(() => {
    if (first.current) {
      first.current = false
      camera.position.copy(view.position)
      controls.current?.target.copy(view.target)
      controls.current?.update()
      return
    }
    goal.current = view
  }, [view, camera])

  useEffect(() => {
    if (resetId > 0) {
      beforeFocus.current = null
      goal.current = view
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to explicit reset requests
  }, [resetId])

  useFrame((_, delta) => {
    const c = controls.current
    if (!c) return
    const dt = Math.min(delta, 0.05)
    const focus = controller?.focus
    const cinematic = Boolean(focus && store.get().settings.cinematicCamera && !dragging.current)

    if (cinematic && focus) {
      if (!beforeFocus.current) beforeFocus.current = { position: camera.position.clone(), target: c.target.clone() }
      const offset = view.position.clone().sub(view.target).multiplyScalar(0.55)
      goal.current = { position: focus.clone().add(offset), target: focus.clone() }
    } else if (beforeFocus.current && !focus) {
      goal.current = beforeFocus.current
      beforeFocus.current = null
    }

    const g = goal.current
    if (g) {
      const k = dampFactor(cinematic ? 2.2 : 3.2, dt)
      camera.position.lerp(g.position, k)
      c.target.lerp(g.target, k)
      if (!cinematic && camera.position.distanceTo(g.position) < 0.02 && c.target.distanceTo(g.target) < 0.02) goal.current = null
    }
    c.update()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={34}
      minPolarAngle={0.12}
      maxPolarAngle={1.22}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
      onStart={() => {
        dragging.current = true
        goal.current = null
        beforeFocus.current = null
      }}
      onEnd={() => (dragging.current = false)}
    />
  )
}
