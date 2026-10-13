import { audioEngine } from '../audio/engine'
import { attachPlayerLifecycle, player } from '../audio/player'
import { StationSimulation } from '../world/StationSimulation'
import { JourneyController } from './JourneyController'
import { accessSettings } from '../db/settings'
import type { ModeSettings } from '../features/modes'

// The model and engine outlive the Canvas. Retrying graphics preserves location and audio.
export const journey = new JourneyController()
let debug = false
let atStation = false
let lastSettings = journey.getSnapshot().settings
export const station = new StationSimulation((zone) => { if (debug || atStation) audioEngine.setWorldZone(zone) })

function syncJourney() {
  const state = journey.getSnapshot()
  const nextStation = state.phase === 'home_station' || (state.phase === 'arriving' && state.stage === 'lifting')
  if (nextStation && !atStation) station.arrive()
  atStation = nextStation
  if (!debug) audioEngine.setWorldZone(atStation ? station.getSnapshot().zone : 'train')
  audioEngine.setTrainMoving(state.phase === 'train' || state.phase === 'mode_select')
  if (lastSettings !== state.settings) { lastSettings = state.settings; audioEngine.setModeSettings(state.settings) }
}
const unsubscribeJourney = journey.subscribe(syncJourney)
syncJourney()

export function setDebugMode(value: boolean) {
  debug = value
  audioEngine.setWorldZone(debug || atStation ? station.getSnapshot().zone : 'train')
}

let settingsLoad: Promise<void> | undefined
let saveQueue: Promise<unknown> = Promise.resolve()
export function loadSettings(): Promise<void> {
  settingsLoad ??= accessSettings('read').then((settings) => { journey.restoreSettings(settings) })
  return settingsLoad
}
export function confirmSettings(settings: ModeSettings): Promise<void> {
  if (!journey.confirmModes(settings)) return Promise.resolve()
  player.beginSession(settings)
  const write = saveQueue.catch(() => {}).then(() => accessSettings('write', settings)).then(() => {})
  saveQueue = write
  return write
}

if (import.meta.hot) import.meta.hot.dispose(unsubscribeJourney)

export function attachPageLifecycle(): () => void {
  const detachPlayer = attachPlayerLifecycle()
  const hide = () => audioEngine.pauseForBackground()
  const visibility = () => { player.timer.tick(); if (document.hidden) hide() }
  document.addEventListener('visibilitychange', visibility)
  window.addEventListener('pagehide', hide)
  return () => {
    detachPlayer()
    document.removeEventListener('visibilitychange', visibility)
    window.removeEventListener('pagehide', hide)
  }
}
