import { audioEngine } from './engine'
import { PlayerController } from './PlayerController'

export const player = new PlayerController(audioEngine)
export function attachPlayerLifecycle(): () => void {
  void player.load()
  const tick = () => player.timer.tick()
  const interval = window.setInterval(tick, 1000)
  document.addEventListener('visibilitychange', tick)
  window.addEventListener('pageshow', tick)
  return () => { clearInterval(interval); document.removeEventListener('visibilitychange', tick); window.removeEventListener('pageshow', tick) }
}
if (import.meta.hot) import.meta.hot.dispose(() => player.dispose())
