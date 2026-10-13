import type { ModeSettings } from './modes'

export const STATUSES = { focus: '专注', sleep: '睡眠', dnd: '勿扰', calm: '平静', happy: '愉悦', anxious: '焦虑', lonely: '孤独' } as const
export type StatusChoice = keyof typeof STATUSES

// Keep the existing IndexedDB/audio/permissions contract; no destructive migration.
export function statusSettings(choice: StatusChoice): ModeSettings {
  return {
    mode: choice === 'sleep' ? 'sleep' : choice === 'focus' ? 'focus' : 'relax',
    mood: choice === 'happy' || choice === 'anxious' || choice === 'lonely' ? choice : 'calm',
    doNotDisturb: choice === 'dnd',
  }
}

export function statusFromSettings(settings: ModeSettings | null): StatusChoice {
  if (!settings) return 'calm'
  if (settings.mode === 'sleep' || settings.mode === 'focus') return settings.mode
  if (settings.doNotDisturb) return 'dnd'
  return settings.mood === 'tired' ? 'calm' : settings.mood
}
