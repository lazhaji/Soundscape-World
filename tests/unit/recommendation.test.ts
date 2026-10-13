import { expect, it } from 'vitest'
import { CATALOG } from '../../src/audio/catalog'
import { DEFAULT_SETTINGS } from '../../src/features/modes'
import { likedTracks, recommendTrack, scoreTrack, type Feedback } from '../../src/audio/recommendation'

it('hard-filters before scoring, including manipulated sleep metadata', () => {
  const melody = { ...CATALOG[0]!, eligibleModes: ['sleep' as const] }
  expect(recommendTrack({ ...DEFAULT_SETTINGS, mode: 'sleep' }, [melody], [], [], () => 0)).toBeNull()
  expect(recommendTrack({ ...DEFAULT_SETTINGS, mode: 'focus' }, [{ ...CATALOG[0]!, instrumental: false }], [], [], () => 0)).toBeNull()
  for (const mode of ['focus', 'sleep', 'relax', 'free'] as const) {
    const track = recommendTrack({ ...DEFAULT_SETTINGS, mode }, CATALOG, [], [], () => 0)!
    expect(track.eligibleModes).toContain(mode)
    if (mode === 'sleep') expect(['white', 'pink']).toContain(track.generator)
  }
  expect(recommendTrack(DEFAULT_SETTINGS, [], [], [])).toBeNull()
})
it('uses 0.45/0.30/0.25 weights, neutral missing preference, and real likes/skips', () => {
  const track = CATALOG[0]!, events: Feedback[] = [{ id: '1', trackId: track.id, kind: 'like', at: 1 }]
  expect(scoreTrack(track, DEFAULT_SETTINGS, CATALOG, [], [])).toBeCloseTo(0.85)
  expect(scoreTrack(track, DEFAULT_SETTINGS, CATALOG, events, [])).toBe(1)
  events.push({ id: '2', trackId: track.id, kind: 'skip', at: 2 })
  expect(scoreTrack(track, DEFAULT_SETTINGS, CATALOG, events, [])).toBeCloseTo(0.94)
  events.push({ id: '3', trackId: track.id, kind: 'unlike', at: 3 })
  expect(likedTracks(events).size).toBe(0)
  expect(scoreTrack(track, DEFAULT_SETTINGS, CATALOG, [], [track.id])).toBeCloseTo(0.6)
})
it('has deterministic weighted sampling, deduplicates ids, and relaxes only oldest history', () => {
  expect(recommendTrack(DEFAULT_SETTINGS, CATALOG, [], [], () => 0)?.id).toBe(CATALOG[0]!.id)
  expect(recommendTrack(DEFAULT_SETTINGS, CATALOG, [], [], () => 1)?.id).toBe(CATALOG[2]!.id)
  const recent = CATALOG.map((track) => track.id)
  expect(recommendTrack(DEFAULT_SETTINGS, [...CATALOG, CATALOG[0]!], [], recent, () => 0.9)?.id).toBe(recent[0])
  expect(recommendTrack(DEFAULT_SETTINGS, CATALOG, [], [recent[0]!], () => 0)?.id).not.toBe(recent[0])
  expect(recommendTrack(DEFAULT_SETTINGS, [CATALOG[0]!], [], [recent[0]!], () => NaN)?.id).toBe(recent[0])
})
