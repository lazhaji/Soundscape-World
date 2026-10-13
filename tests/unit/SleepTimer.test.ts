import { expect, it, vi } from 'vitest'
import { SleepTimer } from '../../src/audio/SleepTimer'

it('corrects a long background gap using absolute time and expires exactly once', () => {
  let now = 1000
  const expire = vi.fn(), timer = new SleepTimer(expire, () => now)
  timer.start(25, 'music'); expect(timer.state?.expiresAt).toBe(1501000)
  now += 60000; expect(timer.tick()).toBe(false)
  now += 60 * 60000; expect(timer.tick()).toBe(true)
  timer.tick(); timer.tick(); expect(expire).toHaveBeenCalledExactlyOnceWith('music'); expect(timer.state).toBeNull()
})
it('cancels/replaces deadlines and clears the old state before a reentrant expiry callback', () => {
  let now = 0
  const timer = new SleepTimer(() => timer.start(15, 'music'), () => now)
  timer.start(1, 'all'); timer.cancel(); now = 70000; expect(timer.tick()).toBe(false)
  timer.start(1, 'all'); timer.start(2, 'all'); now += 60000; expect(timer.tick()).toBe(false)
  now += 60000; expect(timer.tick()).toBe(true); expect(timer.state?.action).toBe('music')
})
it('rejects invalid values without changing a valid timer', () => {
  const timer = new SleepTimer(vi.fn(), () => 0)
  timer.start(30, 'all')
  for (const minutes of [NaN, Infinity, 0, -1, 181]) expect(() => timer.start(minutes, 'music')).toThrow()
  expect(timer.state).toEqual({ expiresAt: 1800000, action: 'all' })
})
