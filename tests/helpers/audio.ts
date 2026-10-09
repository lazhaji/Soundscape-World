import { vi } from 'vitest'
import { AudioEngine } from '../../src/audio/AudioEngine'
import type { SoundBuffers } from '../../src/audio/generatedAudio'

export function mockAudio() {
  const makeSource = () => ({ start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), connect: vi.fn(), buffer: null, loop: false, loopStart: 0 })
  const makeGain = () => ({ gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() })
  const sources: ReturnType<typeof makeSource>[] = [], gains: ReturnType<typeof makeGain>[] = []
  const listeners = new Set<() => void>()
  const context = {
    state: 'suspended', sampleRate: 48000, currentTime: 12, destination: {},
    resume: vi.fn(async () => { context.state = 'running' }),
    suspend: vi.fn(async () => { context.state = 'suspended' }),
    close: vi.fn(async () => { context.state = 'closed' }),
    addEventListener: vi.fn((_name: string, callback: () => void) => listeners.add(callback)),
    removeEventListener: vi.fn((_name: string, callback: () => void) => listeners.delete(callback)),
    createGain: vi.fn(() => { const gain = makeGain(); gains.push(gain); return gain }),
    createBufferSource: vi.fn(() => { const source = makeSource(); sources.push(source); return source }),
  }
  const factory = vi.fn(() => context as unknown as AudioContext)
  const buffers = vi.fn(() => ({ music: { duration: 32 }, rain: { duration: 8 } }) as SoundBuffers)
  const advance = (seconds: number) => { if (context.state === 'running') context.currentTime += seconds }
  return { context, sources, gains, listeners, factory, buffers, advance, engine: new AudioEngine(factory, buffers) }
}
