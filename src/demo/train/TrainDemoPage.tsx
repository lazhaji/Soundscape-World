import { lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { audioEngine } from '../../audio/engine'
import { ErrorBoundary } from '../../ui/ErrorBoundary'
import { STATION } from '../../world/stationLayout'
import { CHOICES, DAYLIGHT_NAMES, WEATHER_NAMES, type DemoChoice } from './TrainDemoController'
import { activateDemo, confirmDemoChoice, trainDemo } from './runtime'
import './train-demo.css'

const TrainDemoScene = lazy(() => import('./TrainDemoScene'))

export default function TrainDemoPage() {
  const state = useSyncExternalStore(trainDemo.subscribe, trainDemo.getSnapshot)
  const world = useSyncExternalStore(trainDemo.station.subscribe, trainDemo.station.getSnapshot)
  const sound = useSyncExternalStore(audioEngine.subscribe, audioEngine.getSnapshot)
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0)
  const [details, setDetails] = useState(false)
  const curtain = useRef<HTMLDivElement>(null)
  const onFade = useCallback((opacity: number) => { if (curtain.current) curtain.current.style.opacity = String(opacity) }, [])
  const onReady = useCallback(() => setReady(true), [])
  const onFailure = useCallback(() => { setFailed(true); setReady(false) }, [])
  useEffect(activateDemo, [])
  useEffect(() => {
    if (ready || failed) return
    const timer = setTimeout(onFailure, 12000)
    return () => clearTimeout(timer)
  }, [ready, failed, onFailure, attempt])
  const retry = () => { setFailed(false); setReady(false); setAttempt((n) => n + 1) }
  const toggleSound = () => { if (sound.status === 'playing' || sound.status === 'starting') audioEngine.pause(); else void audioEngine.startFromGesture() }
  return <main className="train-demo" data-testid="train-demo" data-phase={state.phase} data-weather={state.environment.weather} data-daylight={state.environment.daylight}>
    <div className="train-demo-canvas">
      <ErrorBoundary key={attempt} fallback={<div className="train-demo-error" role="alert"><strong>3D 场景暂时无法加载</strong><button onClick={() => window.location.reload()}>重新加载</button></div>}>
        {!failed && <Suspense fallback={null}><TrainDemoScene onFade={onFade} onReady={onReady} onFailure={onFailure} /></Suspense>}
      </ErrorBoundary>
    </div>
    <div ref={curtain} className="train-demo-curtain" aria-hidden="true" />
    <header className="train-demo-header">
      <a href="#/" aria-label="返回当前正式体验">SOUNDSCAPE<span>RAILWAY / MOTION STUDY</span></a>
      <button className="train-demo-sound" onClick={toggleSound} disabled={!ready}>{sound.status === 'playing' ? '暂停声音' : sound.status === 'starting' ? '正在启声' : '开启声音'}</button>
    </header>
    <aside className="train-demo-meta"><span className="train-demo-badge">DEMO 01</span><span>{WEATHER_NAMES[state.environment.weather]} · {DAYLIGHT_NAMES[state.environment.daylight]}</span><span>第 {String(state.trip).padStart(2, '0')} 段旅程</span></aside>
    {!ready && <div className="train-demo-loading" role="status"><strong>{failed ? '画面暂时未能开启' : '正在准备列车与站台…'}</strong><p>{failed ? 'WebGL 不可用、连接中断或初始化超时。' : '加载本地场景并初始化 3D。'}</p>{failed && <button onClick={retry}>重试画面</button>}</div>}
    <section className="train-demo-bottom">
      <div className="train-demo-caption" role="status" aria-live="polite"><span>{state.phase === 'cruising' ? 'TAKE A LITTLE JOURNEY' : state.phase === 'station' ? 'YOUR LITTLE PLACE' : 'BETWEEN TWO PLACES'}</span><h1>{state.stage}</h1></div>
      {state.phase === 'cruising' ? <div className="train-demo-controls">
        <label>此刻的状态<select aria-label="Demo 模式" value={state.choice} disabled={!ready} onChange={(event) => trainDemo.choose(event.target.value as DemoChoice)}>{Object.entries(CHOICES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button className="train-demo-primary" disabled={!ready} onClick={confirmDemoChoice}>确认并到站 <span aria-hidden="true">↗</span></button>
      </div> : state.phase === 'station' ? <div className="train-demo-controls train-demo-station-controls">
        <button disabled={!ready} onClick={() => trainDemo.moveTo(world.zone === 'inside' ? STATION.outside : STATION.inside)}>{world.zone === 'inside' ? '走到店外' : '走进店内'}</button>
        <button className="train-demo-primary" disabled={!ready} onClick={trainDemo.returnToTrain}>返回列车 <span aria-hidden="true">↗</span></button>
      </div> : <div className="train-demo-in-flight"><i aria-hidden="true" />{state.phase === 'arriving' ? '镜头穿窗，乘客从车门下车' : '人物与下一班列车正在汇合'}</div>}
      {['error', 'unsupported', 'background', 'interrupted'].includes(sound.status) && <p className="train-demo-notice" role="status">{sound.message}</p>}
      <div className="train-demo-footnote"><span>程序化模型 · 日文广播待接入</span><button onClick={() => setDetails(!details)} aria-expanded={details}>Demo 说明</button></div>
      {details && <div className="train-demo-details"><p>本版验证 8 秒到站、约 12 秒返程、固定 45° 与随机天气。人物可点击地面移动，也可用按钮进出店。</p><p>模式选择是临时控件，尚未接入最终液态玻璃胶囊和设置存储。现有声音为原创器乐、雨／风、列车底噪及开关门 Demo。</p><p>日文广播文案与 30–45 秒调度已准备，实际语音素材尚未接入；没有用字幕冒充广播。去程和返程均无跳过。</p></div>}
    </section>
  </main>
}
