import { advancePath, distance, findPath } from './navigation'
import { STATION } from './stationLayout'
import type { Point } from './stationLayout'
import { detectZone, shouldOpenDoor } from './zones'
import type { WorldZone } from './zones'

interface StationSnapshot { zone: WorldZone; moving: boolean; message: string; destination: Point | null }

export class StationSimulation {
  position: Point = { ...STATION.outside }
  heading = Math.PI
  private path: Point[] = []
  private listeners = new Set<() => void>()
  private snapshot: StationSnapshot = { zone: 'outside', moving: false, message: '点击地面，慢慢走进灯光里', destination: null }

  constructor(private readonly onZone: (zone: WorldZone) => void) {}
  getSnapshot = (): StationSnapshot => this.snapshot
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private publish(change: Partial<StationSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...change }
    this.listeners.forEach((listener) => listener())
  }

  moveTo = (destination: Point): boolean => {
    const path = findPath(this.position, destination)
    if (!path) { this.publish({ message: '这里暂时无法到达，请点击空地或店内走道' }); return false }
    this.path = path
    this.publish({ moving: true, destination: { ...destination }, message: '正在前往点击的位置…' })
    return true
  }

  step(delta: number): void {
    if (!this.path.length) return
    const old = this.position
    this.position = advancePath(old, this.path, delta)
    if (distance(old, this.position) > 0.0001) this.heading = Math.atan2(this.position.x - old.x, this.position.z - old.z)
    const zone = detectZone(this.position, this.snapshot.zone)
    if (zone !== this.snapshot.zone) { this.onZone(zone); this.publish({ zone }) }
    if (!this.path.length) this.publish({ moving: false, message: '已到达 · 再点一处，继续散步' })
  }

  get doorOpen(): boolean { return shouldOpenDoor(this.position) }
  get cutaway(): boolean { return this.snapshot.zone !== 'outside' || this.doorOpen }
}
