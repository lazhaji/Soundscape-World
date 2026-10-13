import { afterEach, expect, it, vi } from 'vitest'
import { importedTrack, inspectDuration, MAX_FILE_BYTES, MAX_LIBRARY_BYTES, validateCapacity, validateDecoded, validateFile } from '../../src/audio/importAudio'
import { fillPinkNoise, fillWhiteNoise } from '../../src/audio/noise'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
it('rejects long metadata before PCM allocation and releases object URLs on success, failure and timeout', async () => {
  vi.useFakeTimers()
  let media!: { duration: number; onloadedmetadata: (() => void) | null; onerror: (() => void) | null; removeAttribute: ReturnType<typeof vi.fn>; load: ReturnType<typeof vi.fn> }
  vi.stubGlobal('Audio', vi.fn(function () {
    media = { duration: 12, onloadedmetadata: null, onerror: null, removeAttribute: vi.fn(), load: vi.fn() }
    return media
  }))
  const revoke = vi.spyOn(URL, 'revokeObjectURL')
  const success = inspectDuration(new Blob(['a'])); media.onloadedmetadata?.(); await success
  const long = inspectDuration(new Blob(['b'])), rejected = expect(long).rejects.toThrow('5 分钟'); media.duration = 301; media.onloadedmetadata?.(); await rejected
  const bad = inspectDuration(new Blob(['c'])), failed = expect(bad).rejects.toThrow('无法解码'); media.onerror?.(); await failed
  const hung = inspectDuration(new Blob(['d'])), timed = expect(hung).rejects.toThrow('超时'); await vi.advanceTimersByTimeAsync(10000); await timed
  expect(revoke).toHaveBeenCalledTimes(4); expect(media.removeAttribute).toHaveBeenCalledWith('src'); expect(media.load).toHaveBeenCalledOnce()
})

it('rejects unsupported, empty, oversized files and unsafe decoded sizes', () => {
  for (const file of [{ name: 'x.exe', type: 'audio/mp3', size: 5 }, { name: 'x.mp3', type: 'text/plain', size: 5 }, { name: 'x.wav', type: '', size: 0 }, { name: 'x.flac', type: '', size: MAX_FILE_BYTES + 1 }]) expect(() => validateFile(file)).toThrow()
  expect(() => validateFile({ name: 'X.MP3', type: '', size: 12 })).not.toThrow()
  for (const buffer of [{ duration: NaN, length: 10, numberOfChannels: 1 }, { duration: 301, length: 10, numberOfChannels: 1 }, { duration: 5, length: 10, numberOfChannels: 6 }, { duration: 5, length: 1e8, numberOfChannels: 2 }]) expect(() => validateDecoded(buffer)).toThrow()
  expect(() => validateDecoded({ duration: 30, length: 661500, numberOfChannels: 2 })).not.toThrow()
})
it('bounds count, stored bytes and available browser quota', () => {
  expect(() => validateCapacity(0, 20, 10)).toThrow()
  expect(() => validateCapacity(MAX_LIBRARY_BYTES, 1, 1)).toThrow()
  expect(() => validateCapacity(0, 0, 100, { quota: 120, usage: 50 })).toThrow()
  expect(() => validateCapacity(0, 0, 100)).not.toThrow()
})
it('assigns stable ids and explicit tags without permitting imported melody during sleep', () => {
  const file = new File(['abc'], 'my track.wav', { type: 'audio/wav' })
  const track = importedTrack('local-id', file, 10, true, 'calm')
  expect(track).toMatchObject({ id: 'local-id', title: 'my track', source: 'imported', eligibleModes: ['focus', 'relax', 'free'], assetPath: 'indexeddb:local-id', bytes: 3 })
})
it('pink noise is finite, bounded and has substantially more low-frequency content than white noise', () => {
  let seed = 4
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296 }
  const pink = new Float32Array(44100), white = new Float32Array(44100)
  fillPinkNoise(pink, random); fillWhiteNoise(white, random)
  const lowRatio = (samples: Float32Array) => {
    let smooth = 0, low = 0, total = 0
    for (const sample of samples) { expect(Number.isFinite(sample) && Math.abs(sample) <= 1).toBe(true); smooth = 0.99 * smooth + 0.01 * sample; low += smooth * smooth; total += sample * sample }
    return low / total
  }
  expect(lowRatio(pink)).toBeGreaterThan(lowRatio(white) * 8)
})
