import type { Mood, SceneMode } from '../features/modes'

export interface Track {
  id: string; title: string; artist: string; source: 'generated' | 'imported'
  tags: string[]; eligibleModes: SceneMode[]; moodTags: Mood[]
  energy: number; instrumental: boolean; duration: number; assetPath: string
  generator?: 'rainlight' | 'white' | 'pink'
  bytes?: number
}
export const CATALOG: Track[] = [
  { id: 'm1-rainlight', title: '雨灯', artist: 'Soundscape · 原创 Demo', source: 'generated', tags: ['ambient', 'instrumental'], eligibleModes: ['focus', 'relax', 'free'], moodTags: ['calm', 'lonely'], energy: 0.25, instrumental: true, duration: 32, assetPath: 'generated:rainlight', generator: 'rainlight' },
  { id: 'm3-white', title: '白噪音', artist: '本地合成 · Demo', source: 'generated', tags: ['noise'], eligibleModes: ['focus', 'sleep', 'relax', 'free'], moodTags: ['calm', 'tired'], energy: 0.15, instrumental: true, duration: 16, assetPath: 'generated:white', generator: 'white' },
  { id: 'm3-pink', title: '粉红噪音', artist: '本地合成 · Demo', source: 'generated', tags: ['noise', 'soft'], eligibleModes: ['focus', 'sleep', 'relax', 'free'], moodTags: ['calm', 'anxious', 'tired'], energy: 0.1, instrumental: true, duration: 16, assetPath: 'generated:pink', generator: 'pink' },
]
export function isEligible(track: Track, mode: SceneMode): boolean {
  return track.eligibleModes.includes(mode) && (mode !== 'focus' || track.instrumental) && (mode !== 'sleep' || track.generator === 'white' || track.generator === 'pink')
}
