import { useSyncExternalStore } from 'react'
import { audioEngine } from '../audio/engine'

export function AudioCheck() {
  const { status, message } = useSyncExternalStore(audioEngine.subscribe, audioEngine.getSnapshot)
  const playing = status === 'playing'

  return (
    <section className="audio-check" aria-labelledby="audio-heading">
      <div className="section-label"><span>02 / SOUND CHECK</span><span>本地合成</span></div>
      <h2 id="audio-heading">让声音，先抵达。</h2>
      <p className="muted">点击后试听轻柔白噪音。建议先调低设备音量。</p>
      <button
        className="sound-button"
        onClick={() => { if (playing) audioEngine.stop(); else void audioEngine.startFromGesture() }}
        disabled={status === 'starting' || status === 'unsupported'}
      >
        <span aria-hidden="true">{playing ? 'Ⅱ' : '♪'}</span>
        {playing ? '停止试听' : status === 'starting' ? '正在启声…' : status === 'error' || status === 'interrupted' ? '重试启声' : '点击启声'}
        <span aria-hidden="true">{playing ? '■' : '↗'}</span>
      </button>
      <p className={`audio-status ${playing ? 'is-playing' : ''}`} role="status" data-testid="audio-status">
        <span className="status-dot" aria-hidden="true" />{message}
      </p>
      <p className="fine-print">没有曲库或外部音源。后台播放受浏览器限制。</p>
    </section>
  )
}
