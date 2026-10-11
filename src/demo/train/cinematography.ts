import { between, type TrainDemoController } from './TrainDemoController'

export type Vec3 = [number, number, number]
export interface Shot { eye: Vec3; target: Vec3; fov: number }
export const CABIN_SHOT: Shot = { eye: [-4.58, 1.55, -2.5], target: [-3.3, 1.4, 0.2], fov: 65 }
const WINDOW: Shot = { eye: [-4.5, 1.55, -1.75], target: [-1, 1.45, -1.65], fov: 62 }
const OUTSIDE: Shot = { eye: [-3.15, 1.8, -1.65], target: [-0.7, 1.25, -0.7], fov: 58 }
const LIFT: Shot = { eye: [-0.8, 5.2, 6.4], target: [-2.7, 0.7, 1.8], fov: 44 }
const mixVec = (a: Vec3, b: Vec3, t: number): Vec3 => a.map((value, i) => value + (b[i]! - value) * t) as Vec3
function mix(a: Shot, b: Shot, t: number): Shot { return { eye: mixVec(a.eye, b.eye, t), target: mixVec(a.target, b.target, t), fov: a.fov + (b.fov - a.fov) * t } }

export function stationShot(aspect: number): Shot {
  const fov = 36
  const height = Math.max(13.5, 13.2 / Math.max(0.3, aspect))
  const distance = height / (2 * Math.tan(fov * Math.PI / 360))
  const target: Vec3 = [-0.4, 0.45, 0.3]
  return { eye: [target[0] + distance / 2, target[1] + distance / Math.sqrt(2), target[2] + distance / 2], target, fov }
}

export function sampleShot(controller: TrainDemoController, aspect: number, reduced: boolean): Shot {
  const { phase } = controller.getSnapshot()
  const fixed = stationShot(aspect)
  let shot: Shot
  if (phase === 'cruising') shot = CABIN_SHOT
  else if (phase === 'station') shot = fixed
  else if (phase === 'arriving') {
    const t = controller.arrivalTime
    if (reduced) shot = t < 4 ? CABIN_SHOT : fixed
    else if (t < 2.8) shot = mix(CABIN_SHOT, WINDOW, between(t, 0, 2.8))
    else if (t < 4) shot = mix(WINDOW, OUTSIDE, between(t, 2.8, 4))
    else if (t < 5.8) shot = mix(OUTSIDE, LIFT, between(t, 4, 5.8))
    else shot = mix(LIFT, fixed, between(t, 5.8, 8))
  } else {
    const b = controller.boardingTime
    if (reduced) shot = controller.boardingAt === null || b < 4.6 ? fixed : CABIN_SHOT
    else if (controller.boardingAt === null) shot = fixed
    else if (b < 2.5) shot = mix(fixed, LIFT, between(b, 0, 2.5))
    else if (b < 4) shot = mix(LIFT, OUTSIDE, between(b, 2.5, 4))
    else if (b < 4.6) shot = mix(OUTSIDE, WINDOW, between(b, 4, 4.6))
    else shot = mix(WINDOW, CABIN_SHOT, between(b, 4.6, 5.3))
    if (b > 5.4) shot = { ...shot, eye: [shot.eye[0], shot.eye[1], shot.eye[2] + controller.trainZ], target: [shot.target[0], shot.target[1], shot.target[2] + controller.trainZ] }
  }
  return shot
}

export function reducedMotionFade(controller: TrainDemoController): number {
  const phase = controller.getSnapshot().phase
  const time = phase === 'arriving' ? controller.arrivalTime - 4 : phase === 'returning' && controller.boardingAt !== null ? controller.boardingTime - 4.6 : 10
  return Math.max(0, 1 - Math.abs(time) / 0.25)
}
