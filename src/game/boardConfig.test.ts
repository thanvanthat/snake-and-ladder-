import { DEFAULT_BOARD, findJump, validateBoard } from './boardConfig'

describe('board config', () => {
  it('ships a valid default board', () => {
    expect(validateBoard(DEFAULT_BOARD)).toEqual([])
  })

  it('has snakes going down and ladders going up, all on the board', () => {
    for (const s of DEFAULT_BOARD.snakes) {
      expect(s.head).toBeGreaterThan(s.tail)
      expect(s.head).toBeLessThan(100)
      expect(s.tail).toBeGreaterThanOrEqual(1)
    }
    for (const l of DEFAULT_BOARD.ladders) {
      expect(l.top).toBeGreaterThan(l.bottom)
      expect(l.top).toBeLessThanOrEqual(100)
      expect(l.bottom).toBeGreaterThanOrEqual(1)
    }
  })

  it('flags broken configurations', () => {
    expect(validateBoard({ snakes: [{ head: 10, tail: 20 }], ladders: [] })).not.toEqual([])
    expect(validateBoard({ snakes: [{ head: 100, tail: 2 }], ladders: [] })).not.toEqual([])
    expect(validateBoard({ snakes: [{ head: 30, tail: 5 }], ladders: [{ bottom: 30, top: 50 }] })).not.toEqual([])
    expect(validateBoard({ snakes: [{ head: 30, tail: 5 }], ladders: [{ bottom: 5, top: 50 }] })).not.toEqual([])
    expect(validateBoard({ snakes: [], ladders: [{ bottom: 0, top: 50 }] })).not.toEqual([])
  })

  it('finds jumps only on entry squares', () => {
    expect(findJump(DEFAULT_BOARD, 16)).toEqual({ kind: 'snake', from: 16, to: 6 })
    expect(findJump(DEFAULT_BOARD, 4)).toEqual({ kind: 'ladder', from: 4, to: 14 })
    expect(findJump(DEFAULT_BOARD, 6)).toBeNull() // a tail is not an entry
    expect(findJump(DEFAULT_BOARD, 14)).toBeNull() // a ladder top is not an entry
  })
})
