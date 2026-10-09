import { describe, expect, it } from 'vitest'
import { ARRIVAL, JourneyController } from '../../src/app/JourneyController'
import { DEFAULT_SETTINGS } from '../../src/features/modes'

describe('journey transitions', () => {
  it('starts on train and rejects confirmations, completions and returns out of order', () => {
    const journey = new JourneyController()
    expect(journey.getSnapshot().phase).toBe('train')
    expect(journey.confirmModes(DEFAULT_SETTINGS)).toBe(false)
    journey.finishArrival(); journey.returnToTrain(); journey.step(5)
    expect(journey.getSnapshot().phase).toBe('train')
  })
  it('cancels mode selection without applying a draft', () => {
    const journey = new JourneyController()
    journey.openModes(); journey.closeModes()
    expect(journey.getSnapshot()).toMatchObject({ phase: 'train', settings: DEFAULT_SETTINGS })
  })
  it('progresses through braking, doors, disembarkation and camera once', () => {
    const journey = new JourneyController()
    const stages = new Set<string>()
    journey.subscribe(() => stages.add(journey.getSnapshot().stage))
    journey.openModes()
    expect(journey.confirmModes({ ...DEFAULT_SETTINGS, mode: 'focus' })).toBe(true)
    expect(journey.confirmModes({ ...DEFAULT_SETTINGS, mode: 'sleep' })).toBe(false)
    for (let frame = 0; frame < 302; frame++) journey.step(1 / 60)
    expect([...stages]).toEqual(['braking', 'opening', 'alighting', 'lifting'])
    expect(journey.getSnapshot()).toMatchObject({ phase: 'home_station', hasArrived: true, settings: { mode: 'focus' } })
    expect(journey.arrivalSeconds).toBe(ARRIVAL.complete)
  })
  it('allows cancellation and skip at every arrival stage with no stale timer', () => {
    for (const seconds of [0, 1.8, 2.6, 3.6]) {
      const journey = new JourneyController()
      journey.openModes(); journey.confirmModes(DEFAULT_SETTINGS)
      for (let frame = 0; frame < seconds * 60; frame++) journey.step(1 / 60)
      journey.returnToTrain(); journey.step(50)
      expect(journey.getSnapshot().phase).toBe('train')
      journey.openModes(); journey.confirmModes(DEFAULT_SETTINGS); journey.finishArrival()
      expect(journey.getSnapshot().phase).toBe('home_station')
      journey.returnToTrain()
      expect(journey.arrivalSeconds).toBe(0)
    }
  })
  it('reduced motion completes safely and invalid/large frame times cannot jump', () => {
    const journey = new JourneyController()
    journey.openModes(); journey.confirmModes(DEFAULT_SETTINGS)
    for (const delta of [NaN, Infinity, -1, 0]) journey.step(delta)
    expect(journey.arrivalSeconds).toBe(0)
    journey.step(60)
    expect(journey.arrivalSeconds).toBe(0.1)
    journey.step(1 / 60, true)
    expect(journey.getSnapshot().phase).toBe('home_station')
  })
  it('restores validated preferences but ignores late reads after the user starts choosing', () => {
    const journey = new JourneyController()
    journey.restoreSettings({ ...DEFAULT_SETTINGS, mode: 'sleep', mood: 'tired', doNotDisturb: true })
    expect(journey.getSnapshot().settings.mode).toBe('sleep')
    journey.openModes(); journey.restoreSettings(DEFAULT_SETTINGS); journey.closeModes()
    journey.restoreSettings(DEFAULT_SETTINGS)
    expect(journey.getSnapshot().settings.mode).toBe('sleep')
  })
})
