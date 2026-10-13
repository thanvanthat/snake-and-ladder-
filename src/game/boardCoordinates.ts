import { Vector3 } from 'three'
import { FINAL_SQUARE } from './gameTypes'

/**
 * The single source of truth for where squares live in the 3D world.
 * Every component (cells, labels, characters, snakes, ladders, effects) goes through here.
 *
 * World layout: board centred on the origin, +X to the right, +Z towards the default camera,
 * so row 0 (squares 1-10) is the row nearest the viewer.
 */
export const GRID = 10
export const CELL_SIZE = 1
export const BOARD_HALF = (GRID * CELL_SIZE) / 2
/** Height of the playable cell surface. */
export const BOARD_TOP_Y = 0.3
/** Off-board start pad (logical position 0), left of square 1. */
export const START_PAD_CENTER = new Vector3(-BOARD_HALF - 1.05, BOARD_TOP_Y, BOARD_HALF - CELL_SIZE / 2)

export interface GridCell {
  row: number // 0 = bottom row
  col: number // 0 = left column
}

export function squareToGrid(square: number): GridCell {
  if (!Number.isInteger(square) || square < 1 || square > FINAL_SQUARE) {
    throw new RangeError(`Square ${square} is not on the board`)
  }
  const index = square - 1
  const row = Math.floor(index / GRID)
  const offset = index % GRID
  // Serpentine: even rows run left->right, odd rows right->left.
  const col = row % 2 === 0 ? offset : GRID - 1 - offset
  return { row, col }
}

export function gridToSquare({ row, col }: GridCell): number {
  const offset = row % 2 === 0 ? col : GRID - 1 - col
  return row * GRID + offset + 1
}

export function gridToWorld({ row, col }: GridCell, y = BOARD_TOP_Y): Vector3 {
  return new Vector3((col + 0.5) * CELL_SIZE - BOARD_HALF, y, BOARD_HALF - (row + 0.5) * CELL_SIZE)
}

/** World-space centre of a square's top surface. Square 0 maps to the start pad. */
export function squareToWorld(square: number, y = BOARD_TOP_Y): Vector3 {
  if (square === 0) return START_PAD_CENTER.clone().setY(y)
  return gridToWorld(squareToGrid(square), y)
}
