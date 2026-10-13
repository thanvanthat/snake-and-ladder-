import { CatmullRomCurve3, Vector3 } from 'three'
import { BOARD_TOP_Y, CELL_SIZE, squareToWorld } from '../game/boardCoordinates'
import type { Ladder, Snake } from '../game/gameTypes'

/**
 * Geometry derived from snake / ladder configs. Rendering components AND the animation
 * controller both use these, so the slide follows the visible body and the climb follows
 * the visible rails.
 */

export const SNAKE_RADIUS = 0.085
const UP = new Vector3(0, 1, 0)

export interface SnakePath {
  /** Body from the neck base down to the tail tip. */
  curve: CatmullRomCurve3
  neckBase: Vector3
  restHead: Vector3
  restYaw: number
  /** Horizontal unit direction from head square towards the body. */
  dir: Vector3
  length: number
}

export interface LadderPath {
  foot: Vector3
  topEnd: Vector3
  dir: Vector3
  length: number
  height: number
  /** Incline angle in radians. */
  pitch: number
  yaw: number
}

const seeded = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const snakeCache = new Map<string, SnakePath>()

export function snakePath(snake: Snake): SnakePath {
  const key = `${snake.head}:${snake.tail}`
  const cached = snakeCache.get(key)
  if (cached) return cached

  const head = squareToWorld(snake.head)
  const tail = squareToWorld(snake.tail)
  const dir = tail.clone().sub(head).setY(0).normalize()
  const side = new Vector3(-dir.z, 0, dir.x)
  const bodyY = BOARD_TOP_Y + SNAKE_RADIUS * 0.85

  const neckBase = head.clone().addScaledVector(dir, 0.42 * CELL_SIZE).setY(BOARD_TOP_Y + 0.14)
  const tailTip = tail.clone().addScaledVector(dir, 0.08).setY(BOARD_TOP_Y + 0.02)
  const span = neckBase.distanceTo(tailTip)

  const bends = Math.max(3, Math.round(span / 1.1))
  const amp = Math.min(0.5, 0.2 + span * 0.035) * (0.8 + 0.4 * seeded(snake.head))
  const flip = seeded(snake.tail) > 0.5 ? 1 : -1
  const points = [neckBase]
  for (let i = 1; i < bends; i++) {
    const t = i / bends
    const envelope = Math.sin(Math.PI * t)
    const p = neckBase.clone().lerp(tailTip, t)
    p.addScaledVector(side, amp * envelope * (i % 2 === 0 ? 1 : -1) * flip)
    p.y = bodyY + (i % 2) * 0.03
    points.push(p)
  }
  points.push(tailTip)

  const curve = new CatmullRomCurve3(points, false, 'centripetal')
  const restHead = head.clone().addScaledVector(dir, 0.16).setY(BOARD_TOP_Y + 0.11)
  const path: SnakePath = {
    curve,
    neckBase,
    restHead,
    restYaw: Math.atan2(-dir.x, -dir.z),
    dir,
    length: curve.getLength(),
  }
  snakeCache.set(key, path)
  return path
}

/** Point along a quadratic neck from the body to the (moving) head. */
export function neckPoint(neckBase: Vector3, head: Vector3, dir: Vector3, t: number, out: Vector3): Vector3 {
  const reach = neckBase.distanceTo(head)
  const control = neckBase
    .clone()
    .addScaledVector(dir, -0.35 * reach)
    .addScaledVector(UP, 0.06 + 0.35 * Math.max(0, head.y - neckBase.y))
  const a = (1 - t) * (1 - t)
  const b = 2 * (1 - t) * t
  const c = t * t
  return out.set(
    a * neckBase.x + b * control.x + c * head.x,
    a * neckBase.y + b * control.y + c * head.y,
    a * neckBase.z + b * control.z + c * head.z,
  )
}

const ladderCache = new Map<string, LadderPath>()

export function ladderPath(ladder: Ladder): LadderPath {
  const key = `${ladder.bottom}:${ladder.top}`
  const cached = ladderCache.get(key)
  if (cached) return cached

  const bottom = squareToWorld(ladder.bottom)
  const top = squareToWorld(ladder.top)
  const dir = top.clone().sub(bottom).setY(0).normalize()
  const flat = bottom.distanceTo(top)
  const height = Math.min(0.95, Math.max(0.4, 0.3 + 0.08 * flat))
  const foot = bottom.clone().addScaledVector(dir, 0.22)
  const topEnd = top.clone().addScaledVector(dir, -0.3).setY(BOARD_TOP_Y + height)
  const run = foot.clone().setY(0).distanceTo(topEnd.clone().setY(0))
  const path: LadderPath = {
    foot,
    topEnd,
    dir,
    length: foot.distanceTo(topEnd),
    height,
    pitch: Math.atan2(height, run),
    yaw: Math.atan2(dir.x, dir.z),
  }
  ladderCache.set(key, path)
  return path
}
