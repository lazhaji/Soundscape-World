import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../../src/features/modes'
import { mockAudio } from '../helpers/audio'

describe('journey audio policy', () => {
  it('keeps one transport through train/station transitions and preserves paused state', async () => {
    const { engine, sources, advance, factory } = mockAudio()
    engine.setWorldZone('train'); engine.setModeSettings(DEFAULT_SETTINGS)
    expect(factory).not.toHaveBeenCalled()
    await engine.startFromGesture()
    expect(engine.getDiagnostics()).toMatchObject({ musicGain: 0, rainGain: 0, trainGain: 1 })
    for (let index = 0; index < 10; index++) {
      engine.setTrainMoving(false); advance(2)
      engine.setWorldZone('outside'); advance(1)
      expect(engine.getDiagnostics()).toMatchObject({ musicGain: 0, rainGain: 1, trainGain: 0 })
      engine.setWorldZone('inside'); advance(1)
      expect(engine.getDiagnostics()).toMatchObject({ musicGain: 1, trainGain: 0 })
      engine.setWorldZone('train'); engine.setTrainMoving(true); advance(1)
    }
    expect(sources).toHaveLength(3)
    sources.forEach((source) => expect(source.start).toHaveBeenCalledOnce())
    const time = engine.getPlaybackSeconds()
    engine.pause(); engine.setModeSettings({ ...DEFAULT_SETTINGS, mode: 'sleep' }); engine.setWorldZone('inside'); advance(5)
    expect(engine.getSnapshot().status).toBe('paused')
    expect(engine.getPlaybackSeconds()).toBe(time)
    await engine.startFromGesture(); advance(1)
    expect(engine.getDiagnostics()).toMatchObject({ musicGain: 1, policyGain: 0, rainGain: 0.25 })
    engine.setModeSettings({ ...DEFAULT_SETTINGS, mode: 'focus', mood: 'tired' }); advance(1)
    expect(engine.getDiagnostics().policyGain).toBe(0.65)
    expect(engine.getSnapshot().musicVolume).toBe(0.55)
    expect(sources).toHaveLength(3)
  })

  it('runtime binds arrival, real position, mode and return without letting station override train', async () => {
    vi.resetModules()
    const { journey, station } = await import('../../src/app/runtime')
    const { audioEngine } = await import('../../src/audio/engine')
    expect(audioEngine.getSnapshot().zone).toBe('train')
    journey.openModes(); journey.confirmModes({ ...DEFAULT_SETTINGS, mode: 'sleep' }); journey.finishArrival()
    expect(audioEngine.getSnapshot()).toMatchObject({ zone: 'outside', settings: { mode: 'sleep' }, status: 'idle' })
    for (let frame = 0; frame < 120; frame++) station.step(1 / 60)
    expect(station.position.x).toBeCloseTo(0)
    journey.returnToTrain()
    station.moveTo({ x: 0, z: -0.9 })
    for (let frame = 0; frame < 120; frame++) station.step(1 / 60)
    expect(audioEngine.getSnapshot().zone).toBe('train')
  })
})
