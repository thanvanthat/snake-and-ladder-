import { motion } from 'framer-motion'
import { ArrowLeft, Bot, Check, Play, User, Users } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { MAX_NAME_LENGTH, MAX_PLAYERS, MIN_PLAYERS, PLAYER_COLOR_IDS, type PlayerColorId, type PlayerSetup } from '../game/gameTypes'
import { APPEARANCES } from '../game/players'
import type { GameMode, SetupDraft } from '../game/storage'
import { playersForDraft, validatePlayers } from '../game/setup'

interface GameSetupProps {
  initial: SetupDraft
  onStart: (players: PlayerSetup[], draft: SetupDraft) => void
  onBack: () => void
}

function Segmented<T extends string | number>({ label, value, options, onChange }: {
  label: string
  value: T
  options: { value: T; label: string; icon?: ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-ink-900/70 p-1 ring-1 ring-white/10">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${value === o.value ? 'bg-amber-400 text-ink-900 shadow' : 'text-white/70 hover:bg-white/10'}`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function GameSetup({ initial, onStart, onBack }: GameSetupProps) {
  const [draft, setDraft] = useState<SetupDraft>(initial)
  const players = useMemo(() => playersForDraft(draft), [draft])
  const errors = useMemo(() => validatePlayers(players), [players])
  const valid = errors.every((e) => e === null)

  const setMode = (mode: GameMode) => setDraft((d) => ({ ...d, mode }))
  const setCount = (count: number) => setDraft((d) => ({ ...d, count }))
  const setName = (i: number, name: string) =>
    setDraft((d) => ({ ...d, players: d.players.map((p, j) => (j === i ? { ...p, name } : p)) }))
  // Colours stay unique: picking a colour another player has swaps the two.
  const setColor = (i: number, colorId: PlayerColorId) =>
    setDraft((d) => {
      const old = d.players[i].colorId
      return { ...d, players: d.players.map((p, j) => (j === i ? { ...p, colorId } : p.colorId === colorId ? { ...p, colorId: old } : p)) }
    })

  return (
    <div className="min-h-dvh w-full bg-[radial-gradient(ellipse_at_top,_#2a3150,_#14161f_60%)] px-4 py-6 sm:py-10">
      <motion.div className="mx-auto max-w-2xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <button className="btn-secondary mb-5 px-3 py-2 text-sm" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">New game</h1>
        <p className="mt-1 text-white/60">Pick who is playing, then name your characters.</p>

        <section className="panel mt-6 space-y-4 p-4 sm:p-5">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/50">Mode</h2>
            <Segmented
              label="Game mode"
              value={draft.mode}
              onChange={setMode}
              options={[
                { value: 'local', label: 'Local players', icon: <Users size={16} /> },
                { value: 'computer', label: 'Vs computer', icon: <Bot size={16} /> },
              ]}
            />
          </div>
          {draft.mode === 'local' && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/50">Players</h2>
              <Segmented
                label="Number of players"
                value={draft.count}
                onChange={setCount}
                options={Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => ({ value: i + MIN_PLAYERS, label: `${i + MIN_PLAYERS} players` }))}
              />
            </div>
          )}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/50">House rules</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ['enterOnOne', 'Roll a 1 to start', 'Players stay off the board until they roll a 1'],
                ['bonusOnSix', 'Six rolls again', 'Rolling a 6 gives another turn'],
              ] as const).map(([key, label, hint]) => (
                <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl bg-ink-900/70 p-3 ring-1 ring-white/10">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-amber-400"
                    checked={draft[key]}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.checked }))}
                  />
                  <span>
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block text-xs text-white/55">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <ul className="mt-4 space-y-3">
          {players.map((p, i) => {
            const accent = APPEARANCES[p.colorId].accent
            const errorId = `player-${i}-error`
            return (
              <li key={i} className="panel p-4" style={{ boxShadow: `inset 4px 0 0 ${accent}` }}>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-900" style={{ background: accent }} aria-hidden>
                    {p.isComputer ? <Bot size={20} /> : <User size={20} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`player-${i}`} className="text-xs font-semibold uppercase tracking-wider text-white/50">
                      {p.isComputer ? 'Computer' : `Player ${i + 1}`}
                    </label>
                    <input
                      id={`player-${i}`}
                      className="field mt-1"
                      value={draft.players[i].name}
                      maxLength={MAX_NAME_LENGTH}
                      onChange={(e) => setName(i, e.target.value)}
                      aria-invalid={errors[i] !== null}
                      aria-describedby={errors[i] ? errorId : undefined}
                      autoComplete="off"
                    />
                  </div>
                </div>
                {errors[i] && (
                  <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-rose-300">
                    {errors[i]}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={`Character for ${p.name || `player ${i + 1}`}`}>
                  {PLAYER_COLOR_IDS.map((c) => {
                    const a = APPEARANCES[c]
                    const selected = c === p.colorId
                    return (
                      <button
                        key={c}
                        role="radio"
                        aria-checked={selected}
                        aria-label={a.label}
                        title={a.label}
                        onClick={() => setColor(i, c)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full ring-2 transition ${selected ? 'scale-110 ring-white' : 'ring-transparent hover:ring-white/40'}`}
                        style={{ background: a.accent }}
                      >
                        {selected && <Check size={16} className="text-white drop-shadow" strokeWidth={3} />}
                      </button>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>

        <button className="btn-primary mt-6 w-full py-3.5 text-lg" disabled={!valid} onClick={() => onStart(players, draft)}>
          <Play size={20} fill="currentColor" /> Start game
        </button>
      </motion.div>
    </div>
  )
}
