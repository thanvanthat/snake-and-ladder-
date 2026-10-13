import { FINAL_SQUARE, type BoardConfig, type Jump } from './gameTypes'

/** A classic layout (subset of the traditional Milton Bradley board). */
export const DEFAULT_BOARD: BoardConfig = {
  snakes: [
    { head: 16, tail: 6 },
    { head: 47, tail: 26 },
    { head: 49, tail: 11 },
    { head: 62, tail: 19 },
    { head: 87, tail: 24 },
    { head: 93, tail: 73 },
    { head: 95, tail: 75 },
    { head: 98, tail: 78 },
  ],
  ladders: [
    { bottom: 4, top: 14 },
    { bottom: 9, top: 31 },
    { bottom: 21, top: 42 },
    { bottom: 28, top: 84 },
    { bottom: 36, top: 44 },
    { bottom: 51, top: 67 },
    { bottom: 71, top: 91 },
    { bottom: 80, top: 100 },
  ],
}

/** Returns a list of problems; an empty list means the board is playable. */
export function validateBoard(board: BoardConfig): string[] {
  const errors: string[] = []
  const entries = new Map<number, string>()
  const onBoard = (n: number) => Number.isInteger(n) && n >= 1 && n <= FINAL_SQUARE

  const claim = (square: number, label: string) => {
    if (entries.has(square)) errors.push(`${label} starts on square ${square}, already used by ${entries.get(square)}`)
    entries.set(square, label)
  }

  for (const { head, tail } of board.snakes) {
    const label = `snake ${head}->${tail}`
    if (!onBoard(head) || !onBoard(tail)) errors.push(`${label} is off the board`)
    if (head <= tail) errors.push(`${label} must go down`)
    if (head === FINAL_SQUARE) errors.push(`${label} cannot start on the final square`)
    claim(head, label)
  }
  for (const { bottom, top } of board.ladders) {
    const label = `ladder ${bottom}->${top}`
    if (!onBoard(bottom) || !onBoard(top)) errors.push(`${label} is off the board`)
    if (top <= bottom) errors.push(`${label} must go up`)
    claim(bottom, label)
  }
  // No chained jumps: a destination must not be another jump's entry.
  for (const { tail } of board.snakes) if (entries.has(tail)) errors.push(`snake tail ${tail} lands on ${entries.get(tail)}`)
  for (const { top } of board.ladders) if (entries.has(top)) errors.push(`ladder top ${top} lands on ${entries.get(top)}`)
  return errors
}

export function findJump(board: BoardConfig, square: number): Jump | null {
  const snake = board.snakes.find((s) => s.head === square)
  if (snake) return { kind: 'snake', from: snake.head, to: snake.tail }
  const ladder = board.ladders.find((l) => l.bottom === square)
  if (ladder) return { kind: 'ladder', from: ladder.bottom, to: ladder.top }
  return null
}
