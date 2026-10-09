import { describe, expect, it } from 'vitest'
import { detectZone, shouldOpenDoor } from '../../src/world/zones'
import type { WorldZone } from '../../src/world/zones'
import { STATION } from '../../src/world/stationLayout'

describe('player-position zones', () => {
  it('distinguishes outside, doorway and inside; the side wall is not an entrance', () => {
    expect(detectZone(STATION.outside, 'outside')).toBe('outside')
    expect(detectZone(STATION.threshold, 'outside')).toBe('doorway')
    expect(detectZone(STATION.inside, 'doorway')).toBe('inside')
    expect(detectZone({ x: 3, z: -1 }, 'inside')).toBe('outside')
  })

  it('does not chatter when position jitters around either threshold', () => {
    let zone: WorldZone = 'outside'
    zone = detectZone({ x: 0, z: 0.99 }, zone)
    expect(zone).toBe('doorway')
    for (const z of [1.01, 0.99, 1.05, 1.1]) expect(detectZone({ x: 0, z }, zone)).toBe('doorway')
    zone = detectZone({ x: 0, z: 0.29 }, zone)
    expect(zone).toBe('inside')
    for (const z of [0.31, 0.28, 0.4, 0.42]) expect(detectZone({ x: 0, z }, zone)).toBe('inside')
    expect(detectZone({ x: 0, z: 0.5 }, zone)).toBe('doorway')
  })

  it('opens early enough to clear the character on either approach', () => {
    expect(shouldOpenDoor({ x: 0, z: 1.7 })).toBe(true)
    expect(shouldOpenDoor({ x: 0, z: -0.3 })).toBe(true)
    expect(shouldOpenDoor(STATION.outside)).toBe(false)
    expect(shouldOpenDoor({ x: 3, z: 0.7 })).toBe(false)
  })
})
