export interface Point { x: number; z: number }
export interface Rect { minX: number; maxX: number; minZ: number; maxZ: number }

export const STATION = {
  halfSize: 4,
  playerRadius: 0.18,
  speed: 2.2,
  store: { minX: -2.3, maxX: 2.3, minZ: -2.7, maxZ: 0.7 },
  doorwayHalfWidth: 0.65,
  outside: { x: 0, z: 2.6 },
  inside: { x: 0, z: -0.9 },
  threshold: { x: 0, z: 0.7 },
} as const

// One layout contract drives collision, visible walls and replaceable furnishings.
export const WALLS: Rect[] = [
  { minX: -2.4, maxX: -2.2, minZ: -2.8, maxZ: 0.8 },
  { minX: 2.2, maxX: 2.4, minZ: -2.8, maxZ: 0.8 },
  { minX: -2.4, maxX: 2.4, minZ: -2.8, maxZ: -2.6 },
  { minX: -2.2, maxX: -0.65, minZ: 0.6, maxZ: 0.8 },
  { minX: 0.65, maxX: 2.2, minZ: 0.6, maxZ: 0.8 },
]
export const FURNITURE: (Rect & { kind: 'shelf' | 'counter' | 'fridge' })[] = [
  { minX: -1.9, maxX: -1.3, minZ: -2.25, maxZ: -0.45, kind: 'shelf' },
  { minX: 0.9, maxX: 1.8, minZ: -0.5, maxZ: 0.15, kind: 'counter' },
  { minX: 0.6, maxX: 1.95, minZ: -2.3, maxZ: -1.7, kind: 'fridge' },
]
export const OBSTACLES: Rect[] = [...WALLS, ...FURNITURE].map((rect) => ({
  minX: rect.minX - STATION.playerRadius, maxX: rect.maxX + STATION.playerRadius,
  minZ: rect.minZ - STATION.playerRadius, maxZ: rect.maxZ + STATION.playerRadius,
}))

export function contains(rect: Rect, point: Point): boolean {
  return point.x >= rect.minX && point.x <= rect.maxX && point.z >= rect.minZ && point.z <= rect.maxZ
}

export function isWalkable(point: Point): boolean {
  const limit = STATION.halfSize - STATION.playerRadius
  return Number.isFinite(point.x) && Number.isFinite(point.z) && Math.abs(point.x) <= limit && Math.abs(point.z) <= limit && !OBSTACLES.some((rect) => contains(rect, point))
}
