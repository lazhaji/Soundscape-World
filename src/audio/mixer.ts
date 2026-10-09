import type { WorldZone } from '../world/zones'

export const ZONE_MIX: Record<WorldZone, { music: number; rain: number }> = {
  outside: { music: 0, rain: 1 },
  doorway: { music: 0.45, rain: 0.65 },
  inside: { music: 1, rain: 0.25 },
}
export const MIX_SECONDS = 0.8
export interface Ramp { from: number; to: number; start: number; end: number }
export function rampValue(ramp: Ramp, time: number): number {
  if (time >= ramp.end) return ramp.to
  if (time <= ramp.start) return ramp.from
  return ramp.from + (ramp.to - ramp.from) * (time - ramp.start) / (ramp.end - ramp.start)
}

/** Track the envelope for interrupted ramps, including browsers without cancelAndHoldAtTime. */
export class SmoothGain {
  private ramp: Ramp
  constructor(readonly node: GainNode, initial: number, time: number) {
    this.ramp = { from: initial, to: initial, start: time, end: time }
    node.gain.setValueAtTime(initial, time)
  }
  set(value: number, time: number, duration = MIX_SECONDS): void {
    const current = rampValue(this.ramp, time)
    this.node.gain.cancelScheduledValues(time)
    this.node.gain.setValueAtTime(current, time)
    if (duration > 0) this.node.gain.linearRampToValueAtTime(value, time + duration)
    else this.node.gain.setValueAtTime(value, time)
    this.ramp = { from: current, to: value, start: time, end: time + duration }
  }
  value(time: number): number { return rampValue(this.ramp, time) }
}
