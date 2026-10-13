import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Info, Play, TrendingDown, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AI_THINK_MS, shouldComputerRoll } from '../game/aiPlayer'
import { currentPlayer } from '../game/gameEngine'
import type { GameState } from '../game/gameTypes'
import { actions, store, useApp, type Toast } from '../hooks/useGame'
import { DicePanel } from './DicePanel'
import { GameControls } from './GameControls'
import { ConfirmDialog } from './Modal'
import { MoveHistory } from './MoveHistory'
import { PlayerCard } from './PlayerCard'
import { SceneHost } from './SceneHost'
import { SettingsPanel } from './SettingsPanel'
import { WinnerModal } from './WinnerModal'

const TOAST_STYLE: Record<Toast['tone'], { icon: typeof Info; className: string }> = {
  snake: { icon: TrendingDown, className: 'bg-rose-600/95' },
  ladder: { icon: ArrowUpRight, className: 'bg-emerald-600/95' },
  info: { icon: Info, className: 'bg-ink-700/95' },
  win: { icon: Trophy, className: 'bg-amber-500/95 text-ink-900' },
}

function ToastBar() {
  const toast = useApp((s) => s.toast)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => actions.dismissToast(toast.id), 3600)
    return () => window.clearTimeout(t)
  }, [toast])
  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-3 lg:top-4" role="status" aria-live="assertive">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ y: -16, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0 }}
            className={`flex max-w-md items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold shadow-xl ${TOAST_STYLE[toast.tone].className}`}
          >
            {(() => {
              const Icon = TOAST_STYLE[toast.tone].icon
              return <Icon size={18} className="shrink-0" />
            })()}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Computer turns go through exactly the same roll action as a human click. */
function useComputerTurns(game: GameState | null, paused: boolean) {
  useEffect(() => {
    if (!game || !shouldComputerRoll(game, paused)) return
    const t = window.setTimeout(actions.roll, AI_THINK_MS)
    return () => window.clearTimeout(t)
  }, [game, paused])
}

function useKeyboard(confirmOpen: boolean) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmOpen || e.repeat) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.closest('[role="dialog"]'))) return
      if (e.code === 'Space' && el?.tagName !== 'BUTTON') {
        e.preventDefault()
        const game = store.get().game
        if (game && !currentPlayer(game).isComputer) actions.roll()
      } else if (e.key === 'p' || e.key === 'P') actions.togglePause()
      else if (e.key === 'c' || e.key === 'C') actions.resetCamera()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmOpen])
}


export function GameScreen() {
  const game = useApp((s) => s.game)
  const paused = useApp((s) => s.paused)
  const [confirm, setConfirm] = useState<'home' | 'restart' | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  useKeyboard(confirm !== null || settingsOpen)
  useComputerTurns(game, paused)
  if (!game) return null

  const current = currentPlayer(game)
  const over = game.phase === 'GAME_OVER'
  const leave = () => (over ? actions.goHome() : setConfirm('home'))
  const restart = () => (over ? actions.restartGame() : setConfirm('restart'))

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-ink-900 lg:flex-row">
      <main className="relative min-h-0 flex-1">
        <SceneHost />
        <GameControls onHome={leave} onRestart={restart} onSettings={() => setSettingsOpen(true)} />
        <ToastBar />
        <AnimatePresence>
          {paused && (
            <motion.div className="absolute inset-0 z-10 flex items-center justify-center bg-ink-900/55 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button className="btn-primary px-6 py-3 text-lg" onClick={actions.togglePause} autoFocus>
                <Play size={20} fill="currentColor" /> Resume
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <aside className="flex max-h-[48dvh] shrink-0 flex-col gap-3 overflow-y-auto border-t border-white/10 bg-ink-900 p-3 lg:max-h-none lg:w-[360px] lg:border-l lg:border-t-0 lg:p-4" aria-label="Game panel">
        <header className="hidden items-center justify-between lg:flex">
          <h1 className="font-display text-xl font-extrabold">
            Snakes <span className="text-amber-300">&amp;</span> Ladders
          </h1>
          <span className="text-xs text-white/40">Turn {game.history.length + 1}</span>
        </header>
        <DicePanel game={game} />
        <ul className="grid grid-cols-2 gap-2" aria-label="Players">
          {game.players.map((p) => (
            <PlayerCard key={p.id} player={p} isCurrent={!over && p.id === current.id} isWinner={p.id === game.winnerId} />
          ))}
        </ul>
        <MoveHistory game={game} />
      </aside>

      <WinnerModal game={game} onPlayAgain={actions.restartGame} onHome={actions.goHome} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'home' ? 'Leave this game?' : 'Restart the game?'}
        message={confirm === 'home' ? 'Your progress is saved, so you can continue it from the home screen.' : 'Everyone goes back to the start. The current game will be lost.'}
        confirmLabel={confirm === 'home' ? 'Go home' : 'Restart'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const action = confirm
          setConfirm(null)
          if (action === 'home') actions.goHome()
          else actions.restartGame()
        }}
      />
    </div>
  )
}
