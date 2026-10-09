import { DEFAULT_SETTINGS, parseSettings } from '../features/modes'
import type { ModeSettings } from '../features/modes'

export type JourneyPhase = 'train' | 'mode_select' | 'arriving' | 'home_station'
export type ArrivalStage = 'braking' | 'opening' | 'alighting' | 'lifting'
export const ARRIVAL = { opening: 1.6, alighting: 2.4, lifting: 3.2, complete: 5 } as const
export function arrivalStage(seconds: number): ArrivalStage {
  if (seconds < ARRIVAL.opening) return 'braking'
  if (seconds < ARRIVAL.alighting) return 'opening'
  if (seconds < ARRIVAL.lifting) return 'alighting'
  return 'lifting'
}
interface JourneySnapshot { phase: JourneyPhase; stage: ArrivalStage; settings: ModeSettings; hasArrived: boolean }

/** No timers or UI ownership: only the active, visible renderer advances a journey. */
export class JourneyController {
  arrivalSeconds = 0
  private settingsRevision = 0
  private snapshot: JourneySnapshot = { phase: 'train', stage: 'braking', settings: { ...DEFAULT_SETTINGS }, hasArrived: false }
  private listeners = new Set<() => void>()
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private publish(change: Partial<JourneySnapshot>) { this.snapshot = { ...this.snapshot, ...change }; this.listeners.forEach((listener) => listener()) }

  restoreSettings(value: unknown) {
    const settings = parseSettings(value)
    // A delayed database read must never overwrite a choice already made by the user.
    if (settings && this.settingsRevision === 0 && this.snapshot.phase === 'train') this.publish({ settings })
  }
  openModes = () => { if (this.snapshot.phase === 'train') { this.settingsRevision++; this.publish({ phase: 'mode_select' }) } }
  closeModes = () => { if (this.snapshot.phase === 'mode_select') this.publish({ phase: 'train' }) }
  confirmModes = (value: ModeSettings): boolean => {
    const settings = parseSettings(value)
    if (this.snapshot.phase !== 'mode_select' || !settings) return false
    this.settingsRevision++
    this.arrivalSeconds = 0
    this.publish({ settings, phase: 'arriving', stage: 'braking' })
    return true
  }
  step(delta: number, reducedMotion = false) {
    if (this.snapshot.phase !== 'arriving' || !Number.isFinite(delta) || delta <= 0) return
    this.arrivalSeconds = reducedMotion ? ARRIVAL.complete : Math.min(ARRIVAL.complete, this.arrivalSeconds + Math.min(delta, 0.1))
    if (this.arrivalSeconds >= ARRIVAL.complete) { this.finishArrival(); return }
    const stage = arrivalStage(this.arrivalSeconds)
    if (stage !== this.snapshot.stage) this.publish({ stage })
  }
  finishArrival = () => {
    if (this.snapshot.phase !== 'arriving') return
    this.arrivalSeconds = ARRIVAL.complete
    this.publish({ phase: 'home_station', stage: 'lifting', hasArrived: true })
  }
  returnToTrain = () => {
    if (this.snapshot.phase !== 'home_station' && this.snapshot.phase !== 'arriving') return
    this.arrivalSeconds = 0
    this.publish({ phase: 'train', stage: 'braking' })
  }
}
