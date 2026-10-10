import { useState } from 'react'
import type { CSSProperties } from 'react'
import { canUseSocial, MODES, MOODS, musicPolicy } from '../features/modes'
import type { ModeSettings, Mood, SceneMode } from '../features/modes'
import { GlassDialog } from './GlassDialog'
import { LiquidSwitch } from './LiquidSwitch'
import './mode-dialog.css'

const MODE_NAMES = { focus: 'FOCUS', sleep: 'SLEEP', relax: 'UNWIND', free: 'WANDER' } as const
const modeKeys = Object.keys(MODES) as SceneMode[]

function ModeArtwork({ mode }: { mode: SceneMode }) {
  return <svg className="mode-artwork" viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <circle className="art-orbit" cx="60" cy="60" r="48" />
    <circle className="art-orbit art-orbit-inner" cx="60" cy="60" r="38" />
    <circle className="art-satellite" cx="95" cy="27" r="3" />
    <g className="art-symbol" key={mode}>
      {mode === 'focus' && <><circle cx="60" cy="60" r="21" /><circle cx="60" cy="60" r="10" /><path d="M60 30v6m0 48v6M30 60h6m48 0h6" /></>}
      {mode === 'sleep' && <><path d="M69 37a25 25 0 1 0 15 34A24 24 0 0 1 69 37Z" /><path d="m80 36 1.5 5.5L87 43l-5.5 1.5L80 50l-1.5-5.5L73 43l5.5-1.5Z" /></>}
      {mode === 'relax' && <><path d="M33 48c9-13 17 13 27 0s18 13 27 0M33 61c9-13 17 13 27 0s18 13 27 0M33 74c9-13 17 13 27 0s18 13 27 0" /></>}
      {mode === 'free' && <><path d="m60 30 7 22 23 8-23 8-7 22-7-22-23-8 23-8Z" /><path d="m87 27 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" /></>}
    </g>
  </svg>
}

export function ModeDialog({ settings, onClose, onConfirm }: { settings: ModeSettings; onClose: () => void; onConfirm: (settings: ModeSettings) => void }) {
  const [draft, setDraft] = useState(settings)
  const policy = musicPolicy(draft)
  return <GlassDialog labelId="mode-title" onClose={onClose} className="mode-dialog">
    <header className="mode-heading">
      <p className="mode-kicker"><span className="ticket-mark" aria-hidden="true">▥</span> YOUR NEXT CHAPTER</p>
      <h2 id="mode-title">这一站，<em>留给自己。</em></h2>
      <p className="mode-intro">选一种节奏，余下的交给雨声。</p>
    </header>
    <form onSubmit={(event) => { event.preventDefault(); onConfirm(draft) }}>
      <fieldset className="rhythm-fieldset">
        <legend><span className="step-number">01</span>此刻的节奏</legend>
        <div className="rhythm-selector" style={{ '--mode-index': modeKeys.indexOf(draft.mode) } as CSSProperties}>
          <span className="rhythm-indicator" aria-hidden="true" />
          {modeKeys.map((mode) => <label key={mode} className="rhythm-option">
            <input type="radio" name="mode" value={mode} checked={draft.mode === mode} onChange={() => setDraft({ ...draft, mode })} />
            <span>{MODES[mode].name}</span>
          </label>)}
        </div>
        <div className="rhythm-preview" data-mode={draft.mode}>
          <div className="rhythm-copy" key={draft.mode}>
            <span className="rhythm-english">{MODE_NAMES[draft.mode]}</span>
            <strong>{MODES[draft.mode].name}<span>时刻</span></strong>
            <p>{MODES[draft.mode].subtitle}</p>
          </div>
          <ModeArtwork mode={draft.mode} />
        </div>
      </fieldset>
      <fieldset className="feeling-fieldset">
        <legend><span className="step-number">02</span>带上此刻的心情<span className="legend-aside">没有标准答案</span></legend>
        <div className="feeling-options">
          {(Object.entries(MOODS) as [Mood, string][]).map(([mood, name]) => <label key={mood} className="feeling-option">
            <input type="radio" name="mood" value={mood} checked={draft.mood === mood} onChange={() => setDraft({ ...draft, mood })} />
            <span className="feeling-dot" aria-hidden="true" /><span>{name}</span>
          </label>)}
        </div>
      </fieldset>
      <LiquidSwitch checked={draft.doNotDisturb} onChange={(doNotDisturb) => setDraft({ ...draft, doNotDisturb })} />
      <div className="journey-receipt" aria-live="polite" aria-atomic="true">
        <span className="receipt-line" aria-hidden="true"><i /><i /></span>
        <div><p>{policy.eligible ? '到站后 · 雨灯旋律' : '到站后 · 只听雨声'}{policy.eligible && policy.level < 1 ? ' · 轻声' : ''}</p>
          <span>{policy.eligible ? '原创器乐 Demo，走进店内渐渐响起。' : '暂无睡眠适用曲目，以环境雨声陪伴。'}</span>
          <span>{canUseSocial(draft, true) ? '当前为独处 Demo，旅人互动尚未开放。' : '本次旅程屏蔽旅人互动。'}</span>
        </div>
      </div>
      <button className="mode-depart" type="submit"><span>就这样，靠站<small>雨灯便利店</small></span><span className="depart-arrow" aria-hidden="true">↗</span></button>
      <p className="mode-privacy"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="4" y="7" width="8" height="6" rx="2" /><path d="M6 7V5a2 2 0 0 1 4 0v2" /></svg>选择仅保存在此设备 · 下次随时更改</p>
    </form>
  </GlassDialog>
}
