import { useEffect, useState, useSyncExternalStore } from 'react'
import { audioEngine } from '../audio/engine'
import { MUSIC_DURATION } from '../audio/generatedAudio'
import { ZONE_NAMES } from '../world/zones'
import type { AudioZone } from '../audio/mixer'
import { musicPolicy } from '../features/modes'

const zoneCopy: Record<AudioZone, string> = {
  train: '列车行驶底噪轻轻响起，雨声留在窗外。',
  outside: '此处以雨声为主。音乐淡至静音，旋律仍在继续。',
  doorway: '停在门口，听雨声与店内的旋律轻轻交叠。',
  inside: '屋内旋律渐渐清晰，雨声退到窗外。',
}

function Progress() {
  const [elapsed, setElapsed] = useState(audioEngine.getPlaybackSeconds)
  useEffect(() => {
    const interval = window.setInterval(() => setElapsed(audioEngine.getPlaybackSeconds()), 500)
    return () => window.clearInterval(interval)
  }, [])
  const second = Math.floor(elapsed % MUSIC_DURATION)
  return <output className="track-progress" data-testid="music-progress" data-elapsed={elapsed.toFixed(2)}>00:{String(second).padStart(2, '0')} / 00:32</output>
}

export function AudioControls() {
  const { status, message, zone, musicVolume, rainVolume, settings } = useSyncExternalStore(audioEngine.subscribe, audioEngine.getSnapshot)
  const playing = status === 'playing'
  return <section className="audio-check" aria-labelledby="audio-heading">
    <div className="section-label"><span>02 / SOUNDS OF THIS PLACE</span><span>原创 Demo</span></div>
    <h2 id="audio-heading">一扇门，两种声音。</h2>
    <div className="zone-strip" aria-label="当前空间">{(['outside', 'doorway', 'inside'] as const).map((item) => <span key={item} aria-current={item === zone ? 'location' : undefined}>{ZONE_NAMES[item]}</span>)}</div>
    <p className="muted zone-copy" data-testid="zone-description">{settings.mode === 'sleep' && zone !== 'train' ? '睡眠模式只保留雨声，进店也不会开启旋律。' : zoneCopy[zone]}</p>
    <button className="sound-button" onClick={() => { if (playing) audioEngine.pause(); else void audioEngine.startFromGesture() }} disabled={status === 'starting' || status === 'unsupported'}>
      <span aria-hidden="true">{playing ? 'Ⅱ' : '♪'}</span>
      {playing ? '暂停声音' : status === 'starting' ? '正在启声…' : status === 'idle' ? '点击启声' : '继续聆听'}
      <span aria-hidden="true">{playing ? '■' : '↗'}</span>
    </button>
    <p className={`audio-status ${playing ? 'is-playing' : ''}`} role="status" data-testid="audio-status"><span className="status-dot" aria-hidden="true" />{message}</p>
    <div className="track-card"><div><strong>{musicPolicy(settings).label}</strong><span>原创合成音景 · 旋律时间持续</span></div><Progress /></div>
    <label className="volume-control">音乐<input aria-label="音乐音量" type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={(event) => audioEngine.setVolume('music', Number(event.target.value))} /><span>{Math.round(musicVolume * 100)}%</span></label>
    <label className="volume-control">雨声<input aria-label="雨声音量" type="range" min="0" max="1" step="0.05" value={rainVolume} onChange={(event) => audioEngine.setVolume('rain', Number(event.target.value))} /><span>{Math.round(rainVolume * 100)}%</span></label>
    <p className="fine-print">建议先调低设备音量。切到后台会暂停，回来后点击继续；刷新后需重新启声。</p>
  </section>
}
