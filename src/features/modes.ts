export const MODES = {
  focus: { name: '专注', symbol: '◎', subtitle: '留一点安静，给眼前的事', sound: '轻柔器乐 · 屏蔽旅人打扰' },
  sleep: { name: '睡眠', symbol: '☾', subtitle: '让今天，慢慢落幕', sound: '纯环境雨声 · 屏蔽旅人打扰' },
  relax: { name: '放松', symbol: '≈', subtitle: '不必赶路，听一会儿雨', sound: '舒缓旋律 · 自己决定是否互动' },
  free: { name: '自由', symbol: '✧', subtitle: '把下一刻，交给自己', sound: '自由聆听 · 自己决定是否互动' },
} as const
export const MOODS = { calm: '平静', happy: '愉悦', tired: '疲惫', anxious: '焦虑', lonely: '孤独' } as const
export type SceneMode = keyof typeof MODES
export type Mood = keyof typeof MOODS
export interface ModeSettings { mode: SceneMode; mood: Mood; doNotDisturb: boolean }
export const DEFAULT_SETTINGS: ModeSettings = { mode: 'relax', mood: 'calm', doNotDisturb: false }

export function parseSettings(value: unknown): ModeSettings | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.mode !== 'string' || !Object.hasOwn(MODES, row.mode) || typeof row.mood !== 'string' || !Object.hasOwn(MOODS, row.mood) || typeof row.doNotDisturb !== 'boolean') return null
  return { mode: row.mode as SceneMode, mood: row.mood as Mood, doNotDisturb: row.doNotDisturb }
}

// Shared by future radar/chat actions as well as UI; explicit opt-in is required.
export function canUseSocial(settings: ModeSettings, radarEnabled: boolean): boolean {
  return (settings.mode === 'relax' || settings.mode === 'free') && settings.doNotDisturb === false && radarEnabled === true
}

// The default keeps the original demo contract; the player supplies track eligibility.
const DEMO_ELIGIBLE_MODES: readonly SceneMode[] = ['focus', 'relax', 'free']
export function musicPolicy(settings: ModeSettings, eligibleModes: readonly SceneMode[] = DEMO_ELIGIBLE_MODES) {
  const eligible = eligibleModes.includes(settings.mode)
  const moodLevel = settings.mood === 'tired' || settings.mood === 'anxious' ? 0.65 : 1
  return { eligible, level: eligible ? moodLevel : 0, label: eligible ? '雨灯 · 原创器乐 Demo' : '纯雨声 · 暂无睡眠适用曲目' }
}
