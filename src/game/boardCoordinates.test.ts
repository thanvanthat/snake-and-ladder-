import { BOARD_HALF, BOARD_TOP_Y, CELL_SIZE, gridToSquare, squareToGrid, squareToWorld, START_PAD_CENTER } from './boardCoordinates'

describe('square numbering', () => {
  it('puts the four corners in the traditional places', () => {
    expect(squareToGrid(1)).toEqual({ row: 0, col: 0 }) // bottom-left
    expect(squareToGrid(10)).toEqual({ row: 0, col: 9 }) // bottom-right
    expect(squareToGrid(91)).toEqual({ row: 9, col: 9 }) // top-right
    expect(squareToGrid(100)).toEqual({ row: 9, col: 0 }) // top-left
  })

  it('snakes back and forth at every row transition', () => {
    expect(squareToGrid(11)).toEqual({ row: 1, col: 9 })
    expect(squareToGrid(20)).toEqual({ row: 1, col: 0 })
    expect(squareToGrid(21)).toEqual({ row: 2, col: 0 })
    expect(squareToGrid(30)).toEqual({ row: 2, col: 9 })
    for (let s = 1; s < 100; s++) {
      const a = squareToGrid(s)
      const b = squareToGrid(s + 1)
      // Consecutive squares are always orthogonal neighbours.
      expect(Math.abs(a.row - b.row) + Math.abs(a.col - b.col)).toBe(1)
    }
  })

  it('maps all 100 squares to distinct cells and back', () => {
    const seen = new Set<string>()
    for (let s = 1; s <= 100; s++) {
      const cell = squareToGrid(s)
      seen.add(`${cell.row},${cell.col}`)
      expect(gridToSquare(cell)).toBe(s)
    }
    expect(seen.size).toBe(100)
  })

  it('rejects squares that are not on the board', () => {
    expect(() => squareToGrid(0)).toThrow(RangeError)
    expect(() => squareToGrid(101)).toThrow(RangeError)
    expect(() => squareToGrid(2.5)).toThrow(RangeError)
  })
})

describe('world coordinates', () => {
  it('places square centres on the board surface', () => {
    const one = squareToWorld(1)
    expect(one.x).toBeCloseTo(-BOARD_HALF + CELL_SIZE / 2)
    expect(one.z).toBeCloseTo(BOARD_HALF - CELL_SIZE / 2)
    expect(one.y).toBe(BOARD_TOP_Y)
    const hundred = squareToWorld(100)
    expect(hundred.x).toBeCloseTo(-BOARD_HALF + CELL_SIZE / 2)
    expect(hundred.z).toBeCloseTo(-BOARD_HALF + CELL_SIZE / 2)
    expect(squareToWorld(10).x).toBeCloseTo(BOARD_HALF - CELL_SIZE / 2)
  })

  it('spaces neighbouring squares one cell apart', () => {
    expect(squareToWorld(1).distanceTo(squareToWorld(2))).toBeCloseTo(CELL_SIZE)
    expect(squareToWorld(10).distanceTo(squareToWorld(11))).toBeCloseTo(CELL_SIZE)
  })

  it('maps position 0 to the off-board start pad', () => {
    const start = squareToWorld(0)
    expect(start.equals(START_PAD_CENTER)).toBe(true)
    expect(Math.abs(start.x)).toBeGreaterThan(BOARD_HALF)
  })

  it('returns a fresh vector each call', () => {
    const a = squareToWorld(5)
    a.x = 999
    expect(squareToWorld(5).x).not.toBe(999)
  })
})
