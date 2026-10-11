import { audioEngine } from '../../audio/engine'
import { journey, setDebugMode } from '../../app/runtime'
import { TrainDemoController } from './TrainDemoController'

// Runtime ownership survives React/Canvas remounts. No second AudioContext.
export const trainDemo = new TrainDemoController(Math.random, (cue) => {
  if (cue === 'opening' || cue === 'closing') audioEngine.playDoorEffect()
  // Japanese announcement recordings are deliberately absent until licensed assets exist.
})

let lastMix = ''
export function syncDemoSound() {
  const state = trainDemo.getSnapshot()
  const cabin = state.phase === 'cruising' || state.phase === 'arriving' && trainDemo.arrivalTime < 4 || state.phase === 'returning' && trainDemo.boardingTime > 4.6
  const zone = cabin ? 'train' : state.phase === 'station' || state.phase === 'returning' && trainDemo.boardingAt === null ? trainDemo.station.getSnapshot().zone : 'outside'
  audioEngine.setWorldZone(zone)
  audioEngine.setWeather(state.environment.weather === 'rain' ? 'rain' : 'wind')
  const distance = Math.abs(trainDemo.trainZ)
  const train = cabin ? 1 : Math.max(0, 1 - distance / 50) * (zone === 'inside' ? 0.07 : 0.5)
  const rain = cabin ? 0.08 : zone === 'inside' ? 0.25 : 1
  const rolling = cabin ? Math.min(1, trainDemo.scenerySpeed / 9) : Math.min(1, distance / 8)
  const key = [train, rain, rolling].map((value) => Math.round(value * 40)).join('/')
  if (key !== lastMix) { lastMix = key; audioEngine.setAmbientMix({ train, rain, rolling }) }
}

export function activateDemo() {
  audioEngine.pause()
  lastMix = ''
  syncDemoSound()
  return () => {
    audioEngine.pause()
    audioEngine.setWeather('rain')
    audioEngine.clearAmbientMix()
    audioEngine.setModeSettings(journey.getSnapshot().settings)
    setDebugMode(window.location.hash === '#/debug/m1')
  }
}

export function confirmDemoChoice() {
  const { choice } = trainDemo.getSnapshot()
  audioEngine.setModeSettings({ mode: choice === 'sleep' ? 'sleep' : choice === 'focus' ? 'focus' : 'relax', mood: choice === 'anxious' ? 'anxious' : choice === 'happy' ? 'happy' : choice === 'lonely' ? 'lonely' : 'calm', doNotDisturb: choice === 'dnd' })
  void audioEngine.startFromGesture()
  trainDemo.depart()
}
