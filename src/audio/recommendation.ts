import type { ModeSettings } from '../features/modes'
import { isEligible, type Track } from './catalog'

export interface Feedback { id: string; trackId: string; kind: 'like' | 'unlike' | 'skip'; at: number }
export function likedTracks(events: Feedback[]): Set<string> {
  const liked = new Set<string>()
  for (const event of events) {
    if (event.kind === 'like') liked.add(event.trackId)
    if (event.kind === 'unlike') liked.delete(event.trackId)
  }
  return liked
}
export function scoreTrack(track: Track, settings: ModeSettings, catalog: Track[], events: Feedback[], recent: string[]): number {
  const liked = likedTracks(events)
  const likedTags = new Set(catalog.filter((item) => liked.has(item.id)).flatMap((item) => item.tags))
  const affinity = liked.has(track.id) ? 1 : likedTags.size ? track.tags.filter((tag) => likedTags.has(tag)).length / Math.max(1, track.tags.length) : 0.5
  const skips = events.filter((event) => event.trackId === track.id && event.kind === 'skip').length
  const preference = Math.max(0, affinity - Math.min(1, skips * 0.2))
  return 0.45 * (track.moodTags.includes(settings.mood) ? 1 : 0) + 0.30 * preference + 0.25 * (recent.includes(track.id) ? 0 : 1)
}
export function recommendTrack(settings: ModeSettings, catalog: Track[], events: Feedback[], recent: string[], random = Math.random): Track | null {
  const eligible = [...new Map(catalog.filter((track) => isEligible(track, settings.mode)).map((track) => [track.id, track])).values()]
  const fresh = eligible.filter((track) => !recent.includes(track.id))
  // Exhausted small catalogs relax oldest history first, never the mode filter.
  const oldest = Math.min(...eligible.map((track) => recent.lastIndexOf(track.id)))
  const candidates = fresh.length ? fresh : eligible.filter((track) => recent.lastIndexOf(track.id) === oldest)
  if (!candidates.length) return null
  const weights = candidates.map((track) => Math.max(0.01, scoreTrack(track, settings, catalog, events, recent)))
  const sample = random()
  let cursor = (Number.isFinite(sample) ? Math.min(1 - Number.EPSILON, Math.max(0, sample)) : 0) * weights.reduce((sum, weight) => sum + weight, 0)
  for (const [index, track] of candidates.entries()) { cursor -= weights[index]!; if (cursor < 0) return track }
  return candidates.at(-1)!
}
