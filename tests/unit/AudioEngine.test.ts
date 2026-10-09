import { afterEach, describe, expect, it, vi } from 'vitest'
import { AudioEngine } from '../../src/audio/AudioEngine'

function mockAudio() {
  const sources: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; buffer: AudioBuffer | null; loop: boolean; connect: ReturnType<typeof vi.fn> }[] = []
  const listeners = new Set<() => void>()
  const gain = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }
  const context = {
    state: 'suspended', sampleRate: 48000, currentTime: 12, destination: {},
    resume: vi.fn(async () => { context.state = 'running' }),
    close: vi.fn(async () => { context.state = 'closed' }),
    addEventListener: vi.fn((_name: string, callback: () => void) => listeners.add(callback)),
    removeEventListener: vi.fn((_name: string, callback: () => void) => listeners.delete(callback)),
    createBuffer: vi.fn((_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) })),
    createGain: vi.fn(() => gain),
    createBufferSource: vi.fn(() => {
      const source = { start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), buffer: null, loop: false, connect: vi.fn() }
      sources.push(source)
      return source
    }),
  }
  const factory = vi.fn(() => context as unknown as AudioContext)
  return { context, gain, sources, factory, listeners, engine: new AudioEngine(factory) }
}

afterEach(() => vi.useRealTimers())

describe('gesture-only application audio service', () => {
  it('does not create or resume a context when constructed or subscribed', () => {
    const { engine, factory } = mockAudio()
    const unsubscribe = engine.subscribe(vi.fn())
    expect(engine.getSnapshot().status).toBe('idle')
    unsubscribe()
    expect(factory).not.toHaveBeenCalled()
  })

  it('resumes within the gesture call and deduplicates simultaneous/repeated starts', async () => {
    const { engine, factory, context, sources, gain } = mockAudio()
    const first = engine.startFromGesture()
    expect(context.resume).toHaveBeenCalledTimes(1)
    expect(engine.startFromGesture()).toBe(first)
    await first
    await engine.startFromGesture()
    expect(factory).toHaveBeenCalledTimes(1)
    expect(sources).toHaveLength(1)
    expect(sources[0]?.start).toHaveBeenCalledTimes(1)
    expect(sources[0]?.loop).toBe(true)
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0, 12)
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.035, 12.3)
    expect(engine.getSnapshot().status).toBe('playing')
  })

  it('keeps audio alive when the UI unsubscribes and subscribes again', async () => {
    const { engine, factory, sources } = mockAudio()
    const unsubscribe = engine.subscribe(vi.fn())
    await engine.startFromGesture()
    unsubscribe()
    const unsubscribeAgain = engine.subscribe(vi.fn())
    expect(engine.getSnapshot().status).toBe('playing')
    expect(sources[0]?.stop).not.toHaveBeenCalled()
    expect(factory).toHaveBeenCalledTimes(1)
    unsubscribeAgain()
  })

  it('stops/disconnects each source across ten restarts while reusing one context', async () => {
    const { engine, factory, sources, gain } = mockAudio()
    for (let index = 0; index < 10; index += 1) {
      await engine.startFromGesture()
      engine.stop()
      expect(sources[index]?.stop).toHaveBeenCalledTimes(1)
      expect(sources[index]?.disconnect).toHaveBeenCalledTimes(1)
    }
    expect(factory).toHaveBeenCalledTimes(1)
    expect(sources).toHaveLength(10)
    expect(gain.disconnect).toHaveBeenCalledTimes(10)
    expect(engine.getSnapshot().status).toBe('stopped')
  })

  it('can retry a rejected resume without creating another context', async () => {
    const { engine, context, factory, sources } = mockAudio()
    context.resume.mockRejectedValueOnce(new Error('Permission denied'))
    await engine.startFromGesture()
    expect(engine.getSnapshot().status).toBe('error')
    expect(sources).toHaveLength(0)
    await engine.startFromGesture()
    expect(engine.getSnapshot().status).toBe('playing')
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('reports unsupported audio without throwing', async () => {
    const engine = new AudioEngine(() => null)
    await engine.startFromGesture()
    expect(engine.getSnapshot().status).toBe('unsupported')
  })

  it('reports context creation failure with a retryable error', async () => {
    const engine = new AudioEngine(() => { throw new Error('Device unavailable') })
    await engine.startFromGesture()
    expect(engine.getSnapshot().status).toBe('error')
  })

  it('does not claim playback when the browser remains suspended', async () => {
    const { engine, context, sources } = mockAudio()
    context.resume.mockImplementationOnce(async () => {})
    await engine.startFromGesture()
    expect(engine.getSnapshot().status).toBe('error')
    expect(sources).toHaveLength(0)
  })

  it('times out a stalled browser resume rather than leaving the button busy forever', async () => {
    vi.useFakeTimers()
    const { engine, context, sources } = mockAudio()
    context.resume.mockImplementationOnce(() => new Promise(() => {}))
    const operation = engine.startFromGesture()
    await vi.advanceTimersByTimeAsync(10000)
    await operation
    expect(engine.getSnapshot().status).toBe('error')
    expect(sources).toHaveLength(0)
  })

  it('does not start late after stop cancels an in-flight unlock', async () => {
    const { engine, context, sources } = mockAudio()
    let resume!: () => void
    context.resume.mockImplementationOnce(() => new Promise<void>((resolve) => { resume = resolve }))
    const operation = engine.startFromGesture()
    engine.stop()
    context.state = 'running'
    resume()
    await operation
    expect(sources).toHaveLength(0)
    expect(engine.getSnapshot().status).toBe('stopped')
  })

  it('ignores an old unlock finishing after a fresh start', async () => {
    const { engine, context, sources } = mockAudio()
    let resumeOld!: () => void
    context.resume.mockImplementationOnce(() => new Promise<void>((resolve) => { resumeOld = resolve }))
    const oldOperation = engine.startFromGesture()
    engine.stop()
    await engine.startFromGesture()
    resumeOld()
    await oldOperation
    expect(sources).toHaveLength(1)
    expect(engine.getSnapshot().status).toBe('playing')
  })

  it('cleans up and requests another gesture after browser interruption', async () => {
    const { engine, context, sources, listeners } = mockAudio()
    await engine.startFromGesture()
    context.state = 'interrupted'
    listeners.forEach((listener) => listener())
    expect(engine.getSnapshot().status).toBe('interrupted')
    expect(sources[0]?.disconnect).toHaveBeenCalledTimes(1)
    await engine.startFromGesture()
    expect(engine.getSnapshot().status).toBe('playing')
  })

  it('releases partial nodes when starting a source fails', async () => {
    const { engine, context, sources, gain } = mockAudio()
    context.createBufferSource.mockImplementationOnce(() => { throw new Error('Node failure') })
    await engine.startFromGesture()
    expect(engine.getSnapshot().status).toBe('error')
    expect(sources).toHaveLength(0)
    expect(gain.disconnect).toHaveBeenCalledTimes(1)
  })

  it('disposes all nodes/listeners and closes the context once', async () => {
    const { engine, context, sources, listeners } = mockAudio()
    await engine.startFromGesture()
    await engine.dispose()
    await engine.dispose()
    expect(sources[0]?.stop).toHaveBeenCalledTimes(1)
    expect(context.close).toHaveBeenCalledTimes(1)
    expect(listeners.size).toBe(0)
  })
})
