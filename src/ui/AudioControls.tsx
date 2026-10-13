import { useEffect, useState, useSyncExternalStore } from 'react'
import { audioEngine } from '../audio/engine'
import { player } from '../audio/player'
import { isEligible } from '../audio/catalog'
import type { TimerAction } from '../audio/SleepTimer'
import { MOODS, type Mood } from '../features/modes'
import { ZONE_NAMES } from '../world/zones'
import './player.css'

function time(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`
}

export function AudioControls() {
  const sound = useSyncExternalStore(audioEngine.subscribe, audioEngine.getSnapshot)
  const library = useSyncExternalStore(player.subscribe, player.getSnapshot)
  const [clock, setClock] = useState(() => ({ now: Date.now(), elapsed: audioEngine.getPlaybackSeconds() }))
  const [minutes, setMinutes] = useState(sound.settings.mode === 'sleep' ? '30' : '25')
  const [action, setAction] = useState<TimerAction>(sound.settings.mode === 'sleep' ? 'all' : 'music')
  const [instrumental, setInstrumental] = useState(false), [mood, setMood] = useState<Mood>('calm')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  useEffect(() => {
    const interval = window.setInterval(() => setClock({ now: Date.now(), elapsed: audioEngine.getPlaybackSeconds() }), 500)
    return () => window.clearInterval(interval)
  }, [])
  const { current, timer } = library, playing = sound.status === 'playing'
  const seconds = current ? current.source === 'generated' ? clock.elapsed % current.duration : Math.min(clock.elapsed, current.duration) : 0
  const remaining = timer ? Math.max(0, (timer.expiresAt - clock.now) / 1000) : 0
  const unavailable = library.busy || !library.ready || library.storageError
  return <section className="audio-check player" aria-labelledby="audio-heading">
    <div className="section-label"><span>SOUNDS OF THIS PLACE</span><span>设备内曲库</span></div>
    <h2 id="audio-heading">此刻，听见。</h2>
    <p className="player-place" data-testid="zone-description">{sound.zone === 'train' ? '列车内 · 轻柔行驶声' : `${ZONE_NAMES[sound.zone]} · ${sound.zone === 'outside' ? '音乐静音，进度继续' : sound.settings.mode === 'sleep' ? '无旋律噪音与天气声' : '声音随位置渐变'}`}</p>
    <div className="track-card"><div><strong data-testid="current-track">{current?.title ?? '只听环境声'}</strong><span>{current?.artist ?? '没有适用曲目时，天气声仍会陪伴'}{current?.source === 'generated' ? ' · 循环' : ''}</span></div><output className="track-progress" data-testid="music-progress" data-elapsed={clock.elapsed.toFixed(2)}>{time(seconds)} / {time(current?.duration ?? 0)}</output></div>
    <button className="sound-button" onClick={() => { player.timer.tick(); player.report(''); if (playing) audioEngine.pause(); else void audioEngine.startFromGesture() }} disabled={sound.status === 'starting' || sound.status === 'unsupported'}>
      <span aria-hidden="true">{playing ? 'Ⅱ' : '▷'}</span>{playing ? '暂停声音' : sound.status === 'starting' ? '正在启声…' : sound.status === 'idle' ? '点击启声' : '继续聆听'}<span aria-hidden="true">♪</span>
    </button>
    <div className="player-actions">
      <button disabled={library.loading} onClick={() => { void player.next() }}>下一曲</button>
      <button aria-pressed={!!current && player.isLiked(current.id)} disabled={!current || unavailable || library.loading} onClick={() => { if (current) void player.feedback(player.isLiked(current.id) ? 'unlike' : 'like') }}>{current && player.isLiked(current.id) ? '♥ 已喜欢' : '♡ 喜欢'}</button>
      <button disabled={!current || unavailable || library.loading} onClick={() => { void player.feedback('skip') }}>跳过</button>
    </div>
    <p className="audio-status" role="status" data-testid="audio-status">{library.loading ? '正在读取曲目…' : library.message || sound.message}</p>
    {sound.musicOff && <button className="text-button" onClick={() => { audioEngine.enableMusic(); player.report('') }}>定时已关闭音乐 · 重新开启音乐</button>}
    <label className="volume-control">音乐<input aria-label="音乐音量" type="range" min="0" max="1" step="0.05" value={sound.musicVolume} onChange={(event) => audioEngine.setVolume('music', Number(event.target.value))} /><span>{Math.round(sound.musicVolume * 100)}%</span></label>
    <label className="volume-control">环境<input aria-label="环境音量" type="range" min="0" max="1" step="0.05" value={sound.rainVolume} onChange={(event) => audioEngine.setVolume('rain', Number(event.target.value))} /><span>{Math.round(sound.rainVolume * 100)}%</span></label>
    <details className="player-section"><summary>定时休息 <span>{timer ? `${time(remaining)} · ${timer.action === 'music' ? '关闭音乐' : '淡出全部'}` : '未开启'}</span></summary>
      <form onSubmit={(event) => { event.preventDefault(); player.startTimer(Number(minutes), action) }}>
        <div className="timer-presets">{[15, 25, 30, 45, 60].map((value) => <button key={value} type="button" aria-pressed={minutes === String(value)} onClick={() => setMinutes(String(value))}>{value} 分</button>)}</div>
        <label className="player-field">自定义分钟<input aria-label="自定义分钟" type="number" min="1" max="180" step="1" required value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label>
        <label className="player-field">到期时<select aria-label="到期行为" value={action} onChange={(event) => setAction(event.target.value as TimerAction)}><option value="music">关闭音乐，保留环境声</option><option value="all">淡出全部声音</option></select></label>
        <div className="player-actions"><button type="submit">{timer ? '重新计时' : '开始计时'}</button>{timer && <button type="button" onClick={player.cancelTimer}>取消定时</button>}</div>
      </form>
      <p className="fine-print">关闭面板不影响计时。后台暂停声音，返回时校正到期状态；锁屏瞬时执行无法保证。刷新会停止声音并取消定时。</p>
    </details>
    <details className="player-section"><summary>曲库 <span>{library.catalog.length} 首 · 内置 / 本地</span></summary>
      <p className="fine-print">按当前状态筛选，心情 / 喜好 / 新鲜度加权推荐。睡眠只提供无旋律噪音。</p>
      <ul className="track-list">{library.catalog.map((track) => {
        const eligible = isEligible(track, sound.settings.mode)
        return <li key={track.id}>
          <button className="track-select" disabled={!eligible || library.loading} aria-current={current?.id === track.id ? 'true' : undefined} onClick={() => { void player.select(track) }}><strong>{track.title}</strong><small>{!eligible ? '当前状态不适用' : track.source === 'generated' ? '原创合成 Demo' : '本地导入'} · {time(track.duration)}</small></button>
          {track.source === 'imported' && <button className="track-delete" aria-label={`删除 ${track.title}`} disabled={unavailable || library.loading} onClick={() => setPendingDelete(track.id)}>删除</button>}
        </li>
      })}</ul>
      <button className="text-button" disabled={library.loading} onClick={() => { void player.select(null) }}>只听环境声</button>
      {pendingDelete && <div className="delete-confirm" role="group" aria-label="确认删除"><p>删除「{library.catalog.find((track) => track.id === pendingDelete)?.title}」在此设备的副本和偏好？原文件不受影响。</p><div className="player-actions"><button disabled={library.busy} onClick={() => { void player.remove(pendingDelete).then(() => setPendingDelete(null)) }}>确认删除</button><button onClick={() => setPendingDelete(null)}>保留</button></div></div>}
      <div className="import-box">
        <h3>带上自己的声音</h3>
        <label className="import-check"><input type="checkbox" checked={instrumental} onChange={(event) => setInstrumental(event.target.checked)} />这是一首舒缓器乐，可用于专注</label>
        <label className="player-field">氛围标签<select aria-label="导入氛围" value={mood} onChange={(event) => setMood(event.target.value as Mood)}>{Object.entries(MOODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="file-label">{library.busy ? '正在处理…' : '选择本地音频'}<input aria-label="选择本地音频" type="file" accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,audio/*" disabled={unavailable || library.loading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void player.importFile(file, instrumental, mood) }} /></label>
        <p className="fine-print">仅导入你有权使用的音频，不上传。单首 ≤10 MiB / 5 分钟；最多 20 首 / 100 MiB。MP3、WAV、M4A、AAC、OGG、FLAC 需浏览器可解码。保存在此浏览器，清理站点数据会丢失。</p>
      </div>
    </details>
    {library.storageError && <button className="text-button" disabled={library.busy} onClick={() => { void player.load() }}>重试读取本地曲库</button>}
    <p className="fine-print player-footnote">建议先调低设备音量。环境音量同时控制天气、列车与门声。</p>
  </section>
}
