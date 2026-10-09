import { lazy, Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { station } from '../app/runtime'
import { STATION } from './stationLayout'
import { ZONE_NAMES } from './zones'

const StationScene = lazy(() => import('./StationScene'))

function SceneAttempt({ onRetry }: { onRetry: () => void }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const snapshot = useSyncExternalStore(station.subscribe, station.getSnapshot)
  const onReady = useCallback(() => setStatus('ready'), [])
  const onFailure = useCallback(() => setStatus('error'), [])
  useEffect(() => {
    if (status !== 'loading') return
    const timeout = window.setTimeout(onFailure, 12000)
    return () => window.clearTimeout(timeout)
  }, [status, onFailure])

  return <>
    <div className="scene-canvas" data-testid="scene-canvas">
      {status === 'error' ? <div className="scene-fallback" role="alert"><strong>3D 场景暂时不可用</strong><p>WebGL 未能启动或上下文已丢失。请重试，声音仍可单独控制。</p></div> : <Suspense fallback={<p className="scene-fallback" role="status">正在加载便利店…</p>}><StationScene onReady={onReady} onFailure={onFailure} /></Suspense>}
      <span className="scene-stamp" aria-hidden="true">HOME / 001</span><span className="view-label">固定 45° · 点击地面行走</span>
    </div>
    <div className="scene-feedback">
      <p role="status" data-testid="scene-status" data-zone={snapshot.zone} data-moving={snapshot.moving}>{status === 'loading' ? '正在初始化 3D…' : status === 'error' ? '场景不可用' : `${ZONE_NAMES[snapshot.zone]} · ${snapshot.message}`}</p>
      <button className="text-button" onClick={onRetry}>重载场景</button>
    </div>
    <div className="walk-shortcuts" aria-label="快捷步行目的地">
      <button disabled={status !== 'ready'} onClick={() => station.moveTo(STATION.inside)}>走进店内 <span aria-hidden="true">↗</span></button>
      <button disabled={status !== 'ready'} onClick={() => station.moveTo(STATION.threshold)}>停在门口</button>
      <button disabled={status !== 'ready'} onClick={() => station.moveTo(STATION.outside)}>回到店外 <span aria-hidden="true">↙</span></button>
    </div>
    <p className="scene-note">直接点选地面，或选择上方目的地。靠近店门自动开门，进店后屋顶淡出。</p>
  </>
}

export function ScenePreview() {
  const [attempt, setAttempt] = useState(0)
  return <section className="scene-panel" aria-labelledby="scene-heading">
    <div className="section-label"><h2 id="scene-heading">01 / YOUR LITTLE STATION</h2><span>Demo · 程序化场景</span></div>
    <ErrorBoundary key={attempt} fallback={<div className="scene-fallback" role="alert"><p>场景加载失败，请检查网络后重载页面。</p><button className="text-button" onClick={() => window.location.reload()}>重新加载页面</button></div>}>
      <SceneAttempt onRetry={() => setAttempt((value) => value + 1)} />
    </ErrorBoundary>
  </section>
}
