import { expect, it } from 'vitest'
import { StationSimulation } from '../../src/world/StationSimulation'
import { STATION } from '../../src/world/stationLayout'
import { mockAudio } from '../helpers/audio'

it('moves the real model through ten return journeys, driving gains without new sources', async () => {
  const { engine, advance, sources } = mockAudio()
  const transitions: string[] = []
  const model = new StationSimulation((zone) => { transitions.push(zone); engine.setWorldZone(zone) })
  await engine.startFromGesture()
  for (let journey = 0; journey < 10; journey++) {
    for (const destination of [STATION.inside, STATION.outside]) {
      expect(model.moveTo(destination)).toBe(true)
      for (let frame = 0; frame < 500 && model.getSnapshot().moving; frame++) { model.step(1 / 60); advance(1 / 60) }
      expect(model.getSnapshot().moving).toBe(false)
      advance(1)
      expect(engine.getDiagnostics().musicGain).toBe(destination === STATION.inside ? 1 : 0)
      expect(model.cutaway).toBe(destination === STATION.inside)
    }
  }
  expect(transitions).toEqual(Array.from({ length: 10 }, () => ['doorway', 'inside', 'doorway', 'outside']).flat())
  expect(sources).toHaveLength(3)
  expect(engine.getDiagnostics().sourceBuilds).toBe(1)
  expect(engine.getPlaybackSeconds()).toBeGreaterThan(30)
  sources.forEach((source) => expect(source.start).toHaveBeenCalledTimes(1))
})
