import { useState } from 'react'
import { canUseSocial, MODES, MOODS, musicPolicy } from '../features/modes'
import type { ModeSettings, Mood, SceneMode } from '../features/modes'
import { GlassDialog } from './GlassDialog'

export function ModeDialog({ settings, onClose, onConfirm }: { settings: ModeSettings; onClose: () => void; onConfirm: (settings: ModeSettings) => void }) {
  const [draft, setDraft] = useState(settings)
  const policy = musicPolicy(draft)
  return <GlassDialog labelId="mode-title" onClose={onClose} className="mode-dialog">
    <p className="eyebrow">MAKE ROOM FOR YOURSELF</p>
    <h2 id="mode-title">今晚，想怎样度过？</h2>
    <p className="dialog-intro">选一种节奏，让声音陪你靠岸。</p>
    <form onSubmit={(event) => { event.preventDefault(); onConfirm(draft) }}>
      <fieldset className="mode-fieldset"><legend>此刻的节奏</legend><div className="mode-options">
        {(Object.entries(MODES) as [SceneMode, typeof MODES[SceneMode]][]).map(([mode, copy]) => <label key={mode} className={`mode-option ${draft.mode === mode ? 'selected' : ''}`}>
          <input className="sr-only" type="radio" name="mode" value={mode} checked={draft.mode === mode} onChange={() => setDraft({ ...draft, mode })} />
          <span className="mode-symbol" aria-hidden="true">{copy.symbol}</span><strong>{copy.name}</strong><span className="mode-subtitle">{copy.subtitle}</span>
        </label>)}
      </div></fieldset>
      <fieldset className="mood-fieldset"><legend>此刻的心情</legend><div className="mood-options">
        {(Object.entries(MOODS) as [Mood, string][]).map(([mood, name]) => <label key={mood} className={draft.mood === mood ? 'selected' : ''}>
          <input className="sr-only" type="radio" name="mood" value={mood} checked={draft.mood === mood} onChange={() => setDraft({ ...draft, mood })} />{name}
        </label>)}
      </div></fieldset>
      <label className="dnd-option"><span><strong>暂时不被打扰</strong><small>只留声音，给自己一点空间</small></span><input type="checkbox" role="switch" checked={draft.doNotDisturb} onChange={(event) => setDraft({ ...draft, doNotDisturb: event.target.checked })} /><span className="switch-track" aria-hidden="true" /></label>
      <div className="mode-effect" aria-live="polite">
        <p>{policy.label}{policy.eligible && policy.level < 1 ? ' · 轻声陪伴' : ''}</p>
        <span>{canUseSocial(draft, true) ? '旅人互动需由你主动开启；当前旅程仅供独处。' : '本次旅程将禁用雷达和聊天。'}</span>
      </div>
      <button className="primary-button" type="submit">就这样，靠站 <span aria-hidden="true">↗</span></button>
      <p className="settings-note">模式与心情仅保存在此设备；每次启程都可重新选择。</p>
    </form>
  </GlassDialog>
}
