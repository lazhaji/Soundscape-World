import { afterEach, describe, expect, it, vi } from 'vitest'
import { AudioEngine } from '../../src/audio/AudioEngine'
import { mockAudio } from '../helpers/audio'

afterEach(() => vi.useRealTimers())

describe('application audio transport', () => {
  it('creates no audio on construction, subscription or zone changes', () => {
    const { engine, factory } = mockAudio()
    engine.setWorldZone('inside')
    engine.subscribe(vi.fn())()
    expect(engine.getSnapshot().status).toBe('idle')
    expect(factory).not.toHaveBeenCalled()
  })

  it('resumes synchronously in a gesture and creates exactly one music/rain/train source', async () => {
    const { engine, factory, context, sources, buffers } = mockAudio()
    const operation = engine.startFromGesture()
    expect(context.resume).toHaveBeenCalledTimes(1)
    expect(engine.startFromGesture()).toBe(operation)
    await operation
    await engine.startFromGesture()
    expect(factory).toHaveBeenCalledTimes(1)
    expect(buffers).toHaveBeenCalledTimes(1)
    expect(sources).toHaveLength(3)
    sources.forEach((source) => { expect(source.start).toHaveBeenCalledTimes(1); expect(source.loop).toBe(true) })
    expect(engine.getSnapshot().status).toBe('playing')
  })

  it('does not rebuild/restart/seek either source after ten journeys and preserves the timeline', async () => {
    const { engine, sources, advance } = mockAudio()
    await engine.startFromGesture()
    for (let index = 0; index < 10; index++) {
      engine.setWorldZone('doorway'); advance(1)
      engine.setWorldZone('inside'); advance(1)
      expect(engine.getDiagnostics().musicGain).toBe(1)
      expect(engine.getDiagnostics().rainGain).toBe(0.25)
      engine.setWorldZone('doorway'); advance(1)
      engine.setWorldZone('outside'); advance(1)
      expect(engine.getDiagnostics().musicGain).toBe(0)
      expect(engine.getDiagnostics().rainGain).toBe(1)
    }
    expect(engine.getPlaybackSeconds()).toBe(40)
    expect(engine.getDiagnostics().sourceBuilds).toBe(1)
    expect(sources).toHaveLength(3)
    sources.forEach((source) => { expect(source.start).toHaveBeenCalledTimes(1); expect(source.stop).not.toHaveBeenCalled() })
  })

  it('pauses and resumes the same transport without resetting or advancing paused time', async () => {
    const { engine, advance, sources } = mockAudio()
    await engine.startFromGesture(); advance(7)
    engine.pause(); advance(25)
    engine.setWorldZone('inside')
    expect(engine.getPlaybackSeconds()).toBe(7)
    expect(engine.getSnapshot().status).toBe('paused')
    await engine.startFromGesture(); advance(2)
    expect(engine.getPlaybackSeconds()).toBe(9)
    expect(sources).toHaveLength(3)
    expect(engine.getDiagnostics().musicGain).toBe(1)
  })

  it('does not restart when a UI subscription is replaced', async () => {
    const { engine, sources } = mockAudio()
    const unsubscribe = engine.subscribe(vi.fn())
    await engine.startFromGesture(); unsubscribe()
    engine.subscribe(vi.fn())()
    expect(engine.getSnapshot().status).toBe('playing')
    sources.forEach((source) => expect(source.stop).not.toHaveBeenCalled())
  })

  it('keeps user volume independent from zone gain and clamps invalid inputs', async () => {
    const { engine, advance } = mockAudio()
    await engine.startFromGesture()
    engine.setVolume('music', 0.25); engine.setWorldZone('inside'); advance(1)
    expect(engine.getSnapshot().musicVolume).toBe(0.25)
    expect(engine.getDiagnostics().musicGain).toBe(1)
    engine.setWorldZone('outside'); engine.setVolume('music', 1); advance(1)
    expect(engine.getDiagnostics().musicGain).toBe(0)
    engine.setVolume('rain', 3); engine.setVolume('music', NaN)
    expect(engine.getSnapshot().rainVolume).toBe(1)
    expect(engine.getSnapshot().musicVolume).toBe(1)
  })

  it('applies the current zone if the player walks inside before enabling audio', async () => {
    const { engine } = mockAudio()
    engine.setWorldZone('inside'); await engine.startFromGesture()
    expect(engine.getDiagnostics().musicGain).toBe(1)
    expect(engine.getDiagnostics().rainGain).toBe(0.25)
  })

  it('freezes background playback and leaves explicit pause/idle untouched', async () => {
    const { engine, advance, sources } = mockAudio()
    engine.pauseForBackground()
    expect(engine.getSnapshot().status).toBe('idle')
    await engine.startFromGesture(); advance(3)
    engine.pauseForBackground(); advance(20)
    expect(engine.getSnapshot().status).toBe('background')
    expect(engine.getPlaybackSeconds()).toBe(3)
    await engine.startFromGesture(); advance(1)
    expect(engine.getPlaybackSeconds()).toBe(4)
    engine.pause(); engine.pauseForBackground()
    expect(engine.getSnapshot().status).toBe('paused')
    expect(sources).toHaveLength(3)
  })

  it('reports interruption and resumes existing sources after a gesture', async () => {
    const { engine, context, listeners, sources } = mockAudio()
    await engine.startFromGesture()
    context.state = 'interrupted'; listeners.forEach((listener) => listener())
    expect(engine.getSnapshot().status).toBe('interrupted')
    await engine.startFromGesture()
    expect(engine.getSnapshot().status).toBe('playing')
    expect(sources).toHaveLength(3)
  })

  it('allows retry after browser permission rejection', async () => {
    const { engine, context, factory, sources } = mockAudio()
    context.resume.mockRejectedValueOnce(new Error('Permission denied'))
    await engine.startFromGesture()
    expect(engine.getSnapshot().status).toBe('error')
    expect(sources).toHaveLength(0)
    await engine.startFromGesture()
    expect(engine.getSnapshot().status).toBe('playing')
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('handles unsupported/failed context creation without throwing', async () => {
    const unsupported = new AudioEngine(() => null)
    await unsupported.startFromGesture()
    expect(unsupported.getSnapshot().status).toBe('unsupported')
    const failed = new AudioEngine(() => { throw new Error('Device unavailable') })
    await failed.startFromGesture()
    expect(failed.getSnapshot().status).toBe('error')
  })

  it('does not claim playback when the context remains suspended', async () => {
    const { engine, context, sources } = mockAudio()
    context.resume.mockImplementationOnce(async () => {})
    await engine.startFromGesture()
    expect(engine.getSnapshot().status).toBe('error')
    expect(sources).toHaveLength(0)
  })

  it('times out a stalled resume', async () => {
    vi.useFakeTimers()
    const { engine, context } = mockAudio()
    context.resume.mockImplementationOnce(() => new Promise(() => {}))
    const operation = engine.startFromGesture()
    await vi.advanceTimersByTimeAsync(10000); await operation
    expect(engine.getSnapshot().status).toBe('error')
  })

  it('ignores an old unlock after a cancelled start and a new gesture', async () => {
    const { engine, context, sources } = mockAudio()
    let resolve!: () => void
    context.resume.mockImplementationOnce(() => new Promise<void>((done) => { resolve = done }))
    const oldOperation = engine.startFromGesture()
    engine.pause()
    await engine.startFromGesture()
    resolve(); await oldOperation
    expect(sources).toHaveLength(3)
    expect(engine.getSnapshot().status).toBe('playing')
  })

  it('cancels a pending unlock when the page is hidden', async () => {
    const { engine, context, sources } = mockAudio()
    let resolve!: () => void
    context.resume.mockImplementationOnce(() => new Promise<void>((done) => { resolve = done }))
    const operation = engine.startFromGesture()
    engine.pauseForBackground(); resolve(); await operation
    expect(engine.getSnapshot().status).toBe('background')
    expect(sources).toHaveLength(0)
  })

  it('cleans all partially allocated nodes if the second source fails', async () => {
    const { engine, context, sources, gains } = mockAudio()
    const original = context.createBufferSource.getMockImplementation()!
    context.createBufferSource.mockImplementationOnce(original).mockImplementationOnce(() => { throw new Error('Node error') })
    await engine.startFromGesture()
    expect(engine.getSnapshot().status).toBe('error')
    sources.forEach((source) => expect(source.disconnect).toHaveBeenCalled())
    gains.forEach((gain) => expect(gain.disconnect).toHaveBeenCalled())
    await engine.startFromGesture()
    expect(engine.getSnapshot().status).toBe('playing')
  })

  it('disposes three sources, all gains and context listeners exactly once', async () => {
    const { engine, context, sources, gains, listeners } = mockAudio()
    await engine.startFromGesture(); await engine.dispose(); await engine.dispose()
    sources.forEach((source) => { expect(source.stop).toHaveBeenCalledTimes(1); expect(source.disconnect).toHaveBeenCalledTimes(1) })
    gains.forEach((gain) => expect(gain.disconnect).toHaveBeenCalledTimes(1))
    expect(context.close).toHaveBeenCalledTimes(1)
    expect(listeners.size).toBe(0)
  })
})
