import { Bot, Crown } from 'lucide-react'
import { FINAL_SQUARE, type Player } from '../game/gameTypes'
import { APPEARANCES } from '../game/players'

export function Avatar({ player, size = 40 }: { player: Player; size?: number }) {
  const a = APPEARANCES[player.colorId]
  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-full font-display font-extrabold text-white shadow-inner"
      style={{ width: size, height: size, background: `radial-gradient(circle at 35% 30%, ${a.skin}, ${a.accent} 62%)`, fontSize: size * 0.42 }}
      aria-hidden
    >
      <span className="drop-shadow">{player.name.charAt(0).toUpperCase()}</span>
      {player.isComputer && (
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 ring-2 ring-ink-800">
          <Bot size={12} />
        </span>
      )}
    </span>
  )
}

export function PlayerCard({ player, isCurrent, isWinner }: { player: Player; isCurrent: boolean; isWinner: boolean }) {
  const a = APPEARANCES[player.colorId]
  return (
    <li
      className={`relative rounded-xl p-2.5 transition ${isCurrent ? 'bg-white/[0.12] ring-2' : 'bg-white/[0.05] ring-1 ring-white/10'}`}
      style={isCurrent ? { ['--tw-ring-color' as string]: a.accent } : undefined}
      aria-current={isCurrent ? 'true' : undefined}
    >
      <div className="flex items-center gap-2.5">
        <Avatar player={player} size={36} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold">
            {isWinner && <Crown size={14} className="shrink-0 text-amber-300" aria-label="Winner" />}
            <span className="truncate">{player.name}</span>
          </p>
          <p className="text-xs text-white/60">{player.position === 0 ? 'At start' : `Square ${player.position}`}</p>
        </div>
        {isCurrent && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-ink-900" style={{ background: a.accent }}>
            Turn
          </span>
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={player.position} aria-valuemin={0} aria-valuemax={FINAL_SQUARE} aria-label={`${player.name} progress`}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${player.position}%`, background: a.accent }} />
      </div>
    </li>
  )
}
