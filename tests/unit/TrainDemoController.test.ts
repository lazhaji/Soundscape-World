import { describe, expect, it } from 'vitest'
import { TrainDemoController, WAITING_POINT, randomEnvironment } from '../../src/demo/train/TrainDemoController'
import { sampleShot, stationShot } from '../../src/demo/train/cinematography'
import { STATION } from '../../src/world/stationLayout'

function advance(model: TrainDemoController, seconds: number) { for (let i = 0; i < Math.ceil(seconds * 60); i++) model.step(1 / 60) }

describe('train cinematic contracts', () => {
  it('stops before crossing the actual side-window plane, then alights before departure', () => {
    const model = new TrainDemoController(() => 0)
    expect(model.returnToTrain()).toBe(false)
    model.depart(); expect(model.depart()).toBe(false)
    advance(model, 2.8)
    expect(model.stationOffset).toBeCloseTo(0)
    expect(sampleShot(model, 0.5, false).eye[0]).toBeLessThan(-3.95)
    advance(model, 1.2)
    expect(sampleShot(model, 0.5, false).eye[0]).toBeGreaterThan(-3.95)
    advance(model, 2.5)
    expect(model.station.position).toEqual(WAITING_POINT)
    expect(model.trainZ).toBe(0)
    advance(model, 1.6)
    expect(model.getSnapshot().phase).toBe('station')
    expect(model.trainZ).toBeGreaterThan(0)
    expect(model.doorOpen).toBe(0)
  })
  it('finishes old departure before approaching with the next train', () => {
    const model = new TrainDemoController(() => 0)
    model.depart(); advance(model, 8.1)
    expect(model.returnToTrain()).toBe(true)
    expect(model.returnToTrain()).toBe(false)
    expect(model.returnDelay).toBeGreaterThan(2.8)
    advance(model, 2)
    expect(model.trainZ).toBeGreaterThan(0)
    expect(model.boardingAt).toBeNull()
    advance(model, 1)
    expect(model.trainZ).toBeLessThan(-50)
  })
  it('returns from inside via navigation, boards a stopped train and changes weather only under cover', () => {
    let random = 0
    const model = new TrainDemoController(() => random)
    model.depart(); advance(model, 12)
    model.moveTo(STATION.inside); advance(model, 5)
    expect(model.station.getSnapshot().zone).toBe('inside')
    const original = model.getSnapshot().environment
    random = 0.9
    model.returnToTrain()
    let guard = 0
    while (model.boardingAt === null && guard++ < 1000) model.step(1 / 60)
    expect(model.boardingAt).not.toBeNull()
    expect(model.trainZ).toBe(0)
    expect(model.doorOpen).toBe(1)
    expect(model.station.position).toEqual(WAITING_POINT)
    advance(model, 6)
    expect(model.getSnapshot().environment).toEqual(original)
    advance(model, 0.25)
    expect(model.barrierOpacity).toBe(1)
    expect(model.getSnapshot().environment).toEqual({ weather: 'rain', daylight: 'night' })
    advance(model, 0.7)
    expect(model.getSnapshot().phase).toBe('cruising')
    expect(model.getSnapshot().trip).toBe(2)
  })
  it('keeps all event timings under reduced motion and settles at exactly 45 degrees', () => {
    const model = new TrainDemoController(() => 0)
    model.depart(); advance(model, 4.2)
    expect(model.getSnapshot().phase).toBe('arriving')
    expect(sampleShot(model, 0.46, true)).toEqual(stationShot(0.46))
    const shot = stationShot(0.46)
    expect(shot.eye[1] - shot.target[1]).toBeCloseTo(Math.hypot(shot.eye[0] - shot.target[0], shot.eye[2] - shot.target[2]))
  })
  it('does not jump to completion after stalled frames or accept movement mid-cinematic', () => {
    const model = new TrainDemoController(() => 0)
    model.depart(); model.step(100); model.step(NaN); model.step(-1)
    expect(model.arrivalTime).toBe(0.05)
    expect(model.moveTo(STATION.inside)).toBe(false)
    const choice = model.getSnapshot().choice
    model.choose('sleep'); expect(model.getSnapshot().choice).toBe(choice)
  })
  it('schedules periodic announcement cues at 30–45 seconds, never in the shop', () => {
    const cues: string[] = []
    const model = new TrainDemoController(() => 0.5, (cue) => cues.push(cue))
    advance(model, 37); expect(cues).toEqual([])
    advance(model, 1); expect(cues).toEqual(['cruising'])
    model.depart(); advance(model, 50)
    expect(cues.filter((cue) => cue === 'cruising')).toHaveLength(1)
    expect(cues).toContain('opening'); expect(cues).toContain('closing')
  })
  it('draws weather and daylight independently, allowing all nine pairs', () => {
    const combinations = new Set<string>()
    for (const weather of [0, 0.4, 0.8]) for (const daylight of [0, 0.4, 0.8]) {
      let first = true
      combinations.add(JSON.stringify(randomEnvironment(() => { const n = first ? weather : daylight; first = false; return n })))
    }
    expect(combinations.size).toBe(9)
  })
})
