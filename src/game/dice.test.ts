import { Vector3 } from 'three'
import { DICE_FACE_NORMALS, diceFaceQuaternion, PIP_LAYOUT, rollDie } from './dice'

describe('rollDie', () => {
  it('always returns an integer from 1 to 6', () => {
    for (let i = 0; i < 5000; i++) {
      const v = rollDie()
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
    }
  })

  it('produces every face with roughly equal frequency', () => {
    const counts = [0, 0, 0, 0, 0, 0]
    const n = 60000
    for (let i = 0; i < n; i++) counts[rollDie() - 1]++
    for (const c of counts) expect(Math.abs(c - n / 6)).toBeLessThan(n / 6 * 0.06)
  })

  it('rejects biased bytes (>= 252) instead of wrapping', () => {
    const bytes = [255, 253, 252, 3]
    expect(rollDie(() => bytes.shift() ?? 0)).toBe(4)
  })

  it('falls back to Math.random when crypto is unavailable', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.999)
    expect(rollDie(() => null)).toBe(6)
    spy.mockRestore()
  })
})

describe('3D dice faces', () => {
  it('has opposite faces summing to 7 and the right pip counts', () => {
    for (let v = 1; v <= 6; v++) {
      const n = new Vector3(...DICE_FACE_NORMALS[v])
      const opposite = new Vector3(...DICE_FACE_NORMALS[7 - v])
      expect(n.dot(opposite)).toBeCloseTo(-1)
      expect(PIP_LAYOUT[v]).toHaveLength(v)
    }
  })

  it('puts the generated value on top (+Y), so the display always matches the engine', () => {
    for (let v = 1; v <= 6; v++) {
      for (const yaw of [0, 1.1, 2.7, 4.4, 6]) {
        const up = new Vector3(...DICE_FACE_NORMALS[v]).applyQuaternion(diceFaceQuaternion(v, yaw))
        expect(up.x).toBeCloseTo(0)
        expect(up.y).toBeCloseTo(1)
        expect(up.z).toBeCloseTo(0)
      }
    }
  })

  it('a random settle angle never changes which face is on top', () => {
    const a = diceFaceQuaternion(5, 0)
    const b = diceFaceQuaternion(5, 2.3)
    expect(a.angleTo(b)).toBeGreaterThan(0.1) // different orientation...
    for (let v = 1; v <= 6; v++) {
      if (v === 5) continue
      // ...yet no other face points up
      expect(new Vector3(...DICE_FACE_NORMALS[v]).applyQuaternion(b).y).toBeLessThan(0.5)
    }
  })

  it('rejects invalid values', () => {
    expect(() => diceFaceQuaternion(0)).toThrow()
    expect(() => diceFaceQuaternion(7)).toThrow()
  })
})
