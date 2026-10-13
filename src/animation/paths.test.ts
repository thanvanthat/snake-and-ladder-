import { DEFAULT_BOARD } from '../game/boardConfig'
import { BOARD_TOP_Y, squareToWorld } from '../game/boardCoordinates'
import { ladderPath, snakePath } from './paths'

const flat = (v: { x: number; z: number }, w: { x: number; z: number }) => Math.hypot(v.x - w.x, v.z - w.z)

describe('snake geometry uses the shared board coordinates', () => {
  it.each(DEFAULT_BOARD.snakes)('snake $head -> $tail connects its squares', (snake) => {
    const p = snakePath(snake)
    const head = squareToWorld(snake.head)
    const tail = squareToWorld(snake.tail)
    expect(flat(p.restHead, head)).toBeLessThan(0.3) // head rests on its square
    expect(flat(p.curve.getPointAt(0), head)).toBeLessThan(0.5) // body starts at the head square
    expect(flat(p.curve.getPointAt(1), tail)).toBeLessThan(0.15) // tail ends on its square
    expect(p.curve.getPointAt(0.5).y).toBeGreaterThan(BOARD_TOP_Y) // body rests above the cells
  })
})

describe('ladder geometry uses the shared board coordinates', () => {
  it.each(DEFAULT_BOARD.ladders)('ladder $bottom -> $top connects its squares', (ladder) => {
    const p = ladderPath(ladder)
    expect(flat(p.foot, squareToWorld(ladder.bottom))).toBeLessThan(0.35)
    expect(flat(p.topEnd, squareToWorld(ladder.top))).toBeLessThan(0.35)
    expect(p.foot.y).toBeCloseTo(BOARD_TOP_Y)
    expect(p.topEnd.y).toBeGreaterThan(BOARD_TOP_Y)
    expect(p.pitch).toBeGreaterThan(0)
  })
})
