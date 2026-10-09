import { fillWhiteNoise } from './noise'

export const MUSIC_DURATION = 32
export const GENERATED_SAMPLE_RATE = 22050
export interface SoundBuffers { music: AudioBuffer; rain: AudioBuffer }

/** Original test composition: four slow chords with soft sine plucks, not a recording. */
export function fillDemoMusic(samples: Float32Array, sampleRate: number): void {
  const chords = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]]
  const noteLength = 2.7
  for (let beat = 0; beat < MUSIC_DURATION; beat += 1) {
    const midi = chords[Math.floor(beat / 8)]![beat % 4]!
    const frequency = 440 * 2 ** ((midi - 69) / 12)
    const length = Math.floor(noteLength * sampleRate)
    for (let sample = 0; sample < length; sample += 1) {
      const time = sample / sampleRate
      const envelope = Math.min(1, time / 0.04) * Math.min(1, (noteLength - time) / 0.4) * Math.exp(-1.5 * time)
      const wave = Math.sin(2 * Math.PI * frequency * time) + 0.2 * Math.sin(4 * Math.PI * frequency * time)
      // Circular write preserves the final notes' tails at the loop boundary.
      const index = (beat * sampleRate + sample) % samples.length
      samples[index] = (samples[index] ?? 0) + 0.14 * envelope * wave
    }
  }
}

export function fillRain(samples: Float32Array, sampleRate: number): void {
  fillWhiteNoise(samples)
  let low = 0
  for (let index = 0; index < samples.length; index += 1) {
    const white = samples[index]!
    low = low * 0.94 + white * 0.06
    samples[index] = (white * 0.045 + low * 0.35) * (0.9 + Math.sin(index / sampleRate * Math.PI / 4) * 0.1)
  }
  const seam = Math.floor(sampleRate * 0.12)
  for (let index = 0; index < seam; index += 1) {
    const mix = index / seam
    const end = samples.length - seam + index
    samples[end] = samples[end]! * (1 - mix) + samples[index]! * mix
  }
  samples[samples.length - 1] = samples[seam - 1]!
}

export function createGeneratedAudio(context: AudioContext): SoundBuffers {
  const music = context.createBuffer(1, MUSIC_DURATION * GENERATED_SAMPLE_RATE, GENERATED_SAMPLE_RATE)
  fillDemoMusic(music.getChannelData(0), GENERATED_SAMPLE_RATE)
  const rain = context.createBuffer(1, 8 * GENERATED_SAMPLE_RATE, GENERATED_SAMPLE_RATE)
  fillRain(rain.getChannelData(0), GENERATED_SAMPLE_RATE)
  return { music, rain }
}
