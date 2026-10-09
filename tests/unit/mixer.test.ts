import { describe, expect, it } from 'vitest'
import { rampValue, SmoothGain } from '../../src/audio/mixer'
import { mockAudio } from '../helpers/audio'

describe('smooth gain scheduling', () => {
  it('interpolates and reaches exact silence at the ramp end', () => {
    const ramp = { from: 1, to: 0, start: 2, end: 3 }
    expect(rampValue(ramp, 1)).toBe(1)
    expect(rampValue(ramp, 2.5)).toBe(0.5)
    expect(rampValue(ramp, 3)).toBe(0)
    expect(rampValue(ramp, 100)).toBe(0)
  })
  it('retargets from the actual in-flight value, avoiding jumps under fast reversals', () => {
    const { context } = mockAudio()
    const node = context.createGain()
    const gain = new SmoothGain(node as unknown as GainNode, 0, 0)
    gain.set(1, 0, 1)
    gain.set(0, 0.4, 1)
    expect(node.gain.setValueAtTime).toHaveBeenLastCalledWith(0.4, 0.4)
    expect(gain.value(0.9)).toBeCloseTo(0.2)
    expect(gain.value(1.4)).toBe(0)
  })
})
