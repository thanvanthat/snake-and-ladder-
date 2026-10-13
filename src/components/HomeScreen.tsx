import { motion } from 'framer-motion'
import { BookOpen, Play, RotateCcw, Settings as SettingsIcon, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { sound } from '../audio/soundEngine'
import { FINAL_SQUARE } from '../game/gameTypes'
import { actions, useApp } from '../hooks/useGame'
import { Modal } from './Modal'
import { SceneHost } from './SceneHost'
import { SettingsPanel } from './SettingsPanel'

export function Logo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="#1d2030" />
      <g stroke="#e9b949" strokeWidth="5" strokeLinecap="round">
        <path d="M18 52 30 12M34 52 46 12" />
        <path d="M22 40h16M25 28h16" />
      </g>
      <path d="M52 50c-8 4-14-4-22-2s-10 8-16 6" fill="none" stroke="#3d9a8b" strokeWidth="6" strokeLinecap="round" />
      <circle cx="52" cy="50" r="5" fill="#3d9a8b" />
      <circle cx="53.5" cy="48.5" r="1.2" fill="#fff" />
    </svg>
  )
}

export function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rules = [
    'Everyone starts off the board, before square 1. Players take turns rolling one six-sided die.',
    'Your character walks forward one square per pip, following the winding numbers.',
    'Finish your move on the foot of a ladder and you climb straight up to its top.',
    'Finish your move on a snake’s head and it bites! You slide down to its tail.',
    'Passing over a snake or ladder does nothing. Only the square you land on counts.',
    `You must land on square ${FINAL_SQUARE} exactly. If the roll is too high, you stay put.`,
    `The first player to reach square ${FINAL_SQUARE} wins.`,
    'Optional house rules (chosen in setup): roll a 1 to enter the board, and a 6 earns another roll.',
  ]
  return (
    <Modal open={open} title="How to play" onClose={onClose} wide>
      <ol className="space-y-3">
        {rules.map((r, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-ink-900">{i + 1}</span>
            <span className="pt-0.5 text-white/80">{r}</span>
          </li>
        ))}
      </ol>
      <p className="mt-5 rounded-xl bg-white/5 p-3 text-sm text-white/60">
        Tip: press <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono">Space</kbd> to roll. Drag to orbit the camera and scroll or pinch to zoom.
      </p>
    </Modal>
  )
}

export function HomeScreen() {
  const savedGame = useApp((s) => s.savedGame)
  const soundOn = useApp((s) => s.settings.soundOn)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const click = (fn: () => void) => () => {
    sound.play('click')
    fn()
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <SceneHost preview />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/45 to-transparent sm:bg-gradient-to-r sm:from-ink-900/95 sm:via-ink-900/50" />

      <button
        className="icon-btn absolute right-4 top-4 z-20"
        onClick={() => actions.updateSettings({ soundOn: !soundOn })}
        aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
        title={soundOn ? 'Mute' : 'Unmute'}
      >
        {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </button>

      <motion.main
        className="absolute inset-x-0 bottom-0 z-10 p-5 pb-8 sm:inset-y-0 sm:left-0 sm:right-auto sm:flex sm:max-w-lg sm:flex-col sm:justify-center sm:p-12"
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="mb-3 flex items-center gap-3">
          <Logo />
          <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-300 ring-1 ring-amber-300/30">3D Tabletop</span>
        </div>
        <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight drop-shadow-lg sm:text-6xl">
          Snakes
          <span className="text-amber-300"> &amp; </span>
          Ladders
        </h1>
        <p className="mt-4 max-w-md text-base text-white/75 sm:text-lg">
          Roll the die, climb the ladders, and watch out for the snakes. They bite.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:max-w-xs">
          <button className="btn-primary py-3.5 text-lg" onClick={click(actions.goSetup)} autoFocus>
            <Play size={20} fill="currentColor" /> Play Game
          </button>
          {savedGame && (
            <button className="btn-secondary" onClick={click(actions.continueGame)}>
              <RotateCcw size={18} /> Continue saved game
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-secondary" onClick={click(() => setRulesOpen(true))}>
              <BookOpen size={18} /> How to Play
            </button>
            <button className="btn-secondary" onClick={click(() => setSettingsOpen(true))}>
              <SettingsIcon size={18} /> Settings
            </button>
          </div>
        </div>
      </motion.main>

      <HowToPlay open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
