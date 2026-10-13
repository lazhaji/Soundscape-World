import { expect, it } from 'vitest'
import { STATUSES, statusFromSettings, statusSettings, type StatusChoice } from '../../src/features/status'
import { canUseSocial, musicPolicy } from '../../src/features/modes'
import { StatusGesture } from '../../src/ui/StatusGesture'

it('round-trips all seven choices without changing the persisted settings schema', () => {
  for (const choice of Object.keys(STATUSES) as StatusChoice[]) {
    const settings = statusSettings(choice)
    expect(statusFromSettings(settings)).toBe(choice)
    expect(canUseSocial(settings, true)).toBe(!['sleep', 'focus', 'dnd'].includes(choice))
    expect(canUseSocial(settings, false)).toBe(false)
    expect(musicPolicy(settings).level).toBe(choice === 'sleep' ? 0 : choice === 'anxious' ? 0.65 : 1)
  }
  expect(statusFromSettings({ mode: 'sleep', mood: 'anxious', doNotDisturb: true })).toBe('sleep')
  expect(statusFromSettings({ mode: 'free', mood: 'tired', doNotDisturb: false })).toBe('calm')
})
it('requires selection then the right-drag handle released beyond 85% of its travel, exactly once', () => {
  const g = new StatusGesture('calm')
  g.begin(1, 100, 700, true); g.move(1, 270, 700, 172)
  expect(g.release(1, 172)).toBe(false)
  g.begin(1, 200, 700); g.hold(); expect(g.phase).toBe('Expanded')
  g.release(1, 172); g.select('sleep')
  g.begin(1, 100, 700, true); g.move(1, 246, 700, 172)
  expect(g.release(1, 172)).toBe(false); expect(g.phase).toBe('Selected')
  g.begin(1, 100, 700, true); g.move(1, 247, 700, 172)
  expect(g.release(1, 172)).toBe(true); expect(g.phase).toBe('Confirmed')
  expect(g.release(1, 172)).toBe(false); expect(g.begin(2, 0, 0)).toBe(false)
})
it('handles returning below threshold, vertical escape, cancellation and foreign pointers', () => {
  const g = new StatusGesture('calm'); g.expand(); g.select('dnd')
  g.begin(1, 100, 700, true); expect(g.begin(2, 100, 700, true)).toBe(false)
  g.move(2, 270, 700, 172); expect(g.phase).toBe('Pressing')
  g.move(1, 270, 700, 172); g.move(1, 105, 700, 172)
  expect(g.release(1, 172)).toBe(false)
  g.begin(1, 100, 700, true); g.move(1, 270, 750, 172)
  expect(g.phase).toBe('Selected'); expect(g.release(1, 172)).toBe(false)
  g.begin(1, 200, 700); g.hold(); g.cancel()
  expect(g.choice).toBe('dnd'); expect(g.phase).toBe('Selected')
  g.begin(1, 100, 700, true); g.move(1, 270, 700, 172); g.cancel()
  expect(g.release(1, 172)).toBe(false)
})
it('does not drag the label or accept a left drag, and clamps to the responsive track', () => {
  const g = new StatusGesture('calm'); g.expand(); g.select('happy')
  g.begin(1, 100, 700); g.move(1, 300, 700, 172)
  expect(g.drag).toBe(0); expect(g.release(1, 172)).toBe(false)
  g.begin(1, 100, 700, true); g.move(1, 50, 700, 172)
  expect(g.phase).toBe('Selected'); expect(g.release(1, 172)).toBe(false)
  g.begin(1, 100, 700, true); g.move(1, 300, 700, 168)
  expect(g.drag).toBe(168); expect(g.release(1, 168)).toBe(true)
})
