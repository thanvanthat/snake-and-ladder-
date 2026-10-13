import { actions, useApp } from '../hooks/useGame'
import { Modal } from './Modal'

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-white/55">{hint}</span>
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-white/20 transition peer-checked:bg-amber-400 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-300 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
    </label>
  )
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useApp((s) => s.settings)
  return (
    <Modal open={open} title="Settings" onClose={onClose}>
      <div className="space-y-3">
        <Toggle label="Sound effects" hint="Dice, footsteps, hisses and cheers" checked={settings.soundOn} onChange={(soundOn) => actions.updateSettings({ soundOn })} />
        <label className="block rounded-xl bg-white/5 px-4 py-3">
          <span className="mb-2 flex justify-between font-semibold">
            Volume <span className="text-white/55">{Math.round(settings.volume * 100)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            disabled={!settings.soundOn}
            onChange={(e) => actions.updateSettings({ volume: Number(e.target.value) })}
            className="w-full accent-amber-400"
            aria-label="Volume"
          />
        </label>
        <Toggle label="Fast animations" hint="Speeds up moves (good for reduced motion)" checked={settings.fastAnimations} onChange={(fastAnimations) => actions.updateSettings({ fastAnimations })} />
        <Toggle label="Cinematic camera" hint="Close-ups during snake bites and ladder climbs" checked={settings.cinematicCamera} onChange={(cinematicCamera) => actions.updateSettings({ cinematicCamera })} />
      </div>
    </Modal>
  )
}
