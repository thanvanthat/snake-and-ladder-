import type { SoundName } from '../animation/animationController'

export type UiSound = SoundName | 'click' | 'dice'

/**
 * Procedural Web Audio effects: no audio files to download or go missing.
 * The AudioContext is created lazily on the first user gesture (browser autoplay rules).
 * Every method is a silent no-op if Web Audio is unavailable.
 */
class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private enabled = true
  private volume = 0.7

  configure(enabled: boolean, volume: number): void {
    this.enabled = enabled
    this.volume = volume
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(enabled ? volume : 0, this.ctx.currentTime, 0.02)
  }

  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Ctor) return
        this.ctx = new Ctor()
        this.master = this.ctx.createGain()
        this.master.gain.value = this.enabled ? this.volume : 0
        this.master.connect(this.ctx.destination)
        const len = this.ctx.sampleRate
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
        const data = this.noise.getChannelData(0)
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume()
    } catch {
      this.ctx = null
    }
  }

  play(name: UiSound): void {
    const ctx = this.ctx
    if (!ctx || !this.master || !this.enabled || ctx.state !== 'running') return
    const t = ctx.currentTime
    try {
      switch (name) {
        case 'click': return this.tone(t, 720, 520, 0.07, 0.25, 'sine')
        case 'step': return this.tone(t, 210, 120, 0.06, 0.22, 'triangle')
        case 'climb': return this.tone(t, 340, 300, 0.07, 0.3, 'square', 0.12)
        case 'land': return this.tone(t, 140, 48, 0.22, 0.6, 'sine')
        case 'whoosh': return this.burst(t, 0.18, 0.3, 'bandpass', 900, 2600)
        case 'hiss': return this.burst(t, 0.75, 0.22, 'highpass', 4200, 5200)
        case 'slither': return this.burst(t, 1.3, 0.16, 'bandpass', 1400, 500)
        case 'bite':
          this.burst(t, 0.06, 0.7, 'highpass', 2500, 2500)
          return this.tone(t, 420, 70, 0.16, 0.55, 'sawtooth', 0.2)
        case 'dice':
          for (let i = 0; i < 7; i++) this.burst(t + i * 0.075 + Math.random() * 0.03, 0.035, 0.35, 'bandpass', 2400 + Math.random() * 1800, 3000)
          return
        case 'win':
          ;[523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => this.tone(t + i * 0.13, f, f, 0.22, 0.32, 'triangle'))
          return
      }
    } catch {
      // Never let audio break the game.
    }
  }

  private tone(t: number, f0: number, f1: number, dur: number, gain: number, type: OscillatorType, mix = 1): void {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(f0, t)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain * mix, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g).connect(this.master!)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  private burst(t: number, dur: number, gain: number, type: BiquadFilterType, f0: number, f1: number): void {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(f0, t)
    filter.frequency.exponentialRampToValueAtTime(f1, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.03, dur / 3))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(filter).connect(g).connect(this.master!)
    src.start(t, Math.random() * 0.5)
    src.stop(t + dur + 0.02)
  }
}

export const sound = new SoundEngine()
