import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import {
  BoxGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three'
import { blendJoints, computePose, zeroJoints, type Pose } from '../animation/characterAnimations'
import { dampFactor } from '../animation/easing'
import type { Appearance } from '../game/players'

/**
 * Stylised low-poly humanoid built from primitives, with a joint hierarchy
 * (hips > spine > shoulders > elbows, hips > knees, neck > head) animated procedurally.
 * Faces +Z. Feet at y = 0.
 */

export interface PoseSource {
  pose: Pose
  poseTime: number
  lean: number
}

// Shared geometry for every character instance.
const G = {
  thigh: new CapsuleGeometry(0.036, 0.1, 4, 10),
  shin: new CapsuleGeometry(0.031, 0.09, 4, 10),
  shoe: new BoxGeometry(0.075, 0.05, 0.13),
  pelvis: new CylinderGeometry(0.085, 0.08, 0.09, 14),
  torso: new CapsuleGeometry(0.085, 0.1, 6, 16),
  belt: new CylinderGeometry(0.087, 0.087, 0.022, 16),
  upperArm: new CapsuleGeometry(0.03, 0.08, 4, 10),
  forearm: new CapsuleGeometry(0.026, 0.07, 4, 10),
  hand: new SphereGeometry(0.032, 12, 10),
  neck: new CylinderGeometry(0.032, 0.034, 0.07, 10),
  head: new SphereGeometry(0.095, 24, 18),
  hairCap: new SphereGeometry(0.103, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
  eye: new SphereGeometry(0.02, 12, 10),
  pupil: new SphereGeometry(0.012, 10, 8),
  brow: new BoxGeometry(0.034, 0.008, 0.01),
  nose: new SphereGeometry(0.013, 10, 8),
  ear: new SphereGeometry(0.02, 10, 8),
  mouth: new TorusGeometry(0.02, 0.0045, 6, 14, Math.PI),
  curl: new SphereGeometry(0.036, 10, 8),
  bun: new SphereGeometry(0.046, 14, 12),
  spike: new ConeGeometry(0.028, 0.08, 7),
  tail: new CapsuleGeometry(0.03, 0.1, 4, 10),
  longHair: new BoxGeometry(0.19, 0.2, 0.05),
}

function useMaterials(a: Appearance) {
  const mats = useMemo(
    () => ({
      skin: new MeshStandardMaterial({ color: a.skin, roughness: 0.6 }),
      hair: new MeshStandardMaterial({ color: a.hair, roughness: 0.7 }),
      shirt: new MeshStandardMaterial({ color: a.shirt, roughness: 0.75 }),
      pants: new MeshStandardMaterial({ color: a.pants, roughness: 0.8 }),
      shoes: new MeshStandardMaterial({ color: a.shoes, roughness: 0.45 }),
      white: new MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 }),
      dark: new MeshStandardMaterial({ color: '#1c1a22', roughness: 0.3 }),
      lips: new MeshStandardMaterial({ color: '#8c2f39', roughness: 0.5 }),
      belt: new MeshStandardMaterial({ color: '#2a2230', roughness: 0.5 }),
    }),
    [a],
  )
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats])
  return mats
}

type Mats = ReturnType<typeof useMaterials>

function Hair({ a, m }: { a: Appearance; m: Mats }) {
  const cap = <mesh geometry={G.hairCap} material={m.hair} position={[0, 0.09, -0.004]} rotation-x={-0.32} castShadow />
  switch (a.hairStyle) {
    case 'short':
      return cap
    case 'ponytail':
      return (
        <>
          {cap}
          <mesh geometry={G.tail} material={m.hair} position={[0, 0.07, -0.12]} rotation-x={0.55} castShadow />
          <mesh geometry={G.curl} material={m.shirt} position={[0, 0.13, -0.095]} scale={0.6} />
        </>
      )
    case 'curly':
      return (
        <>
          {cap}
          {[[0, 0.18, 0.02], [0.06, 0.16, 0.03], [-0.06, 0.16, 0.03], [0.08, 0.12, -0.04], [-0.08, 0.12, -0.04], [0, 0.16, -0.07], [0.05, 0.08, -0.08], [-0.05, 0.08, -0.08], [0.04, 0.19, -0.03], [-0.04, 0.19, -0.03]].map((p, i) => (
            <mesh key={i} geometry={G.curl} material={m.hair} position={p as [number, number, number]} castShadow />
          ))}
        </>
      )
    case 'bun':
      return (
        <>
          {cap}
          <mesh geometry={G.bun} material={m.hair} position={[0, 0.19, -0.06]} castShadow />
        </>
      )
    case 'spiky':
      return (
        <>
          {cap}
          {[[0, 0.19, 0.02, -0.3, 0], [0.05, 0.17, 0, -0.1, -0.5], [-0.05, 0.17, 0, -0.1, 0.5], [0, 0.17, -0.06, 0.5, 0], [0.06, 0.13, -0.05, 0.4, -0.7], [-0.06, 0.13, -0.05, 0.4, 0.7], [0.03, 0.18, 0.05, -0.6, -0.3]].map(([x, y, z, rx, rz], i) => (
            <mesh key={i} geometry={G.spike} material={m.hair} position={[x, y, z]} rotation={[rx, 0, rz]} castShadow />
          ))}
        </>
      )
    case 'long':
      return (
        <>
          {cap}
          <mesh geometry={G.longHair} material={m.hair} position={[0, 0.03, -0.07]} castShadow />
          <mesh geometry={G.longHair} material={m.hair} position={[0.08, 0.02, -0.02]} scale={[0.25, 0.85, 1.6]} castShadow />
          <mesh geometry={G.longHair} material={m.hair} position={[-0.08, 0.02, -0.02]} scale={[0.25, 0.85, 1.6]} castShadow />
        </>
      )
  }
}

function Arm({ side, m, refs }: { side: 1 | -1; m: Mats; refs: { shoulder: RefObject<Group>; elbow: RefObject<Group> } }) {
  return (
    <group ref={refs.shoulder} position={[0.112 * side, 0.2, 0]}>
      <mesh geometry={G.upperArm} material={m.shirt} position={[0, -0.055, 0]} castShadow />
      <group ref={refs.elbow} position={[0, -0.115, 0]}>
        <mesh geometry={G.forearm} material={m.skin} position={[0, -0.05, 0]} castShadow />
        <mesh geometry={G.hand} material={m.skin} position={[0, -0.105, 0.004]} castShadow />
      </group>
    </group>
  )
}

function Leg({ side, m, refs }: { side: 1 | -1; m: Mats; refs: { hip: RefObject<Group>; knee: RefObject<Group> } }) {
  return (
    <group ref={refs.hip} position={[0.048 * side, 0, 0]}>
      <mesh geometry={G.thigh} material={m.pants} position={[0, -0.07, 0]} castShadow />
      <group ref={refs.knee} position={[0, -0.14, 0]}>
        <mesh geometry={G.shin} material={m.pants} position={[0, -0.065, 0]} castShadow />
        <mesh geometry={G.shoe} material={m.shoes} position={[0, -0.128, 0.022]} castShadow />
      </group>
    </group>
  )
}

export function HumanCharacter({ appearance, source, scale = 0.8 }: { appearance: Appearance; source: PoseSource; scale?: number }) {
  const m = useMaterials(appearance)
  const tilt = useRef<Group>(null)
  const bob = useRef<Group>(null)
  const spine = useRef<Group>(null)
  const head = useRef<Group>(null)
  const shoulderL = useRef<Group>(null)
  const shoulderR = useRef<Group>(null)
  const elbowL = useRef<Group>(null)
  const elbowR = useRef<Group>(null)
  const hipL = useRef<Group>(null)
  const hipR = useRef<Group>(null)
  const kneeL = useRef<Group>(null)
  const kneeR = useRef<Group>(null)
  const current = useRef(zeroJoints())
  const target = useRef(zeroJoints())

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    computePose(source.pose, source.poseTime, target.current)
    blendJoints(current.current, target.current, dampFactor(12, dt))
    const j = current.current
    if (!tilt.current || !bob.current || !spine.current || !head.current) return
    tilt.current.rotation.x += (source.lean - tilt.current.rotation.x) * dampFactor(8, dt)
    bob.current.position.y = j.bob
    spine.current.rotation.x = j.spine
    head.current.rotation.set(j.headX, j.headY, 0)
    shoulderL.current?.rotation.set(j.shoulderL, 0, j.armOutL)
    shoulderR.current?.rotation.set(j.shoulderR, 0, -j.armOutR)
    elbowL.current?.rotation.set(j.elbowL, 0, 0)
    elbowR.current?.rotation.set(j.elbowR, 0, 0)
    hipL.current?.rotation.set(j.hipL, 0, 0)
    hipR.current?.rotation.set(j.hipR, 0, 0)
    kneeL.current?.rotation.set(j.kneeL, 0, 0)
    kneeR.current?.rotation.set(j.kneeR, 0, 0)
  })

  return (
    <group scale={scale}>
      <group ref={tilt}>
        <group ref={bob}>
          <group position={[0, 0.29, 0]}>
            <mesh geometry={G.pelvis} material={m.pants} position={[0, 0.005, 0]} castShadow />
            <Leg side={1} m={m} refs={{ hip: hipL, knee: kneeL }} />
            <Leg side={-1} m={m} refs={{ hip: hipR, knee: kneeR }} />
            <group ref={spine} position={[0, 0.03, 0]}>
              <mesh geometry={G.belt} material={m.belt} position={[0, 0.0, 0]} />
              <mesh geometry={G.torso} material={m.shirt} position={[0, 0.1, 0]} scale={[1.08, 1, 0.82]} castShadow />
              <Arm side={1} m={m} refs={{ shoulder: shoulderL, elbow: elbowL }} />
              <Arm side={-1} m={m} refs={{ shoulder: shoulderR, elbow: elbowR }} />
              <mesh geometry={G.neck} material={m.skin} position={[0, 0.265, 0]} />
              <group ref={head} position={[0, 0.29, 0]}>
                <mesh geometry={G.head} material={m.skin} position={[0, 0.085, 0]} castShadow />
                <mesh geometry={G.ear} material={m.skin} position={[0.093, 0.085, 0]} />
                <mesh geometry={G.ear} material={m.skin} position={[-0.093, 0.085, 0]} />
                {[1, -1].map((s) => (
                  <group key={s}>
                    <mesh geometry={G.eye} material={m.white} position={[0.034 * s, 0.095, 0.078]} />
                    <mesh geometry={G.pupil} material={m.dark} position={[0.034 * s, 0.095, 0.094]} />
                    <mesh geometry={G.brow} material={m.hair} position={[0.034 * s, 0.124, 0.088]} rotation-z={0.12 * s} />
                  </group>
                ))}
                <mesh geometry={G.nose} material={m.skin} position={[0, 0.074, 0.094]} />
                <mesh geometry={G.mouth} material={m.lips} position={[0, 0.052, 0.087]} rotation-z={Math.PI} />
                <Hair a={appearance} m={m} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
