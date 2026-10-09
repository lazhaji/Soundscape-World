import { contains, STATION } from './stationLayout'
import type { Point } from './stationLayout'

export type WorldZone = 'outside' | 'doorway' | 'inside'
export const ZONE_NAMES: Record<WorldZone, string> = { outside: '店外', doorway: '门口', inside: '店内' }

/** Hysteresis around the two edges of the doorway; unrelated to camera/target position. */
export function detectZone(position: Point, previous: WorldZone): WorldZone {
  const front = STATION.store.maxZ
  const inDoor = Math.abs(position.x) <= STATION.doorwayHalfWidth + 0.1
  if (inDoor && position.z >= front - 0.55 && position.z <= front + 0.6) {
    if (previous === 'outside' && position.z > front + 0.3) return 'outside'
    if (previous === 'inside' && position.z < front - 0.25) return 'inside'
    if (previous === 'doorway') {
      if (position.z > front + 0.45) return 'outside'
      if (position.z < front - 0.4) return 'inside'
    }
    return 'doorway'
  }
  return contains(STATION.store, position) ? 'inside' : 'outside'
}

export function shouldOpenDoor(position: Point): boolean {
  return Math.abs(position.x) < 1 && Math.abs(position.z - STATION.store.maxZ) < 1.15
}
