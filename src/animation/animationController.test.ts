import { DEFAULT_BOARD } from '../game/boardConfig'
import { createGame, planTurn } from '../game/gameEngine'
import type { AnimationStage, Player } from '../game/gameTypes'
import { AnimationController, Sequence, type SoundName } from './animationController'

function players(positions: number[]): Player[] {
  return createGame([
    { name: 'Ava', colorId: 'crimson', isComputer: false },
    { name: 'Leo', colorId: 'azure', isComputer: false },
  ]).players.map((p, i) => ({ ...p, position: positions[i] }))
}

/** Advance in 1/60 s frames for up to `seconds`. */
function run(c: AnimationController, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 60) c.update(1 / 60)
}

describe('Sequence', () => {
  it('runs tasks in order and fires completion exactly once', () => {
    const log: string[] = []
    const done = vi.fn()
    const seq = new Sequence(
      [
        { duration: 0.5, start: () => log.push('a'), end: () => log.push('a-end') },
        { duration: 0, start: () => log.push('b') },
        { duration: 0.25, start: () => log.push('c') },
      ],
      done,
    )
    seq.step(0.4)
    expect(log).toEqual(['a'])
    seq.step(0.2) // crosses into b (instant) and c
    expect(log).toEqual(['a', 'a-end', 'b', 'c'])
    expect(done).not.toHaveBeenCalled()
    seq.step(1)
    seq.step(1)
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('does not advance while paused (dt = 0)', () => {
    const done = vi.fn()
    const seq = new Sequence([{ duration: 0.1 }], done)
    for (let i = 0; i < 100; i++) seq.step(0)
    expect(done).not.toHaveBeenCalled()
  })

  it('never fires completion after cancel', () => {
    const done = vi.fn()
    const seq = new Sequence([{ duration: 0.1 }], done)
    seq.cancel()
    seq.step(1)
    expect(done).not.toHaveBeenCalled()
  })
})

describe('AnimationController', () => {
  it('walks the character square by square and ends on the landing square', () => {
    const c = new AnimationController(DEFAULT_BOARD)
    c.sync(players([0, 0]))
    const plan = planTurn('p1', 0, 3, DEFAULT_BOARD)
    const done = vi.fn()
    c.playMove(plan, done)
    run(c, 0.5)
    expect(done).not.toHaveBeenCalled()
    run(c, 2)
    expect(done).toHaveBeenCalledTimes(1)
    const v = c.characters.get('p1')!
    expect(v.position.distanceTo(c.restPosition('p1', 3))).toBeLessThan(1e-6)
  })

  it('plays the full bite sequence in order and lands on the tail', () => {
    const stages: AnimationStage[] = []
    const sounds: SoundName[] = []
    const c = new AnimationController(DEFAULT_BOARD, { stage: (s) => stages.push(s), sound: (s) => sounds.push(s) })
    c.sync(players([16, 0])) // standing on snake head 16 after walking
    const plan = planTurn('p1', 12, 4, DEFAULT_BOARD)
    const done = vi.fn()
    c.playJump(plan, done)
    run(c, 1.2)
    expect(done).not.toHaveBeenCalled() // next turn waits for the animation
    run(c, 8)
    expect(done).toHaveBeenCalledTimes(1)
    expect(stages.filter((s) => s !== 'IDLE')).toEqual([
      'SNAKE_TURNING',
      'SNAKE_PREPARING_BITE',
      'SNAKE_STRIKING',
      'CHARACTER_REACTING',
      'SLIDING_DOWN_SNAKE',
      'RESTORING_CHARACTER',
    ])
    expect(sounds.filter((s) => s === 'bite')).toHaveLength(1) // bitten once per landing
    const v = c.characters.get('p1')!
    expect(v.position.distanceTo(c.restPosition('p1', 6))).toBeLessThan(0.02)
    expect(v.busy).toBe(false)
    expect(c.snakes[0].active).toBe(false)
  })

  it('aims the strike at the character', () => {
    const c = new AnimationController(DEFAULT_BOARD)
    c.sync(players([16, 0]))
    c.playJump(planTurn('p1', 12, 4, DEFAULT_BOARD), () => {})
    run(c, 0.6 + 0.5 + 0.16) // through the strike
    const head = c.snakes[0].head
    const chest = c.characters.get('p1')!.position.clone().setY(c.characters.get('p1')!.position.y + 0.36)
    expect(head.distanceTo(chest)).toBeLessThan(0.2)
  })

  it('climbs a ladder and ends exactly on the top square', () => {
    const c = new AnimationController(DEFAULT_BOARD)
    c.sync(players([4, 0]))
    const done = vi.fn()
    c.playJump(planTurn('p1', 0, 4, DEFAULT_BOARD), done)
    run(c, 6)
    expect(done).toHaveBeenCalledTimes(1)
    expect(c.characters.get('p1')!.position.distanceTo(c.restPosition('p1', 14))).toBeLessThan(0.02)
  })

  it('cancel stops the sequence without completing it', () => {
    const c = new AnimationController(DEFAULT_BOARD)
    c.sync(players([0, 0]))
    const done = vi.fn()
    c.playMove(planTurn('p1', 0, 5, DEFAULT_BOARD), done)
    run(c, 0.4)
    c.cancel()
    run(c, 5)
    expect(done).not.toHaveBeenCalled()
    expect(c.isPlaying).toBe(false)
    expect(c.characters.get('p1')!.busy).toBe(false)
  })

  it('spreads out players sharing a square', () => {
    const c = new AnimationController(DEFAULT_BOARD)
    c.sync(players([20, 20]))
    expect(c.restPosition('p1').distanceTo(c.restPosition('p2'))).toBeGreaterThan(0.3)
  })
})

describe('natural walking', () => {
  it('eases in and out but covers the whole distance', async () => {
    const { smoothTravel } = await import('./animationController')
    expect(smoothTravel(0)).toBe(0)
    expect(smoothTravel(1)).toBe(1)
    expect(smoothTravel(0.5)).toBeCloseTo(0.5)
    // slow start: less ground covered in the first 10% than a constant pace would
    expect(smoothTravel(0.1)).toBeLessThan(0.1)
    for (let t = 0; t < 1; t += 0.01) expect(smoothTravel(t + 0.01)).toBeGreaterThanOrEqual(smoothTravel(t))
  })

  it('walks through corners without leaving the square centres path', async () => {
    const { WalkPath } = await import('./animationController')
    const { Vector3 } = await import('three')
    const path = new WalkPath([new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(1, 0, -1)])
    expect(path.length).toBeCloseTo(2)
    expect(path.pointAt(1.5, new Vector3()).toArray()).toEqual([1, 0, -0.5])
    expect(path.segmentAt(0.5)).toBe(0)
    expect(path.segmentAt(1.5)).toBe(1)
  })
})
