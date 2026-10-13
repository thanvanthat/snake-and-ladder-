import { createGame, rollDice } from './gameEngine'
import type { PlayerSetup } from './gameTypes'
import { DEFAULT_SETTINGS, loadGame, parseGame, parseSettings, parseSetup, saveGame } from './storage'

const TWO: PlayerSetup[] = [
  { name: 'Ava', colorId: 'crimson', isComputer: false },
  { name: 'Leo', colorId: 'azure', isComputer: false },
]

const roundTrip = (v: unknown) => JSON.parse(JSON.stringify(v)) as unknown

describe('storage validation', () => {
  beforeEach(() => localStorage.clear())

  it('falls back to defaults for invalid settings', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings({ soundOn: 'yes', volume: 7 })).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings({ soundOn: false, volume: 0.3 }).volume).toBe(0.3)
  })

  it('rejects setups with duplicate colours', () => {
    const bad = { mode: 'local', count: 2, players: Array(4).fill({ name: 'A', colorId: 'crimson' }) }
    expect(parseSetup(bad).players[1].colorId).not.toBe('crimson')
  })

  it('round-trips a valid game', () => {
    const g = createGame(TWO)
    saveGame(g)
    const loaded = loadGame()
    expect(loaded?.players).toEqual(g.players)
    expect(loaded?.phase).toBe('READY')
  })

  it('never restores mid-animation: an interrupted turn is resolved to its checkpoint', () => {
    const g = { ...createGame(TWO), players: createGame(TWO).players.map((p, i) => (i === 0 ? { ...p, position: 12 } : p)) }
    const mid = rollDice(g, 4) // would land on snake 16
    const parsed = parseGame(roundTrip(mid))
    expect(parsed?.phase).toBe('READY')
    expect(parsed?.pending).toBeNull()
    expect(parsed?.players[0].position).toBe(6)
  })

  it('rejects corrupted or inconsistent data', () => {
    const g = roundTrip(createGame(TWO)) as Record<string, unknown>
    expect(parseGame('nonsense')).toBeNull()
    expect(parseGame({ ...g, currentIndex: 5 })).toBeNull()
    expect(parseGame({ ...g, phase: 'FLYING' })).toBeNull()
    expect(parseGame({ ...g, players: [] })).toBeNull()
    const players = (g.players as Record<string, unknown>[]).map((p) => ({ ...p, position: 100 }))
    expect(parseGame({ ...g, players })).toBeNull() // two players on 100 and no winner
  })

  it('survives broken JSON in storage', () => {
    localStorage.setItem('snl3d.game.v1', '{not json')
    expect(loadGame()).toBeNull()
  })
})
