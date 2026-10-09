import { audioEngine } from '../audio/engine'
import { StationSimulation } from '../world/StationSimulation'

// The model and engine outlive the Canvas. Retrying graphics preserves location and audio.
export const station = new StationSimulation((zone) => audioEngine.setWorldZone(zone))

export function attachPageLifecycle(): () => void {
  const hide = () => audioEngine.pauseForBackground()
  const visibility = () => { if (document.hidden) hide() }
  document.addEventListener('visibilitychange', visibility)
  window.addEventListener('pagehide', hide)
  return () => {
    document.removeEventListener('visibilitychange', visibility)
    window.removeEventListener('pagehide', hide)
  }
}
