import { Quaternion, Vector3 } from 'three'
import { DIE_FACES } from './gameTypes'

type ByteSource = () => number | null

const cryptoByte: ByteSource = () => {
  const c = globalThis.crypto
  if (!c?.getRandomValues) return null
  const buf = new Uint8Array(1)
  c.getRandomValues(buf)
  return buf[0]
}

/**
 * Fair six-sided die. Uses the browser CSPRNG with rejection sampling (252 = 6 * 42, so no
 * modulo bias); falls back to Math.random when crypto is unavailable.
 */
export function rollDie(source: ByteSource = cryptoByte): number {
  for (;;) {
    const byte = source()
    if (byte === null) return Math.floor(Math.random() * DIE_FACES) + 1
    if (byte < 252) return (byte % DIE_FACES) + 1
  }
}

export type Vec3Tuple = [number, number, number]

/** Outward normal of the face carrying each value (opposite faces sum to 7). */
export const DICE_FACE_NORMALS: Record<number, Vec3Tuple> = {
  1: [0, 0, 1],
  6: [0, 0, -1],
  2: [0, 1, 0],
  5: [0, -1, 0],
  3: [1, 0, 0],
  4: [-1, 0, 0],
}

const UP = new Vector3(0, 1, 0)

/**
 * Orientation that puts the face showing `value` on top (+Y), like reading a real die.
 * `yaw` spins the die about the vertical so it settles at a different angle each throw;
 * it never changes which face is on top.
 */
export function diceFaceQuaternion(value: number, yaw = 0): Quaternion {
  const normal = DICE_FACE_NORMALS[value]
  if (!normal) throw new RangeError(`Invalid die value ${value}`)
  const faceUp = new Quaternion().setFromUnitVectors(new Vector3(...normal), UP)
  return new Quaternion().setFromAxisAngle(UP, yaw).multiply(faceUp)
}

/** Pip layout per face in face-local units (-1..1). */
export const PIP_LAYOUT: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  5: [[-1, -1], [-1, 1], [0, 0], [1, -1], [1, 1]],
  6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
}
