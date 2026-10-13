import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_SETUP } from '../game/storage'
import { GameSetup } from './GameSetup'

function setup() {
  const onStart = vi.fn()
  render(<GameSetup initial={structuredClone(DEFAULT_SETUP)} onStart={onStart} onBack={() => {}} />)
  return { onStart, user: userEvent.setup() }
}

describe('GameSetup', () => {
  it('starts a two player local game with the entered names', async () => {
    const { onStart, user } = setup()
    const first = screen.getByLabelText('Player 1')
    await user.clear(first)
    await user.type(first, 'Zara')
    await user.click(screen.getByRole('button', { name: /start game/i }))
    expect(onStart).toHaveBeenCalledTimes(1)
    const [players] = onStart.mock.calls[0]
    expect(players).toEqual([
      { name: 'Zara', colorId: 'crimson', isComputer: false },
      { name: 'Leo', colorId: 'azure', isComputer: false },
    ])
  })

  it('validates empty and duplicate names', async () => {
    const { onStart, user } = setup()
    const first = screen.getByLabelText('Player 1')
    await user.clear(first)
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a name')
    expect(screen.getByRole('button', { name: /start game/i })).toBeDisabled()
    await user.type(first, 'leo')
    expect(screen.getByRole('alert')).toHaveTextContent('Names must be different')
    await user.click(screen.getByRole('button', { name: /start game/i }))
    expect(onStart).not.toHaveBeenCalled()
  })

  it('offers 2-4 local players', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('radio', { name: '4 players' }))
    expect(screen.getAllByRole('textbox')).toHaveLength(4)
  })

  it('vs computer creates one human and one computer opponent', async () => {
    const { onStart, user } = setup()
    await user.click(screen.getByRole('radio', { name: /vs computer/i }))
    expect(screen.getByLabelText('Computer')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /start game/i }))
    const [players] = onStart.mock.calls[0]
    expect(players.map((p: { isComputer: boolean }) => p.isComputer)).toEqual([false, true])
  })

  it('house rules are on by default and can be switched off', async () => {
    const { onStart, user } = setup()
    const one = screen.getByRole('checkbox', { name: /roll a 1 to start/i })
    const six = screen.getByRole('checkbox', { name: /six rolls again/i })
    expect(one).toBeChecked()
    expect(six).toBeChecked()
    await user.click(six)
    await user.click(screen.getByRole('button', { name: /start game/i }))
    const [, draft] = onStart.mock.calls[0]
    expect(draft).toMatchObject({ enterOnOne: true, bonusOnSix: false })
  })

  it('keeps character colours unique by swapping', async () => {
    const { onStart, user } = setup()
    const p1Colors = screen.getByRole('radiogroup', { name: /character for ava/i })
    await user.click(p1Colors.querySelector('[aria-label="Azure"]') as HTMLElement)
    await user.click(screen.getByRole('button', { name: /start game/i }))
    const [players] = onStart.mock.calls[0]
    expect(players[0].colorId).toBe('azure')
    expect(players[1].colorId).toBe('crimson')
  })
})
