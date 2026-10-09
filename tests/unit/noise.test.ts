import { describe, expect, it } from 'vitest'
import { fillWhiteNoise } from '../../src/audio/noise'

describe('original white noise', () => {
  it('maps the random range to PCM samples without clipping', () => {
    const samples = new Float32Array(3)
    const values = [0, 0.5, 1 - Number.EPSILON]
    let index = 0
    fillWhiteNoise(samples, () => values[index++] ?? 0.5)
    expect(Array.from(samples)).toEqual([-1, 0, 1])
  })

  it('fills every sample with finite values in [-1, 1]', () => {
    const samples = new Float32Array(96000)
    fillWhiteNoise(samples)
    expect(samples.every((sample) => Number.isFinite(sample) && Math.abs(sample) <= 1)).toBe(true)
    expect(samples.some((sample) => sample !== 0)).toBe(true)
  })
})
