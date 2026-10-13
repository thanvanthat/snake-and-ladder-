import { AnimatePresence, motion } from 'framer-motion'
import { MonitorX } from 'lucide-react'
import { Component, lazy, Suspense, useState, type ReactNode } from 'react'

const GameScene = lazy(() => import('./GameScene').then((m) => ({ default: m.GameScene })))

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

const WEBGL_OK = typeof document !== 'undefined' && hasWebGL()

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('3D scene failed', error)
  }
  render() {
    return this.state.failed ? <WebGLFallback reason="The 3D scene crashed. Try reloading the page." /> : this.props.children
  }
}

export function WebGLFallback({ reason }: { reason: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-ink-800 p-6 text-center">
      <MonitorX className="text-amber-300" size={40} />
      <p className="max-w-sm text-white/80">{reason}</p>
    </div>
  )
}

export function LoadingScreen({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-ink-900"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          role="status"
          aria-live="polite"
        >
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/15 border-t-amber-300" />
          <p className="text-sm font-medium tracking-wide text-white/70">Setting up the board…</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** WebGL detection, lazy-loaded 3D bundle, crash boundary and loading overlay. */
export function SceneHost({ preview = false }: { preview?: boolean }) {
  const [ready, setReady] = useState(false)
  if (!WEBGL_OK) {
    return <WebGLFallback reason="Your browser or device does not support WebGL, which this 3D game needs. Try an up-to-date Chrome, Edge, Firefox or Safari." />
  }
  return (
    <div className="absolute inset-0">
      <SceneErrorBoundary>
        <Suspense fallback={null}>
          <GameScene preview={preview} onReady={() => setReady(true)} />
        </Suspense>
      </SceneErrorBoundary>
      <LoadingScreen visible={!ready} />
    </div>
  )
}
