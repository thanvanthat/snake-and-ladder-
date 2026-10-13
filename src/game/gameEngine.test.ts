import { shouldComputerRoll } from './aiPlayer'
import { DEFAULT_BOARD } from './boardConfig'
import {
  canRoll,
  createGame,
  currentPlayer,
  diceSettled,
  movementFinished,
  planTurn,
  rollDice,
  settlePending,
  transitionFinished,
} from './gameEngine'
import type { GameState, PlayerSetup } from './gameTypes'

const TWO: PlayerSetup[] = [
  { name: 'Ava', colorId: 'crimson', isComputer: false },
  { name: 'Leo', colorId: 'azure', isComputer: false },
]

function at(state: GameState, positions: number[]): GameState {
  return { ...state, players: state.players.map((p, i) => ({ ...p, position: positions[i] ?? p.position })) }
}

/** Plays one full turn through every signal, as the UI would. */
function playTurn(state: GameState, roll: number): GameState {
  let s = rollDice(state, roll)
  s = diceSettled(s, s.rollId)
  s = movementFinished(s, s.rollId)
  if (s.phase === 'SNAKE_BITE' || s.phase === 'CLIMBING_LADDER') s = transitionFinished(s, s.rollId)
  return s
}

describe('createGame', () => {
  it('starts everyone at position 0 with the first player to move', () => {
    const g = createGame(TWO)
    expect(g.players.map((p) => p.position)).toEqual([0, 0])
    expect(g.phase).toBe('READY')
    expect(currentPlayer(g).name).toBe('Ava')
  })

  it('supports 2 to 4 players and rejects other counts', () => {
    expect(() => createGame(TWO.slice(0, 1))).toThrow()
    const four = [...TWO, { name: 'Maya', colorId: 'emerald', isComputer: false }, { name: 'Kai', colorId: 'amber', isComputer: false }] as PlayerSetup[]
    expect(createGame(four).players).toHaveLength(4)
    expect(() => createGame([...four, TWO[0]])).toThrow()
  })
})

describe('movement', () => {
  it('advances square by square by the rolled amount', () => {
    const plan = planTurn('p1', 30, 5, DEFAULT_BOARD)
    expect(plan.steps).toEqual([31, 32, 33, 34, 35])
    expect(plan.final).toBe(35)
    expect(plan.jump).toBeNull()
  })

  it('enters the board from position 0 onto square 1..6', () => {
    expect(planTurn('p1', 0, 2, DEFAULT_BOARD).final).toBe(2)
    expect(planTurn('p1', 0, 1, DEFAULT_BOARD).steps).toEqual([1])
  })

  it('stays in place when the roll overshoots 100', () => {
    const plan = planTurn('p1', 97, 5, DEFAULT_BOARD)
    expect(plan.overshoot).toBe(true)
    expect(plan.steps).toEqual([])
    expect(plan.final).toBe(97)
    expect(plan.won).toBe(false)
  })

  it('wins only with an exact roll to 100', () => {
    expect(planTurn('p1', 96, 4, DEFAULT_BOARD).won).toBe(true)
    expect(planTurn('p1', 99, 1, DEFAULT_BOARD).won).toBe(true)
    expect(planTurn('p1', 99, 2, DEFAULT_BOARD).won).toBe(false)
  })

  it('rejects impossible rolls', () => {
    expect(() => planTurn('p1', 0, 0, DEFAULT_BOARD)).toThrow()
    expect(() => planTurn('p1', 0, 7, DEFAULT_BOARD)).toThrow()
  })
})

describe('snakes', () => {
  it('landing on a head sends the player to the tail', () => {
    const plan = planTurn('p1', 12, 4, DEFAULT_BOARD) // lands on 16
    expect(plan.landed).toBe(16)
    expect(plan.jump).toEqual({ kind: 'snake', from: 16, to: 6 })
    expect(plan.final).toBe(6)
  })

  it('passing over a head does nothing', () => {
    const plan = planTurn('p1', 14, 4, DEFAULT_BOARD) // passes 16, lands on 18
    expect(plan.steps).toContain(16)
    expect(plan.jump).toBeNull()
    expect(plan.final).toBe(18)
  })

  it('waits in SNAKE_BITE for the animation, then moves to the tail and switches turn once', () => {
    let s = at(createGame(TWO), [12, 0])
    s = rollDice(s, 4)
    s = diceSettled(s, s.rollId)
    s = movementFinished(s, s.rollId)
    expect(s.phase).toBe('SNAKE_BITE')
    expect(s.players[0].position).toBe(16) // standing on the head while bitten
    expect(currentPlayer(s).id).toBe('p1') // next turn has not started
    expect(rollDice(s, 3)).toBe(s) // no roll during the bite

    const again = movementFinished(s, s.rollId)
    expect(again).toBe(s) // the bite can only be triggered once per landing

    s = transitionFinished(s, s.rollId)
    expect(s.players[0].position).toBe(6)
    expect(s.phase).toBe('READY')
    expect(currentPlayer(s).id).toBe('p2')
    expect(transitionFinished(s, s.rollId)).toBe(s) // no duplicate turn switching
    expect(s.history.at(-1)).toMatchObject({ event: 'snake', from: 12, to: 6, roll: 4 })
  })
})

describe('ladders', () => {
  it('landing on the bottom climbs to the top', () => {
    const plan = planTurn('p1', 0, 4, DEFAULT_BOARD)
    expect(plan.jump).toEqual({ kind: 'ladder', from: 4, to: 14 })
    expect(plan.final).toBe(14)
  })

  it('passing over the bottom does nothing', () => {
    const plan = planTurn('p1', 2, 4, DEFAULT_BOARD) // passes 4, lands on 6
    expect(plan.steps).toContain(4)
    expect(plan.jump).toBeNull()
    expect(plan.final).toBe(6)
  })

  it('ends on the exact top square after the climb', () => {
    const s = playTurn(createGame(TWO), 4)
    expect(s.players[0].position).toBe(14)
    expect(s.history.at(-1)?.event).toBe('ladder')
  })

  it('a ladder to 100 wins the game', () => {
    const s = playTurn(at(createGame(TWO), [76, 0]), 4) // 80 -> 100
    expect(s.phase).toBe('GAME_OVER')
    expect(s.winnerId).toBe('p1')
  })
})

describe('turns and state machine', () => {
  it('rotates players and wraps around', () => {
    let s = createGame([...TWO, { name: 'Maya', colorId: 'emerald', isComputer: false }])
    s = playTurn(s, 2)
    expect(currentPlayer(s).id).toBe('p2')
    s = playTurn(s, 2)
    expect(currentPlayer(s).id).toBe('p3')
    s = playTurn(s, 2)
    expect(currentPlayer(s).id).toBe('p1')
  })

  it('blocks extra rolls while a turn is in progress', () => {
    const rolled = rollDice(createGame(TWO), 3)
    expect(rolled.phase).toBe('ROLLING_DICE')
    expect(canRoll(rolled)).toBe(false)
    expect(rollDice(rolled, 5)).toBe(rolled)
    const moving = diceSettled(rolled, rolled.rollId)
    expect(rollDice(moving, 5)).toBe(moving)
  })

  it('ignores out-of-order or stale completion signals', () => {
    const rolled = rollDice(createGame(TWO), 3)
    expect(movementFinished(rolled, rolled.rollId)).toBe(rolled) // dice not settled yet
    expect(diceSettled(rolled, rolled.rollId - 1)).toBe(rolled) // stale roll id
    const moving = diceSettled(rolled, rolled.rollId)
    expect(diceSettled(moving, moving.rollId)).toBe(moving) // duplicate
  })

  it('an overshoot ends the turn without moving', () => {
    const s = playTurn(at(createGame(TWO), [98, 0]), 5)
    expect(s.players[0].position).toBe(98)
    expect(currentPlayer(s).id).toBe('p2')
    expect(s.history.at(-1)?.event).toBe('overshoot')
  })

  it('declares the winner and allows no more moves', () => {
    const s = playTurn(at(createGame(TWO), [97, 0]), 3)
    expect(s.phase).toBe('GAME_OVER')
    expect(s.winnerId).toBe('p1')
    expect(s.players[0].position).toBe(100)
    expect(canRoll(s)).toBe(false)
    expect(rollDice(s, 1)).toBe(s)
  })

  it('restart gives a clean game', () => {
    const played = playTurn(playTurn(createGame(TWO), 4), 2)
    const fresh = createGame(played.players.map(({ name, colorId, isComputer }) => ({ name, colorId, isComputer })))
    expect(fresh.players.every((p) => p.position === 0)).toBe(true)
    expect(fresh.history).toEqual([])
    expect(fresh.rollId).toBe(0)
    expect(fresh.phase).toBe('READY')
  })

  it('settlePending resolves an interrupted turn to its checkpoint', () => {
    let s = at(createGame(TWO), [12, 0])
    s = rollDice(s, 4) // snake turn, interrupted while the dice spins
    const settled = settlePending(s)
    expect(settled.pending).toBeNull()
    expect(settled.phase).toBe('READY')
    expect(settled.players[0].position).toBe(6)
    expect(currentPlayer(settled).id).toBe('p2')
  })
})

describe('optional house rules', () => {
  const withRules = (enterOnOne: boolean, bonusOnSix: boolean) => createGame(TWO, DEFAULT_BOARD, { enterOnOne, bonusOnSix })

  it('traditional rules are the default', () => {
    expect(createGame(TWO).rules).toEqual({ enterOnOne: false, bonusOnSix: false })
    const s = playTurn(createGame(TWO), 6)
    expect(s.players[0].position).toBe(6)
    expect(currentPlayer(s).id).toBe('p2') // no bonus roll
  })

  it('enter-on-one keeps a player at the start until they roll a 1', () => {
    let s = playTurn(withRules(true, false), 4)
    expect(s.players[0].position).toBe(0)
    expect(s.history.at(-1)?.event).toBe('needsOne')
    expect(currentPlayer(s).id).toBe('p2')
    s = playTurn(s, 1) // Leo rolls the 1
    expect(s.players[1].position).toBe(1)
  })

  it('enter-on-one only applies at the start', () => {
    const s = playTurn(at(withRules(true, false), [10, 0]), 4)
    expect(s.players[0].position).toBe(14)
  })

  it('a 6 gives the same player another roll', () => {
    let s = playTurn(withRules(false, true), 6)
    expect(s.players[0].position).toBe(6)
    expect(currentPlayer(s).id).toBe('p1')
    expect(canRoll(s)).toBe(true)
    s = playTurn(s, 2)
    expect(currentPlayer(s).id).toBe('p2')
  })

  it('a 6 still earns another roll even when it does not move you', () => {
    const s = playTurn(withRules(true, true), 6)
    expect(s.players[0].position).toBe(0)
    expect(currentPlayer(s).id).toBe('p1')
  })

  it('no extra roll once the game is won', () => {
    const s = playTurn(at(withRules(false, true), [94, 0]), 6)
    expect(s.phase).toBe('GAME_OVER')
    expect(canRoll(s)).toBe(false)
  })
})

describe('computer opponent', () => {
  const vsCpu = () => createGame([TWO[0], { name: 'Robo', colorId: 'violet', isComputer: true }])

  it('rolls only on its own turn, when ready and not paused', () => {
    let s = vsCpu()
    expect(shouldComputerRoll(s, false)).toBe(false) // human's turn
    s = playTurn(s, 2)
    expect(shouldComputerRoll(s, false)).toBe(true)
    expect(shouldComputerRoll(s, true)).toBe(false) // paused
    expect(shouldComputerRoll(rollDice(s, 3), false)).toBe(false) // already rolling
  })

  it('plays by the same rules (exact roll, snakes) as humans', () => {
    let s = playTurn(vsCpu(), 2)
    s = at(s, [2, 12])
    s = playTurn(s, 4) // computer lands on snake 16
    expect(s.players[1].position).toBe(6)
  })
})
