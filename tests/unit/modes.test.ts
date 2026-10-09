import { describe, expect, it } from 'vitest'
import { canUseSocial, DEFAULT_SETTINGS, MODES, MOODS, musicPolicy, parseSettings } from '../../src/features/modes'
import type { SceneMode, Mood } from '../../src/features/modes'

describe('mode policy and settings boundary', () => {
  it.each(Object.keys(MODES) as SceneMode[])('%s requires explicit social opt-in and obeys independent DND', (mode) => {
    for (const doNotDisturb of [true, false]) {
      const settings = { ...DEFAULT_SETTINGS, mode, doNotDisturb }
      expect(canUseSocial(settings, false)).toBe(false)
      expect(canUseSocial(settings, true)).toBe(!doNotDisturb && (mode === 'relax' || mode === 'free'))
      expect(musicPolicy(settings)).toEqual(musicPolicy({ ...settings, doNotDisturb: !doNotDisturb }))
    }
  })
  it.each(Object.keys(MOODS) as Mood[])('sleep rejects the demo track regardless of %s mood', (mood) => {
    expect(musicPolicy({ ...DEFAULT_SETTINGS, mode: 'sleep', mood })).toMatchObject({ eligible: false, level: 0 })
    expect(musicPolicy({ ...DEFAULT_SETTINGS, mode: 'focus', mood }).eligible).toBe(true)
  })
  it('softens tired/anxious listening without changing user volume', () => {
    expect(musicPolicy({ ...DEFAULT_SETTINGS, mood: 'tired' }).level).toBeLessThan(musicPolicy(DEFAULT_SETTINGS).level)
    expect(musicPolicy({ ...DEFAULT_SETTINGS, mood: 'anxious' }).level).toBe(0.65)
  })
  it('accepts only known separate settings and drops unrelated fields', () => {
    expect(parseSettings({ ...DEFAULT_SETTINGS, messages: ['never persist'], radarEnabled: true })).toEqual(DEFAULT_SETTINGS)
    for (const value of [null, {}, { ...DEFAULT_SETTINGS, mode: '__proto__' }, { ...DEFAULT_SETTINGS, mood: 'constructor' }, { ...DEFAULT_SETTINGS, doNotDisturb: 'false' }]) expect(parseSettings(value)).toBeNull()
  })
})
