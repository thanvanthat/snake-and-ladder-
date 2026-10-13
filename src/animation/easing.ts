export const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const easeInQuad = (t: number) => t * t
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2
export const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

/** Shortest signed difference between two angles. */
export function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}

export const lerpAngle = (a: number, b: number, t: number) => a + angleDelta(a, b) * t

/** Frame-rate independent exponential smoothing factor. */
export const dampFactor = (lambda: number, dt: number) => 1 - Math.exp(-lambda * dt)

export const yawTowards = (dx: number, dz: number) => Math.atan2(dx, dz)
