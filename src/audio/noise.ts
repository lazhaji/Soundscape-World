/** Original, locally synthesized white noise; no downloaded audio assets. */
export function fillWhiteNoise(samples: Float32Array, random = Math.random): void {
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = random() * 2 - 1
  }
}
