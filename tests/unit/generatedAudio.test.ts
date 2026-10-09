import { describe, expect, it } from 'vitest'
import { fillDemoMusic, fillRain, MUSIC_DURATION } from '../../src/audio/generatedAudio'

describe('original generated audio buffers', () => {
  it('has audible, finite, unclipped music with a continuous cyclic tail', () => {
    const rate = 8000
    const samples = new Float32Array(rate * MUSIC_DURATION)
    fillDemoMusic(samples, rate)
    expect(samples.every((sample) => Number.isFinite(sample) && Math.abs(sample) < 0.5)).toBe(true)
    const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length)
    expect(rms).toBeGreaterThan(0.03)
    expect(Math.abs(samples[0]! - samples[samples.length - 1]!)).toBeLessThan(0.015)
  })
  it('keeps rain output bounded and blends the wrap into its loop-start sample', () => {
    const rate = 8000
    const samples = new Float32Array(rate * 8)
    fillRain(samples, rate)
    expect(samples.every((sample) => Number.isFinite(sample) && Math.abs(sample) < 0.5)).toBe(true)
    expect(samples[samples.length - 1]).toBe(samples[Math.floor(rate * 0.12) - 1])
  })
})
