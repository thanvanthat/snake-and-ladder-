import { Home, Pause, Play, RotateCcw, Settings, Video, Volume2, VolumeX } from 'lucide-react'
import { sound } from '../audio/soundEngine'
import { actions, useApp } from '../hooks/useGame'

interface Props {
  onHome: () => void
  onRestart: () => void
  onSettings: () => void
}

/** Floating toolbar over the 3D view. */
export function GameControls({ onHome, onRestart, onSettings }: Props) {
  const paused = useApp((s) => s.paused)
  const soundOn = useApp((s) => s.settings.soundOn)
  const over = useApp((s) => s.game?.phase === 'GAME_OVER')
  const tap = (fn: () => void) => () => {
    sound.play('click')
    fn()
  }
  return (
    <nav className="absolute left-3 top-3 z-20 flex flex-wrap gap-2" aria-label="Game controls">
      <button className="icon-btn" onClick={tap(onHome)} aria-label="Home" title="Home">
        <Home size={18} />
      </button>
      <button className="icon-btn" onClick={tap(actions.togglePause)} disabled={over} aria-label={paused ? 'Resume' : 'Pause'} title={paused ? 'Resume (P)' : 'Pause (P)'} aria-pressed={paused}>
        {paused ? <Play size={18} /> : <Pause size={18} />}
      </button>
      <button className="icon-btn" onClick={tap(onRestart)} aria-label="Restart game" title="Restart game">
        <RotateCcw size={18} />
      </button>
      <button className="icon-btn" onClick={tap(actions.resetCamera)} aria-label="Reset camera" title="Reset camera (C)">
        <Video size={18} />
      </button>
      <button className="icon-btn" onClick={() => actions.updateSettings({ soundOn: !soundOn })} aria-label={soundOn ? 'Mute sound' : 'Unmute sound'} title={soundOn ? 'Mute (M)' : 'Unmute (M)'} aria-pressed={!soundOn}>
        {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
      <button className="icon-btn" onClick={tap(onSettings)} aria-label="Settings" title="Settings">
        <Settings size={18} />
      </button>
    </nav>
  )
}
