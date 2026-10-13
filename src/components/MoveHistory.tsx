import { ArrowUpRight, Ban, Footprints, ScrollText, TrendingDown, Trophy } from 'lucide-react'
import type { GameState, HistoryEvent } from '../game/gameTypes'
import { APPEARANCES } from '../game/players'

const EVENT: Record<HistoryEvent, { icon: typeof Footprints; label: string; tone: string }> = {
  move: { icon: Footprints, label: '', tone: 'text-white/50' },
  snake: { icon: TrendingDown, label: 'snake bite', tone: 'text-rose-300' },
  ladder: { icon: ArrowUpRight, label: 'ladder', tone: 'text-emerald-300' },
  overshoot: { icon: Ban, label: 'needs exact roll', tone: 'text-amber-200' },
  needsOne: { icon: Ban, label: 'needs a 1', tone: 'text-amber-200' },
  win: { icon: Trophy, label: 'wins!', tone: 'text-amber-300' },
}

export function MoveHistory({ game }: { game: GameState }) {
  const entries = game.history.slice(-40).reverse()
  return (
    <details className="panel group p-3 lg:flex-1" open={typeof window !== 'undefined' && window.innerWidth >= 1024}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-white/80">
        <ScrollText size={16} /> Move history
        <span className="ml-auto text-xs text-white/40">{game.history.length} moves</span>
      </summary>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-white/45">No moves yet. Roll the die to begin!</p>
      ) : (
        <ol className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1 text-sm lg:max-h-[32vh]" aria-label="Move history">
          {entries.map((h) => {
            const player = game.players.find((p) => p.id === h.playerId)
            const e = EVENT[h.event]
            const Icon = e.icon
            return (
              <li key={h.turn} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: player ? APPEARANCES[player.colorId].accent : '#999' }} />
                <span className="min-w-0 flex-1 truncate">
                  <b>{player?.name}</b> rolled {h.roll}: {h.from === 0 ? 'start' : h.from} → {h.to}
                </span>
                <span className={`flex shrink-0 items-center gap-1 text-xs ${e.tone}`}>
                  <Icon size={14} /> {e.label}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </details>
  )
}
