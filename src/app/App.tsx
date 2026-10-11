import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { audioEngine } from '../audio/engine'
import { MODES, MOODS, musicPolicy } from '../features/modes'
import type { ModeSettings } from '../features/modes'
import { AudioControls } from '../ui/AudioControls'
import { GlassDialog } from '../ui/GlassDialog'
import { ModeDialog } from '../ui/ModeDialog'
import { WorldViewport } from '../world/WorldViewport'
import { STATION } from '../world/stationLayout'
import { ZONE_NAMES } from '../world/zones'
import { DebugPage } from './DebugPage'
import { attachPageLifecycle, confirmSettings, journey, loadSettings, setDebugMode, station } from './runtime'

const ARRIVAL_COPY = { braking: '列车正在减速', opening: '到了，车门正在打开', alighting: '穿过车门，走进夜色', lifting: '你的声音空间，就在这里' }
const TrainDemoPage = lazy(() => import('../demo/train/TrainDemoPage'))
function ImmersivePage() {
  const { phase, stage, settings, hasArrived } = useSyncExternalStore(journey.subscribe, journey.getSnapshot)
  const world = useSyncExternalStore(station.subscribe, station.getSnapshot)
  const audio = useSyncExternalStore(audioEngine.subscribe, audioEngine.getSnapshot)
  const [soundOpen, setSoundOpen] = useState(false)
  const [storageWarning, setStorageWarning] = useState('')
  const saving = useRef(0)
  useEffect(() => {
    let active = true
    void loadSettings().catch(() => { if (active) setStorageWarning('无法读取此设备的设置，已使用默认选择。') })
    return () => { active = false }
  }, [])
  const confirm = (value: ModeSettings) => {
    const revision = ++saving.current
    void confirmSettings(value).then(() => { if (revision === saving.current) setStorageWarning('') }, () => { if (revision === saving.current) setStorageWarning('设置暂时无法保存，刷新后可能需要重新选择。') })
  }
  const start = (silent: boolean) => {
    if (silent) { if (audio.status === 'playing' || audio.status === 'starting') audioEngine.pause() }
    else void audioEngine.startFromGesture()
    journey.openModes()
  }
  const stationView = phase === 'home_station'
  const returnToTrain = () => { setSoundOpen(false); journey.returnToTrain() }
  return <main className={`immersive-shell phase-${phase}`} data-testid="journey" data-phase={phase} data-stage={stage}>
    <WorldViewport />
    <div className="scene-vignette" aria-hidden="true" />
    <header className="journey-header">
      <a className="journey-brand" href="#/" aria-label="Soundscape Railway"><span className="rail-symbol" aria-hidden="true">▥</span><span>SOUNDSCAPE<small>R A I L W A Y</small></span></a>
      <button className="sound-pill glass" onClick={() => setSoundOpen(true)} aria-label="打开声音面板"><span aria-hidden="true">{audio.status === 'playing' ? '♫' : '♪'}</span><span>{audio.status === 'playing' ? '声音已开启' : '声音未播放'}</span></button>
    </header>
    <div className="destination-label"><span className="tiny-dot" /><span>{stationView ? 'HOME STATION / 001' : 'NEXT STOP / 下一站'}</span><strong>雨灯便利店</strong></div>
    {(phase === 'train' || phase === 'mode_select') && <section className="departure-card">
      <p className="eyebrow">A LITTLE JOURNEY INTO SOUND</p>
      <h1>{hasArrived ? '再给自己，' : '把喧嚣，'}<br /><em>{hasArrived ? '一点时间。' : '留在下一站之前。'}</em></h1>
      <p className="departure-copy">一程夜车，一间亮着灯的便利店。<br />跟随声音，慢慢靠近自己。</p>
      <div className="departure-actions"><button className="primary-button" onClick={() => start(false)}>{hasArrived ? '再次启程' : '启程'}<span aria-hidden="true">↗</span></button><button className="quiet-button" onClick={() => start(true)}>静音启程</button></div>
      <p className="gesture-note">点击启程开启声音 · 建议戴上耳机</p>
    </section>}
    {phase === 'arriving' && <section className="arrival-caption glass" aria-live="polite"><p className="eyebrow">ARRIVING / 雨灯站</p><h1>{ARRIVAL_COPY[stage]}</h1><div><button className="quiet-button" onClick={journey.finishArrival}>跳过过场</button><button className="quiet-button" onClick={returnToTrain}>返回车厢</button></div></section>}
    {stationView && <>
      <div className="station-caption"><span>{MODES[settings.mode].name} / {MOODS[settings.mood]}{settings.doNotDisturb ? ' / 勿扰' : ''}</span><h1>雨声在门外，<br />灯光在等你。</h1></div>
      <section className="station-hud glass" aria-label="便利店操作">
        <div className="station-state"><span className="tiny-dot" /><p role="status" data-testid="station-status" data-zone={world.zone}>{ZONE_NAMES[world.zone]} · {world.moving ? '正在散步' : '点地面，走进灯光里'}</p></div>
        <p className="station-sound-copy">{settings.mode === 'sleep' ? '睡眠模式 · 只听雨，安静休息。' : world.zone === 'inside' ? musicPolicy(settings).label : '音乐留在店里，时间依然继续。'}</p>
        <div className="station-actions"><button onClick={() => station.moveTo(world.zone === 'inside' ? STATION.outside : STATION.inside)}>{world.zone === 'inside' ? '走到店外' : '走进店内'} <span aria-hidden="true">↗</span></button><button onClick={() => setSoundOpen(true)}>声音</button><button onClick={returnToTrain}>返回列车</button></div>
      </section>
    </>}
    <div className="journey-notices" aria-live="polite">{storageWarning && <p>{storageWarning}</p>}{['error', 'unsupported', 'background', 'interrupted', 'starting'].includes(audio.status) && <p>{audio.message} <button onClick={() => setSoundOpen(true)}>声音设置</button></p>}</div>
    <div className="journey-footer"><span>Demo · 原创程序化场景与合成音景</span><a href="#/demo/train">列车运镜 Demo ↗</a><a href="#/debug/m1">调试页 ↗</a></div>
    {phase === 'mode_select' && <ModeDialog settings={settings} onClose={journey.closeModes} onConfirm={confirm} />}
    {soundOpen && <GlassDialog labelId="audio-heading" onClose={() => setSoundOpen(false)} className="sound-dialog"><AudioControls /></GlassDialog>}
  </main>
}

export function App() {
  const [route, setRoute] = useState(() => window.location.hash)
  const debug = route === '#/debug/m1'
  useEffect(attachPageLifecycle, [])
  useEffect(() => {
    const change = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  useEffect(() => { setDebugMode(debug) }, [debug])
  if (route === '#/demo/train') return <Suspense fallback={<main className="fatal-error">正在加载运镜 Demo…</main>}><TrainDemoPage /></Suspense>
  return debug ? <DebugPage /> : <ImmersivePage />
}
