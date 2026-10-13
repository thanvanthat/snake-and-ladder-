import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { sound } from './audio/soundEngine'
import './index.css'

// Browsers only allow audio after a user gesture.
const unlock = () => sound.unlock()
window.addEventListener('pointerdown', unlock)
window.addEventListener('keydown', unlock)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
