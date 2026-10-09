import { describe, expect, it } from 'vitest'
import { advancePath, canWalkDirectly, distance, findPath } from '../../src/world/navigation'
import { FURNITURE, isWalkable, STATION } from '../../src/world/stationLayout'
import type { Point } from '../../src/world/stationLayout'

describe('station navigation', () => {
  it('walks through the doorway and returns from both sides of the building', () => {
    for (const start of [STATION.outside, { x: -3.3, z: -3.3 }, { x: 3.3, z: -3.3 }]) {
      for (const [from, to] of [[start, STATION.inside], [STATION.inside, start]] as const) {
        const path = findPath(from, to)
        expect(path).not.toBeNull()
        let position: Point = { ...from }
        for (let frame = 0; frame < 1200 && path!.length; frame++) {
          const next = advancePath(position, path!, 1 / 60)
          expect(isWalkable(next)).toBe(true)
          expect(canWalkDirectly(position, next)).toBe(true)
          position = next
        }
        expect(distance(position, to)).toBeLessThan(0.001)
      }
    }
  })

  it('rejects walls, furniture and off-base/non-finite targets', () => {
    const targets = [{ x: 2.3, z: -1 }, { x: 10, z: 0 }, { x: NaN, z: 0 }, ...FURNITURE.map((rect) => ({ x: (rect.minX + rect.maxX) / 2, z: (rect.minZ + rect.maxZ) / 2 }))]
    targets.forEach((target) => expect(findPath(STATION.outside, target)).toBeNull())
    expect(canWalkDirectly({ x: 3, z: -1 }, STATION.inside)).toBe(false)
  })

  it('replans safely during movement and caps a long frame after backgrounding', () => {
    const initialPath = findPath(STATION.outside, STATION.inside)!
    const position = advancePath(STATION.outside, initialPath, 100)
    expect(distance(position, STATION.outside)).toBeCloseTo(STATION.speed * 0.05)
    const replacement = findPath(position, { x: 3, z: -3 })!
    expect(replacement).not.toBeNull()
    let from = position
    replacement.forEach((next) => { expect(canWalkDirectly(from, next)).toBe(true); from = next })
  })
})
