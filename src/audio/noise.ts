/** Original, locally synthesized white noise; no downloaded audio assets. */
export function fillWhiteNoise(samples: Float32Array, random = Math.random): void {
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = random() * 2 - 1
  }
}

/** Independent octave-band filters approximate a 1/f power spectrum. */
export function fillPinkNoise(samples: Float32Array, random = Math.random): void {
  const poles = [0.998, 0.99, 0.95, 0.8, 0.4]
  const bands = poles.map(() => 0)
  for (let i = 0; i < samples.length; i++) {
    let sum = 0
    for (let band = 0; band < poles.length; band++) {
      const pole = poles[band]!
      bands[band] = pole * bands[band]! + Math.sqrt(1 - pole * pole) * (random() * 2 - 1)
      sum += bands[band]!
    }
    samples[i] = Math.max(-1, Math.min(1, sum / 6))
  }
}
