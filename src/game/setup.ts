import { MAX_NAME_LENGTH, type PlayerSetup } from './gameTypes'
import type { SetupDraft } from './storage'

/** Builds the player list for a draft (vs computer = one human + one computer). */
export function playersForDraft(draft: SetupDraft): PlayerSetup[] {
  const count = draft.mode === 'computer' ? 2 : draft.count
  return draft.players.slice(0, count).map((p, i) => ({
    name: p.name.trim(),
    colorId: p.colorId,
    isComputer: draft.mode === 'computer' && i === 1,
  }))
}

export function validatePlayers(players: PlayerSetup[]): (string | null)[] {
  return players.map((p, i) => {
    if (!p.name) return 'Enter a name'
    if (p.name.length > MAX_NAME_LENGTH) return `Use at most ${MAX_NAME_LENGTH} characters`
    if (players.some((o, j) => j < i && o.name.toLowerCase() === p.name.toLowerCase())) return 'Names must be different'
    return null
  })
}
