import { StationSimulation } from '../../world/StationSimulation'
import { STATION } from '../../world/stationLayout'
import type { StatusChoice } from '../../features/status'

export type Weather = 'clear' | 'cloudy' | 'rain'
export type Daylight = 'day' | 'dusk' | 'night'
export type DemoChoice = StatusChoice
export type DemoPhase = 'cruising' | 'arriving' | 'station' | 'returning'
export type DemoCue = 'arrival' | 'opening' | 'closing' | 'cruising'
export interface Environment { weather: Weather; daylight: Daylight }
interface Snapshot { phase: DemoPhase; stage: string; environment: Environment; trip: number; choice: DemoChoice }

export const WAITING_POINT = { x: -2.9, z: 2.5 }
export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))
export const ease = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }
export const between = (time: number, start: number, end: number) => ease((time - start) / (end - start))

export function randomEnvironment(random: () => number): Environment {
  return {
    weather: (['clear', 'cloudy', 'rain'] as const)[Math.floor(clamp(random(), 0, 0.999999) * 3)]!,
    daylight: (['day', 'dusk', 'night'] as const)[Math.floor(clamp(random(), 0, 0.999999) * 3)]!,
  }
}

/** Foreground-only choreography. No wall-clock timers, DOM or audio ownership. */
export class TrainDemoController {
  readonly station = new StationSimulation(() => {})
  elapsed = 0
  arrivalTime = 0
  returnTime = 0
  returnDelay = 0
  boardingAt: number | null = null
  private cruisingTime = 0
  private nextAnnouncement = 30
  private weatherChanged = false
  private landed = false
  private listeners = new Set<() => void>()
  private cues = new Set<DemoCue>()
  private snapshot: Snapshot

  constructor(private readonly random: () => number = Math.random, private readonly onCue: (cue: DemoCue) => void = () => {}) {
    this.snapshot = { phase: 'cruising', stage: '靠窗 · 行驶中', environment: randomEnvironment(random), trip: 1, choice: 'calm' }
    this.nextAnnouncement = this.announcementInterval()
  }
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private publish(change: Partial<Snapshot>) { this.snapshot = { ...this.snapshot, ...change }; this.listeners.forEach((listener) => listener()) }
  private stage(stage: string) { if (stage !== this.snapshot.stage) this.publish({ stage }) }
  private cue(cue: DemoCue) { if (!this.cues.has(cue)) { this.cues.add(cue); this.onCue(cue) } }
  private announcementInterval() { return 30 + clamp(this.random()) * 15 }

  choose(choice: DemoChoice) { if (this.snapshot.phase === 'cruising') this.publish({ choice }) }
  depart = () => {
    if (this.snapshot.phase !== 'cruising') return false
    this.arrivalTime = 0; this.landed = false; this.cues.clear()
    this.publish({ phase: 'arriving', stage: '转向侧窗 · 减速进站' })
    this.cue('arrival')
    return true
  }
  returnToTrain = () => {
    if (this.snapshot.phase !== 'station' || !this.station.moveTo(WAITING_POINT)) return false
    this.returnTime = 0; this.boardingAt = null; this.weatherChanged = false
    this.returnDelay = Math.max(0, 11 - this.arrivalTime)
    this.cues.clear()
    this.publish({ phase: 'returning', stage: '走向站台 · 下一班车正在接近' })
    return true
  }
  moveTo(point: { x: number; z: number }) { return this.snapshot.phase === 'station' && this.station.moveTo(point) }

  step(delta: number) {
    if (!Number.isFinite(delta) || delta <= 0) return
    const dt = Math.min(delta, 0.05)
    this.elapsed += dt
    const phase = this.snapshot.phase
    if (phase === 'cruising') {
      this.cruisingTime += dt
      if (this.cruisingTime >= this.nextAnnouncement) {
        this.onCue('cruising')
        this.nextAnnouncement = this.cruisingTime + this.announcementInterval()
      }
      return
    }
    if (phase === 'arriving' || phase === 'station') {
      this.arrivalTime += dt
      if (this.arrivalTime >= 3.2) this.cue('opening')
      if (this.arrivalTime >= 6.6) this.cue('closing')
      if (this.arrivalTime >= 6.4 && !this.landed) {
        this.landed = true
        this.station.position = { ...WAITING_POINT }
      }
      if (phase === 'arriving') {
        this.stage(this.arrivalTime < 2.8 ? '转向侧窗 · 减速进站' : this.arrivalTime < 4 ? '停稳 · 镜头穿过侧窗' : '镜头升高 · 乘客从车门下车')
        if (this.arrivalTime >= 8) {
          this.publish({ phase: 'station', stage: '固定 45° · 列车驶离' })
          this.station.moveTo(STATION.outside)
        }
      } else {
        this.station.step(dt)
        if (this.arrivalTime >= 11) this.stage('固定 45° · 点地面散步')
      }
      return
    }
    this.returnTime += dt
    this.arrivalTime += dt
    const t = this.returnTime - this.returnDelay
    if (this.boardingAt === null) {
      this.station.step(dt)
      if (t >= 4) this.cue('opening')
      if (t >= 4.8 && !this.station.getSnapshot().moving) {
        this.boardingAt = this.returnTime
        this.stage('乘客登车 · 镜头下降')
      }
    } else {
      const b = this.boardingTime
      if (b >= 1.5) this.cue('closing')
      if (b >= 3) this.stage('穿过侧窗 · 回到靠窗座位')
      if (b >= 5.4) this.stage('重新发车 · 下一段旅程')
      // A passing sound barrier covers the window at this exact point.
      if (b >= 6.2 && !this.weatherChanged) {
        this.weatherChanged = true
        this.publish({ environment: randomEnvironment(this.random), trip: this.snapshot.trip + 1 })
      }
      if (b >= 6.9) {
        this.cruisingTime = 0; this.nextAnnouncement = this.announcementInterval()
        this.publish({ phase: 'cruising', stage: '靠窗 · 行驶中' })
      }
    }
  }

  get boardingTime() { return this.boardingAt === null ? 0 : this.returnTime - this.boardingAt }
  get trainZ() {
    if (this.snapshot.phase === 'cruising' || this.snapshot.phase === 'arriving' && this.arrivalTime < 7.2) return 0
    if (this.snapshot.phase === 'returning' && this.returnTime >= this.returnDelay) {
      if (this.boardingAt !== null) return this.boardingTime >= 6.2 ? 0 : 10 * Math.max(0, this.boardingTime - 5.4) ** 2
      return -55 * (1 - between(this.returnTime - this.returnDelay, 0, 4))
    }
    return 4.5 * Math.max(0, this.arrivalTime - 7.2) ** 2
  }
  get trainVisible() { return Math.abs(this.trainZ) < 72 }
  get doorOpen() {
    if (this.snapshot.phase === 'cruising') return 0
    if (this.snapshot.phase === 'returning' && this.returnTime >= this.returnDelay) {
      return this.boardingAt === null ? between(this.returnTime - this.returnDelay, 4, 4.7) : 1 - between(this.boardingTime, 1.5, 2.2)
    }
    return between(this.arrivalTime, 3.2, 3.9) * (1 - between(this.arrivalTime, 6.6, 7.2))
  }
  get stationOffset() { return this.snapshot.phase === 'arriving' ? 36 * (1 - between(this.arrivalTime, 0, 2.8)) : 0 }
  get scenerySpeed() {
    if (this.snapshot.phase === 'cruising') return 9
    if (this.snapshot.phase === 'arriving') return 9 * (1 - between(this.arrivalTime, 0, 2.8))
    return this.snapshot.phase === 'returning' ? this.boardingTime >= 6.2 ? 9 : Math.max(0, this.boardingTime - 5.4) * 5 : 0
  }
  get barrierOpacity() { return this.snapshot.phase === 'returning' && this.boardingAt !== null ? between(this.boardingTime, 5.6, 5.95) * (1 - between(this.boardingTime, 6.45, 6.8)) : 0 }
}
