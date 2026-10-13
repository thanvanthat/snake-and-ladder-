import type { PlayerSetup } from '../game/gameTypes'
import { DEFAULT_SETUP } from '../game/storage'
import { __resetStore, actions, store } from './useGame'

const rolls: number[] = []
vi.mock('../game/dice', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../game/dice')>()
  return { ...mod, rollDie: () => rolls.shift() ?? 1 }
})

const TWO: PlayerSetup[] = [
  { name: 'Ava', colorId: 'crimson', isComputer: false },
  { name: 'Leo', colorId: 'azure', isComputer: false },
]

const game = () => store.get().game!
const key = () => store.get().gameKey

describe('app store turn flow', () => {
  beforeEach(() => {
    localStorage.clear()
    __resetStore()
    rolls.length = 0
    actions.startGame(TWO, DEFAULT_SETUP)
  })

  it('a roll shows the engine value and ignores repeated clicks', () => {
    rolls.push(5, 2)
    actions.roll()
    actions.roll()
    expect(game().lastRoll).toBe(5)
    expect(game().rollId).toBe(1)
    expect(game().phase).toBe('ROLLING_DICE')
  })

  it('does not roll while paused', () => {
    actions.togglePause()
    actions.roll()
    expect(game().phase).toBe('READY')
  })

  it('completes a turn via animation signals and announces snakes', () => {
    store.get().game!.players[0].position = 12
    rolls.push(4)
    actions.roll()
    actions.diceSettled(key(), game().rollId)
    actions.movementFinished(key(), game().rollId)
    expect(game().phase).toBe('SNAKE_BITE')
    actions.transitionFinished(key(), game().rollId)
    expect(game().players[0].position).toBe(6)
    expect(store.get().toast?.text).toBe('Ava was bitten by a snake! Back to square 6.')
    expect(game().currentIndex).toBe(1)
  })

  it('ignores stale animation callbacks after a restart', () => {
    rolls.push(3)
    actions.roll()
    const oldKey = key()
    const oldRoll = game().rollId
    actions.restartGame()
    actions.diceSettled(oldKey, oldRoll)
    expect(game().phase).toBe('READY')
    expect(game().players.every((p) => p.position === 0)).toBe(true)
    expect(game().history).toEqual([])
  })
})
