import { CatmullRomCurve3, Vector3 } from 'three'
import { BOARD_TOP_Y, CELL_SIZE, squareToWorld } from '../game/boardCoordinates'
import type { AnimationStage, BoardConfig, Player, TurnPlan } from '../game/gameTypes'
import { STEP_DURATION, type Pose } from './characterAnimations'
import {
  dampFactor,
  easeInOutCubic,
  easeInOutSine,
  easeInQuad,
  easeOutCubic,
  lerp,
  lerpAngle,
  yawTowards,
} from './easing'
import { ladderPath, SNAKE_RADIUS, snakePath } from './paths'

/**
 * Drives every turn presentation with delta-time sequences and explicit completion
 * callbacks. Holds only *visual* state (mutable, read by components inside useFrame);
 * the authoritative positions always come from the rules engine via `sync()`.
 */

export interface CharacterVisual {
  id: string
  position: Vector3
  yaw: number
  pose: Pose
  poseTime: number
  /** Whole-body pitch, used while climbing. */
  lean: number
  /** True while a sequence owns this character. */
  busy: boolean
  idleTime: number
}

export interface SnakeVisual {
  /** True while the bite sequence owns the head; otherwise the snake idles. */
  active: boolean
  head: Vector3
  yaw: number
  pitch: number
  jaw: number
  tongue: number
}

export type SoundName = 'step' | 'hiss' | 'whoosh' | 'bite' | 'slither' | 'climb' | 'land' | 'win'

export interface ControllerHooks {
  sound?: (name: SoundName) => void
  stage?: (stage: AnimationStage) => void
}

export interface Task {
  stage?: AnimationStage
  duration: number
  start?: () => void
  /** t runs 0..1 over the task duration. */
  update?: (t: number, dt: number) => void
  end?: () => void
}

export class Sequence {
  private index = 0
  private elapsed = 0
  private started = false
  done = false

  constructor(
    private readonly tasks: Task[],
    private readonly onDone: () => void,
    private readonly onStage?: (stage: AnimationStage) => void,
  ) {}

  step(dt: number): void {
    let remaining = Math.max(0, dt)
    while (!this.done) {
      const task = this.tasks[this.index]
      if (!task) {
        this.done = true
        this.onDone()
        return
      }
      if (!this.started) {
        this.started = true
        this.elapsed = 0
        if (task.stage) this.onStage?.(task.stage)
        task.start?.()
      }
      const used = Math.min(remaining, task.duration - this.elapsed)
      this.elapsed += used
      remaining -= used
      task.update?.(task.duration > 0 ? this.elapsed / task.duration : 1, used)
      if (this.elapsed < task.duration) return
      task.end?.()
      this.index++
      this.started = false
    }
  }

  /** Stops without firing the completion callback. */
  cancel(): void {
    this.done = true
  }
}

/**
 * Distance travelled (0..1) for a walk that accelerates over the first 20% of the time,
 * keeps a steady pace, and decelerates over the last 20% (trapezoidal speed profile).
 */
export function smoothTravel(t: number, ramp = 0.2): number {
  const peak = 1 / (1 - ramp)
  if (t <= 0) return 0
  if (t >= 1) return 1
  if (t < ramp) return (0.5 * peak * t * t) / ramp
  if (t > 1 - ramp) return 1 - (0.5 * peak * (1 - t) ** 2) / ramp
  return peak * (t - ramp / 2)
}

/** Polyline through square centres, sampled by distance. */
export class WalkPath {
  readonly length: number
  private readonly cumulative: number[] = [0]

  constructor(private readonly points: Vector3[]) {
    for (let i = 1; i < points.length; i++) this.cumulative.push(this.cumulative[i - 1] + points[i - 1].distanceTo(points[i]))
    this.length = this.cumulative[this.cumulative.length - 1] ?? 0
  }

  segmentAt(distance: number): number {
    let i = 0
    while (i < this.cumulative.length - 2 && distance >= this.cumulative[i + 1]) i++
    return i
  }

  pointAt(distance: number, out: Vector3): Vector3 {
    if (this.points.length === 0) return out
    if (this.points.length === 1 || distance <= 0) return out.copy(this.points[0])
    if (distance >= this.length) return out.copy(this.points[this.points.length - 1])
    const i = this.segmentAt(distance)
    const span = this.cumulative[i + 1] - this.cumulative[i]
    return out.lerpVectors(this.points[i], this.points[i + 1], span > 0 ? (distance - this.cumulative[i]) / span : 1)
  }
}

const START_SLOTS =[new Vector3(-0.27, 0, -0.27), new Vector3(0.27, 0, -0.27), new Vector3(-0.27, 0, 0.27), new Vector3(0.27, 0, 0.27)]
const SHARED_RADIUS = 0.25

export class AnimationController {
  readonly characters = new Map<string, CharacterVisual>()
  readonly snakes: SnakeVisual[]
  shake = 0
  impact: { position: Vector3; age: number } | null = null
  /** Point of interest for the cinematic camera. */
  focus: Vector3 | null = null

  private readonly positions = new Map<string, number>()
  private order: string[] = []
  private seq: Sequence | null = null

  constructor(
    private readonly board: BoardConfig,
    private readonly hooks: ControllerHooks = {},
  ) {
    this.snakes = board.snakes.map((s) => {
      const p = snakePath(s)
      return { active: false, head: p.restHead.clone(), yaw: p.restYaw, pitch: 0, jaw: 0, tongue: 0 }
    })
  }

  get isPlaying(): boolean {
    return this.seq !== null
  }

  /** Adopt the authoritative logical positions from the rules engine. */
  sync(players: Player[]): void {
    this.order = players.map((p) => p.id)
    for (const p of players) this.positions.set(p.id, p.position)
    for (const p of players) {
      if (!this.characters.has(p.id)) {
        this.characters.set(p.id, {
          id: p.id,
          position: this.restPosition(p.id),
          yaw: 0,
          pose: 'idle',
          poseTime: Math.random() * 3,
          lean: 0,
          busy: false,
          idleTime: 0,
        })
      }
    }
  }

  /** Where a character stands on a square, spreading out players who share it. */
  restPosition(id: string, square = this.positions.get(id) ?? 0): Vector3 {
    const base = squareToWorld(square)
    if (square === 0) return base.add(START_SLOTS[Math.max(0, this.order.indexOf(id)) % START_SLOTS.length])
    const occupants = this.order.filter((o) => (o === id ? square : this.positions.get(o)) === square)
    if (occupants.length <= 1) return base
    const angle = Math.PI / 4 + (occupants.indexOf(id) / occupants.length) * Math.PI * 2
    return base.add(new Vector3(Math.cos(angle) * SHARED_RADIUS, 0, Math.sin(angle) * SHARED_RADIUS))
  }

  update(dt: number): void {
    const seq = this.seq
    if (seq) {
      seq.step(dt)
      if (seq.done && this.seq === seq) this.seq = null
    }
    this.shake = Math.max(0, this.shake - dt * 2.4)
    if (this.impact) {
      this.impact.age += dt
      if (this.impact.age > 1) this.impact = null
    }
    for (const v of this.characters.values()) {
      v.poseTime += dt
      if (v.busy) continue
      const rest = this.restPosition(v.id)
      const dx = rest.x - v.position.x
      const dz = rest.z - v.position.z
      const shuffling = dx * dx + dz * dz > 0.0016
      v.position.lerp(rest, dampFactor(3.5, dt))
      v.lean += (0 - v.lean) * dampFactor(8, dt)
      if (shuffling) {
        this.setPose(v, 'walk')
        this.turnTowards(v, dx, dz, dt, 10)
        v.idleTime = 0
      } else {
        this.setPose(v, 'idle')
        v.idleTime += dt
        // After settling, turn to face the viewer so faces stay readable.
        if (v.idleTime > 1.4) v.yaw = lerpAngle(v.yaw, 0, dampFactor(1.6, dt))
      }
    }
  }

  cancel(): void {
    this.seq?.cancel()
    this.seq = null
    for (const v of this.characters.values()) {
      v.busy = false
      v.lean = 0
      this.setPose(v, 'idle')
    }
    for (const s of this.snakes) s.active = false
    this.focus = null
    this.hooks.stage?.('IDLE')
  }

  playMove(plan: TurnPlan, done: () => void): void {
    const v = this.character(plan.playerId)
    const tasks: Task[] = []
    if (plan.steps.length === 0) {
      tasks.push({ stage: 'MOVING_CHARACTER', duration: 0.65, start: () => (v.busy = true) })
    }
    if (plan.steps.length > 0) {
      // One continuous walk through every square: eases in and out once instead of
      // stopping at each square, legs keyed to distance so feet do not slide.
      let path = new WalkPath([])
      let lastSegment = 0
      const ahead = new Vector3()
      tasks.push({
        stage: 'MOVING_CHARACTER',
        duration: plan.steps.length * STEP_DURATION,
        start: () => {
          v.busy = true
          const points = plan.steps.map((square, i) =>
            i === plan.steps.length - 1 ? this.restPosition(v.id, square) : squareToWorld(square),
          )
          path = new WalkPath([v.position.clone(), ...points])
          lastSegment = 0
          this.setPose(v, 'walk')
        },
        update: (t, dt) => {
          const d = path.length * smoothTravel(t)
          path.pointAt(d, v.position)
          path.pointAt(d + 0.35, ahead) // look slightly ahead so corners are turned early
          this.turnTowards(v, ahead.x - v.position.x, ahead.z - v.position.z, dt, 7)
          v.poseTime = (d / CELL_SIZE) * STEP_DURATION
          const segment = path.segmentAt(d)
          if (segment > lastSegment) {
            lastSegment = segment
            this.sound('step')
          }
        },
        end: () => this.sound('step'),
      })
    }
    tasks.push({
      duration: 0.25,
      start: () => {
        this.setPose(v, 'idle')
        this.positions.set(v.id, plan.landed)
      },
      end: () => this.release(v),
    })
    this.play(tasks, done)
  }

  playJump(plan: TurnPlan, done: () => void): void {
    if (plan.jump?.kind === 'snake') this.playSnake(plan, done)
    else if (plan.jump?.kind === 'ladder') this.playLadder(plan, done)
    else done()
  }

  celebrate(id: string): void {
    const v = this.characters.get(id)
    if (!v) return
    v.busy = true
    v.yaw = 0
    this.setPose(v, 'celebrate')
    this.focus = v.position.clone()
    this.hooks.stage?.('CELEBRATING')
    this.sound('win')
  }

  // ---------------------------------------------------------------- snake

  private playSnake(plan: TurnPlan, done: () => void): void {
    const index = this.board.snakes.findIndex((s) => s.head === plan.jump?.from)
    if (index < 0) return done()
    const v = this.character(plan.playerId)
    const snake = this.snakes[index]
    const path = snakePath(this.board.snakes[index])

    const start = new Vector3()
    const raised = new Vector3()
    const pulled = new Vector3()
    const contact = new Vector3()
    const chest = new Vector3()
    const home = new Vector3()
    const toSnake = new Vector3()
    const from = new Vector3()
    const to = new Vector3()
    let startYaw = 0
    let strikeYaw = 0
    let strikePitch = 0
    let slide: CatmullRomCurve3 | null = null
    const slideDuration = Math.min(3.8, Math.max(1.6, path.length / 2))

    const tasks: Task[] = [
      {
        // Notice the player: head rises, neck bends, tongue flicks.
        stage: 'SNAKE_TURNING',
        duration: 0.6,
        start: () => {
          v.busy = true
          snake.active = true
          start.copy(snake.head)
          startYaw = snake.yaw
          home.copy(v.position)
          chest.copy(v.position).setY(v.position.y + 0.36)
          raised.copy(path.restHead).lerp(path.neckBase, 0.35).setY(BOARD_TOP_Y + 0.44)
          strikeYaw = yawTowards(chest.x - raised.x, chest.z - raised.z)
          this.focus = home.clone()
          this.sound('hiss')
        },
        update: (t, dt) => {
          const e = easeOutCubic(t)
          snake.head.lerpVectors(start, raised, e)
          snake.yaw = lerpAngle(startYaw, strikeYaw, e)
          snake.pitch = -0.25 * e
          snake.jaw = 0.08
          snake.tongue = Math.max(0, Math.sin(t * Math.PI * 4))
          this.turnTowards(v, raised.x - v.position.x, raised.z - v.position.z, dt, 7)
        },
      },
      {
        // Prepare: jaw opens, head draws back into an attack posture.
        stage: 'SNAKE_PREPARING_BITE',
        duration: 0.5,
        start: () => {
          toSnake.copy(raised).sub(chest).setY(0).normalize()
          pulled.copy(raised).addScaledVector(toSnake, 0.17)
          pulled.y += 0.06
        },
        update: (t) => {
          const e = easeOutCubic(t)
          snake.head.lerpVectors(raised, pulled, e)
          snake.head.x += Math.sin(t * 70) * 0.004 * t
          snake.jaw = lerp(0.08, 1, e)
          snake.tongue = 0
          snake.pitch = lerp(-0.25, 0.12, e)
        },
      },
      {
        // Strike: fast accelerating lunge aimed at the character's actual position.
        stage: 'SNAKE_STRIKING',
        duration: 0.16,
        start: () => {
          contact.copy(chest).addScaledVector(toSnake, 0.13)
          const d = contact.clone().sub(pulled)
          strikePitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
          this.sound('whoosh')
        },
        update: (t) => {
          snake.head.lerpVectors(pulled, contact, easeInQuad(t))
          snake.pitch = lerp(0.12, strikePitch, t)
          snake.jaw = 1
        },
      },
      {
        // Impact: jaws snap shut, camera shake, spark, character recoils.
        stage: 'CHARACTER_REACTING',
        duration: 0.55,
        start: () => {
          snake.jaw = 0.04
          this.shake = 1
          this.impact = { position: contact.clone(), age: 0 }
          this.sound('bite')
          this.setPose(v, 'hit')
        },
        update: (t) => {
          v.position.copy(home).addScaledVector(toSnake, -0.11 * Math.sin(Math.PI * Math.min(1, t * 1.5)))
          snake.jaw = t < 0.35 ? 0.04 : lerp(0.04, 0.55, (t - 0.35) / 0.65)
        },
      },
      {
        // Retract back to the resting pose.
        duration: 0.45,
        update: (t) => {
          const e = easeInOutCubic(t)
          snake.head.lerpVectors(contact, path.restHead, e)
          snake.yaw = lerpAngle(strikeYaw, path.restYaw, e)
          snake.pitch = lerp(strikePitch, 0, e)
          snake.jaw = lerp(0.55, 0, e)
        },
        end: () => {
          snake.active = false
        },
      },
      {
        // Slide down the actual body curve to the tail.
        stage: 'SLIDING_DOWN_SNAKE',
        duration: slideDuration,
        start: () => {
          const ride = path.curve
            .getSpacedPoints(Math.max(8, Math.ceil(path.length * 3)))
            .map((p) => p.setY(p.y + SNAKE_RADIUS * 0.9))
          slide = new CatmullRomCurve3([v.position.clone(), ...ride], false, 'centripetal')
          this.setPose(v, 'slide')
          this.sound('slither')
        },
        update: (t, dt) => {
          if (!slide) return
          const u = easeInOutSine(t)
          slide.getPointAt(u, v.position)
          const tangent = slide.getTangentAt(u)
          this.turnTowards(v, tangent.x, tangent.z, dt, 12)
          this.focus?.copy(v.position)
        },
      },
      this.hopTask(v, from, to, plan.final),
      this.finishTask(v, plan.final),
    ]
    this.play(tasks, done)
  }

  // ---------------------------------------------------------------- ladder

  private playLadder(plan: TurnPlan, done: () => void): void {
    const ladder = this.board.ladders.find((l) => l.bottom === plan.jump?.from)
    if (!ladder) return done()
    const v = this.character(plan.playerId)
    const path = ladderPath(ladder)
    const from = new Vector3()
    const to = new Vector3()
    const climbDuration = Math.min(3.8, Math.max(1.4, path.length / 1.1))
    const rungs = Math.max(2, Math.floor(path.length / 0.2))
    let lastRung = -1
    let startYaw = 0

    const tasks: Task[] = [
      {
        // Turn to face the ladder.
        stage: 'CLIMBING_LADDER',
        duration: 0.3,
        start: () => {
          v.busy = true
          startYaw = v.yaw
          this.focus = path.foot.clone()
        },
        update: (t) => (v.yaw = lerpAngle(startYaw, path.yaw, easeInOutSine(t))),
      },
      {
        // Step into the climbing position.
        duration: 0.3,
        start: () => {
          from.copy(v.position)
          this.setPose(v, 'walk')
        },
        update: (t) => v.position.lerpVectors(from, path.foot, easeInOutSine(t)),
      },
      {
        // Climb rung by rung, aligned with the rails.
        duration: climbDuration,
        start: () => {
          this.setPose(v, 'climb')
          v.lean = path.pitch
          lastRung = -1
        },
        update: (t) => {
          v.position.lerpVectors(path.foot, path.topEnd, t)
          v.yaw = path.yaw
          const rung = Math.floor(t * rungs)
          if (rung !== lastRung) {
            lastRung = rung
            if (rung % 2 === 0) this.sound('climb')
          }
          this.focus?.copy(v.position)
        },
      },
      this.hopTask(v, from, to, plan.final),
      this.finishTask(v, plan.final),
    ]
    this.play(tasks, done)
  }

  // ---------------------------------------------------------------- helpers

  private hopTask(v: CharacterVisual, from: Vector3, to: Vector3, square: number): Task {
    return {
      stage: 'RESTORING_CHARACTER',
      duration: 0.55,
      start: () => {
        from.copy(v.position)
        to.copy(this.restPosition(v.id, square))
        this.setPose(v, 'hop')
      },
      update: (t, dt) => {
        v.position.lerpVectors(from, to, easeInOutSine(t))
        v.position.y = lerp(from.y, to.y, t) + Math.sin(Math.PI * t) * 0.28
        v.lean = lerp(v.lean, 0, dampFactor(12, dt))
        this.turnTowards(v, to.x - from.x, to.z - from.z, dt, 10)
      },
      end: () => {
        v.position.copy(to)
        this.sound('land')
        this.setPose(v, 'idle')
      },
    }
  }

  private finishTask(v: CharacterVisual, square: number): Task {
    return {
      duration: 0.2,
      start: () => this.positions.set(v.id, square),
      end: () => {
        this.release(v)
        this.focus = null
      },
    }
  }

  private release(v: CharacterVisual): void {
    v.busy = false
    v.lean = 0
    v.idleTime = 0
  }

  private play(tasks: Task[], done: () => void): void {
    this.seq?.cancel()
    this.seq = new Sequence(
      tasks,
      () => {
        this.hooks.stage?.('IDLE')
        done()
      },
      (stage) => this.hooks.stage?.(stage),
    )
  }

  private character(id: string): CharacterVisual {
    const v = this.characters.get(id)
    if (!v) throw new Error(`Unknown character ${id}`)
    return v
  }

  private setPose(v: CharacterVisual, pose: Pose): void {
    if (v.pose === pose) return
    v.pose = pose
    v.poseTime = 0
  }

  private turnTowards(v: CharacterVisual, dx: number, dz: number, dt: number, rate: number): void {
    if (dx * dx + dz * dz < 1e-8) return
    v.yaw = lerpAngle(v.yaw, yawTowards(dx, dz), dampFactor(rate, dt))
  }

  private sound(name: SoundName): void {
    this.hooks.sound?.(name)
  }
}
