/**
 * Procedural pose library for the humanoid rig. Pure functions: pose + time -> joint angles.
 *
 * Angle conventions (rotation about the joint's local X unless noted):
 *  - hips / shoulders: negative swings the limb forward, positive backward
 *  - knees: positive bends the shin back; elbows: negative bends the forearm forward
 *  - spine / head X: positive leans forward / looks down
 *  - shoulder Z: positive raises the arm away from the body (mirrored per side by the rig)
 */

export type Pose = 'idle' | 'walk' | 'climb' | 'hit' | 'slide' | 'hop' | 'celebrate'

export interface Joints {
  hipL: number
  hipR: number
  kneeL: number
  kneeR: number
  shoulderL: number
  shoulderR: number
  armOutL: number
  armOutR: number
  elbowL: number
  elbowR: number
  spine: number
  headX: number
  headY: number
  bob: number
}

export const STEP_DURATION = 0.5

export const zeroJoints = (): Joints => ({
  hipL: 0, hipR: 0, kneeL: 0, kneeR: 0,
  shoulderL: 0, shoulderR: 0, armOutL: 0.1, armOutR: 0.1,
  elbowL: -0.15, elbowR: -0.15,
  spine: 0, headX: 0, headY: 0, bob: 0,
})

export function computePose(pose: Pose, t: number, out: Joints = zeroJoints()): Joints {
  switch (pose) {
    case 'idle': {
      const breathe = Math.sin(t * 2.1)
      Object.assign(out, zeroJoints())
      out.spine = 0.02 * breathe
      out.armOutL = out.armOutR = 0.09 + 0.025 * breathe
      out.shoulderL = 0.04 * Math.sin(t * 1.1)
      out.shoulderR = -0.04 * Math.sin(t * 1.1)
      out.headY = 0.35 * Math.sin(t * 0.45) * Math.sin(t * 0.17)
      out.headX = -0.04 + 0.03 * Math.sin(t * 0.7)
      out.bob = 0.004 * breathe
      return out
    }
    case 'walk': {
      const ph = (t / STEP_DURATION) * Math.PI * 2
      const s = Math.sin(ph)
      out.hipL = -0.6 * s
      out.hipR = 0.6 * s
      out.kneeL = 0.15 + 0.75 * Math.max(0, Math.sin(ph + Math.PI * 0.6))
      out.kneeR = 0.15 + 0.75 * Math.max(0, Math.sin(ph + Math.PI * 1.6))
      out.shoulderL = 0.55 * s
      out.shoulderR = -0.55 * s
      out.armOutL = out.armOutR = 0.08
      out.elbowL = out.elbowR = -0.45
      out.spine = 0.1
      out.headX = -0.05
      out.headY = 0
      out.bob = 0.014 * Math.abs(Math.cos(ph))
      return out
    }
    case 'climb': {
      const s = Math.sin(t * 6.5)
      out.shoulderL = -2.5 + 0.45 * s
      out.shoulderR = -2.5 - 0.45 * s
      out.armOutL = out.armOutR = 0.15
      out.elbowL = -0.35 - 0.3 * Math.max(0, s)
      out.elbowR = -0.35 - 0.3 * Math.max(0, -s)
      out.hipL = -0.5 - 0.5 * s
      out.hipR = -0.5 + 0.5 * s
      out.kneeL = 0.95 + 0.45 * s
      out.kneeR = 0.95 - 0.45 * s
      out.spine = 0.3
      out.headX = -0.35
      out.headY = 0
      out.bob = 0.01 * Math.abs(s)
      return out
    }
    case 'hit': {
      const k = Math.exp(-t * 4.5)
      const shake = Math.sin(t * 42) * 0.06 * k
      out.spine = -0.55 * k + shake
      out.headX = -0.45 * k
      out.headY = shake * 2
      out.shoulderL = out.shoulderR = -0.9 * k
      out.armOutL = out.armOutR = 0.1 + 1.25 * k
      out.elbowL = out.elbowR = -0.9 * k - 0.15
      out.hipL = -0.25 * k
      out.hipR = 0.15 * k
      out.kneeL = out.kneeR = 0.35 * k
      out.bob = -0.02 * k
      return out
    }
    case 'slide': {
      const wave = Math.sin(t * 13) * 0.18
      out.hipL = out.hipR = -1.45
      out.kneeL = out.kneeR = 0.25
      out.spine = -0.3
      out.headX = 0.1
      out.headY = 0
      out.shoulderL = -2.7 + wave
      out.shoulderR = -2.7 - wave
      out.armOutL = out.armOutR = 0.45
      out.elbowL = out.elbowR = -0.25
      out.bob = -0.11
      return out
    }
    case 'hop': {
      out.hipL = out.hipR = -0.6
      out.kneeL = out.kneeR = 1.0
      out.shoulderL = out.shoulderR = -1.3
      out.armOutL = out.armOutR = 0.5
      out.elbowL = out.elbowR = -0.3
      out.spine = 0.15
      out.headX = 0.1
      out.headY = 0
      out.bob = 0
      return out
    }
    case 'celebrate': {
      const jump = Math.abs(Math.sin(t * 5.5))
      const wave = Math.sin(t * 11) * 0.3
      out.shoulderL = -2.85 + wave
      out.shoulderR = -2.85 - wave
      out.armOutL = out.armOutR = 0.35
      out.elbowL = out.elbowR = -0.2
      out.hipL = out.hipR = -0.25 * (1 - jump)
      out.kneeL = out.kneeR = 0.5 * (1 - jump)
      out.spine = -0.12
      out.headX = -0.25
      out.headY = 0.2 * Math.sin(t * 2.7)
      out.bob = 0.13 * jump
      return out
    }
  }
}

/** Frame-rate independent blend of `current` towards `target`. */
export function blendJoints(current: Joints, target: Joints, alpha: number): void {
  for (const key of Object.keys(target) as (keyof Joints)[]) {
    current[key] += (target[key] - current[key]) * alpha
  }
}
