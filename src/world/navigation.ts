import { isWalkable, OBSTACLES, STATION } from './stationLayout'
import type { Point, Rect } from './stationLayout'

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.z - b.z)

function intersects(a: Point, b: Point, rect: Rect): boolean {
  let near = 0
  let far = 1
  for (const [origin, delta, min, max] of [
    [a.x, b.x - a.x, rect.minX, rect.maxX],
    [a.z, b.z - a.z, rect.minZ, rect.maxZ],
  ] as const) {
    if (Math.abs(delta) < 1e-9) {
      if (origin < min || origin > max) return false
    } else {
      const first = (min - origin) / delta
      const last = (max - origin) / delta
      near = Math.max(near, Math.min(first, last))
      far = Math.min(far, Math.max(first, last))
      if (near > far) return false
    }
  }
  return true
}

export function canWalkDirectly(a: Point, b: Point): boolean {
  return isWalkable(a) && isWalkable(b) && !OBSTACLES.some((rect) => intersects(a, b, rect))
}

// Small visibility graph: clearance-expanded rectangle corners, no navigation dependency.
// Every edge is collision-tested, including target changes halfway through a journey.
const corners: Point[] = OBSTACLES.flatMap((rect) => [
  { x: rect.minX - 0.015, z: rect.minZ - 0.015 },
  { x: rect.maxX + 0.015, z: rect.minZ - 0.015 },
  { x: rect.minX - 0.015, z: rect.maxZ + 0.015 },
  { x: rect.maxX + 0.015, z: rect.maxZ + 0.015 },
]).filter(isWalkable)

export function findPath(start: Point, destination: Point): Point[] | null {
  if (!isWalkable(destination) || !isWalkable(start)) return null
  if (canWalkDirectly(start, destination)) return [{ ...destination }]
  const nodes = [start, destination, ...corners]
  const cost = nodes.map(() => Infinity)
  const previous = nodes.map(() => -1)
  const visited = new Set<number>()
  cost[0] = 0
  for (let iteration = 0; iteration < nodes.length; iteration += 1) {
    let current = -1
    let best = Infinity
    cost.forEach((value, index) => { if (!visited.has(index) && value < best) { current = index; best = value } })
    if (current < 0) break
    if (current === 1) {
      const path: Point[] = []
      for (let index = 1; index > 0; index = previous[index] ?? -1) {
        const point = nodes[index]
        if (point) path.unshift({ ...point })
      }
      return path
    }
    visited.add(current)
    const from = nodes[current]!
    nodes.forEach((to, index) => {
      if (visited.has(index) || !canWalkDirectly(from, to)) return
      const candidate = best + distance(from, to)
      if (candidate < cost[index]!) { cost[index] = candidate; previous[index] = current }
    })
  }
  return null
}

export function advancePath(position: Point, path: Point[], delta: number): Point {
  let remaining = STATION.speed * Math.max(0, Math.min(delta, 0.05))
  let point = { ...position }
  while (remaining > 0 && path.length) {
    const next = path[0]!
    const length = distance(point, next)
    if (length <= remaining) { point = { ...next }; path.shift(); remaining -= length }
    else {
      point = { x: point.x + (next.x - point.x) * remaining / length, z: point.z + (next.z - point.z) * remaining / length }
      remaining = 0
    }
  }
  return point
}
