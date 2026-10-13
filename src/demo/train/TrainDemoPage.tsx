import { lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { audioEngine } from '../../audio/engine'
import type { StatusChoice } from '../../features/status'
import { ErrorBoundary } from '../../ui/ErrorBoundary'
import { AudioControls } from '../../ui/AudioControls'
import { GlassDialog } from '../../ui/GlassDialog'
import { LiquidStatus, type GlassFrame } from '../../ui/LiquidStatus'
import { activateDemo, confirmDemoChoice, loadTrainSettings, trainDemo } from './runtime'
import './train-demo.css'

const TrainDemoScene = lazy(() => import('./TrainDemoScene'))

export default function TrainDemoPage() {
  const state = useSyncExternalStore(trainDemo.subscribe, trainDemo.getSnapshot)
  const sound = useSyncExternalStore(audioEngine.subscribe, audioEngine.getSnapshot)
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState(false), [warning, setWarning] = useState(''), [soundOpen, setSoundOpen] = useState(false)
  const curtain = useRef<HTMLDivElement>(null), glassFrame = useRef<GlassFrame>(null)
  const onFrame = useCallback((source: HTMLCanvasElement) => glassFrame.current?.(source), [])
  const onFade = useCallback((opacity: number) => { if (curtain.current) curtain.current.style.opacity = String(opacity) }, [])
  const onReady = useCallback(() => setReady(true), [])
  const onFailure = useCallback(() => { setFailed(true); setReady(false) }, [])
  const select = useCallback((choice: StatusChoice) => trainDemo.choose(choice), [])
  const confirm = useCallback((choice: StatusChoice) => {
    void confirmDemoChoice(choice).then(() => setWarning(''), () => setWarning('当前选择未能保存在此设备，刷新后需要重新选择。'))
  }, [])
  useEffect(activateDemo, [])
  useEffect(() => {
    let active = true
    void loadTrainSettings().catch(() => { if (active) setWarning('无法读取设备设置，已使用平静；本次仍可继续。') }).finally(() => { if (active) setLoaded(true) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (ready || failed) return
    const timer = setTimeout(onFailure, 12000)
    return () => clearTimeout(timer)
  }, [ready, failed, onFailure, attempt])
  const retry = () => { setFailed(false); setReady(false); setAttempt((n) => n + 1) }
  const selecting = state.phase === 'cruising'
  return <main className="train-demo" data-testid="train-demo" data-phase={state.phase} data-weather={state.environment.weather} data-daylight={state.environment.daylight}>
    <div className="train-demo-canvas">
      <ErrorBoundary key={attempt} fallback={<div className="train-demo-error" role="alert"><strong>3D 场景暂时无法加载</strong><button onClick={() => window.location.reload()}>重新加载</button></div>}>
        {!failed && <Suspense fallback={null}><TrainDemoScene onFade={onFade} onReady={onReady} onFailure={onFailure} onFrame={onFrame} /></Suspense>}
      </ErrorBoundary>
    </div>
    <div ref={curtain} className="train-demo-curtain" aria-hidden="true" />
    {!ready && <div className="train-demo-loading" role="status"><strong>{failed ? '画面暂时未能开启' : '正在准备列车与站台…'}</strong>{failed && <><p>WebGL 不可用、连接中断或初始化超时。</p><button onClick={retry}>重试画面</button></>}</div>}
    {selecting && ready && loaded && <LiquidStatus initial={state.choice} frameRef={glassFrame} onSelect={select} onConfirm={confirm} />}
    {state.phase === 'station' && <section className="train-station-tools" aria-label="便利店操作">
      <button onClick={() => setSoundOpen(true)}>声音</button><button onClick={trainDemo.returnToTrain}>返回列车</button>
      <p>Demo · 程序化场景与原创音景 · 日文广播待接入</p>
    </section>}
    <div className={selecting ? 'sr-only' : 'train-notices'} role="status">{warning}{['error', 'unsupported', 'background', 'interrupted'].includes(sound.status) && sound.message}</div>
    {soundOpen && <GlassDialog labelId="audio-heading" onClose={() => setSoundOpen(false)} className="sound-dialog player-dialog" frameRef={glassFrame}><AudioControls /></GlassDialog>}
  </main>
}
