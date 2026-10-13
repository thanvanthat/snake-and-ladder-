import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { GameScreen } from '../components/GameScreen'
import { GameSetup } from '../components/GameSetup'
import { HomeScreen } from '../components/HomeScreen'
import { actions, useApp } from '../hooks/useGame'

export function App() {
  const screen = useApp((s) => s.screen)
  const setup = useApp((s) => s.setup)
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <motion.div key={screen} className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {screen === 'home' && <HomeScreen />}
          {screen === 'setup' && <GameSetup initial={setup} onStart={actions.startGame} onBack={actions.goHome} />}
          {screen === 'game' && <GameScreen />}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  )
}
