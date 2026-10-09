import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import type { GroundPoint } from './PlaceholderScene'

const PlaceholderScene = lazy(() => import('./PlaceholderScene'))

function SceneAttempt({ onRetry }: { onRetry: () => void }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [point, setPoint] = useState<GroundPoint | null>(null)
  const onReady = useCallback(() => setStatus('ready'), [])
  const onFailure = useCallback(() => setStatus('error'), [])

  useEffect(() => {
    if (status !== 'loading') return
    const timeout = window.setTimeout(onFailure, 12000)
    return () => window.clearTimeout(timeout)
  }, [status, onFailure])

  return (
    <>
      <div className="scene-canvas" data-testid="scene-canvas">
        {status === 'error' ? (
          <div className="scene-fallback" role="alert"><strong>3D 场景暂时不可用</strong><p>WebGL 未能启动或上下文已丢失，请重试或更换支持 WebGL 的浏览器。声音仍可单独试听。</p></div>
        ) : (
          <Suspense fallback={<p className="scene-fallback" role="status">正在加载 3D 模块…</p>}>
            <PlaceholderScene point={point} onPoint={setPoint} onReady={onReady} onFailure={onFailure} />
          </Suspense>
        )}
        <span className="scene-stamp" aria-hidden="true">SCENE / 000</span>
        <span className="view-label">固定 45° · 正交视角</span>
      </div>
      <div className="scene-feedback">
        <p role="status" data-testid="scene-status">
          {status === 'loading' ? '正在初始化 3D…' : status === 'error' ? '场景不可用' : point ? `触点 X ${point.x.toFixed(2)} / Z ${point.z.toFixed(2)}` : '3D 已就绪 · 点击底座试试'}
        </p>
        <button className="text-button" onClick={onRetry}>重新加载场景</button>
      </div>
      <p className="scene-note">方形底座与建筑盒体均为程序化占位。触点仅用于输入验证。</p>
    </>
  )
}

export function ScenePreview() {
  const [attempt, setAttempt] = useState(0)
  return (
    <section className="scene-panel" aria-labelledby="scene-heading">
      <div className="section-label"><h2 id="scene-heading">01 / SCENE CHECK</h2><span>Demo · 占位模型</span></div>
      <ErrorBoundary key={attempt} fallback={<div className="scene-fallback" role="alert"><p>3D 模块加载失败。请检查网络后重新加载页面。</p><button className="text-button" onClick={() => window.location.reload()}>重新加载页面</button></div>}>
        <SceneAttempt onRetry={() => setAttempt((value) => value + 1)} />
      </ErrorBoundary>
    </section>
  )
}
