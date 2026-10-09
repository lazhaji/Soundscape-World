import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { ErrorBoundary } from '../ui/ErrorBoundary'

const WorldScene = lazy(() => import('./WorldScene'))
function Attempt({ onRetry }: { onRetry: () => void }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const ready = useCallback(() => setStatus('ready'), [])
  const failure = useCallback(() => setStatus('error'), [])
  useEffect(() => {
    if (status !== 'loading') return
    const timeout = setTimeout(failure, 12000)
    return () => clearTimeout(timeout)
  }, [status, failure])
  return <>
    {status !== 'error' && <Suspense fallback={null}><WorldScene onReady={ready} onFailure={failure} /></Suspense>}
    {status !== 'ready' && <div className="world-loading glass" role="status">
      <span className="eyebrow">SOUNDSCAPE RAILWAY</span>
      <strong>{status === 'loading' ? '正在准备这段旅程…' : '画面暂时未能开启'}</strong>
      <p>{status === 'loading' ? '加载场景模块并初始化 3D。你也可以先选择模式。' : '3D 初始化超时或 WebGL 不可用。声音仍可独立控制。'}</p>
      <button className="quiet-button" onClick={onRetry}>重试画面</button>
    </div>}
  </>
}
export function WorldViewport() {
  const [attempt, setAttempt] = useState(0)
  return <div className="world-viewport" data-testid="world-viewport">
    <ErrorBoundary key={attempt} fallback={<div className="world-loading glass" role="alert"><strong>场景模块加载失败</strong><p>请检查连接后重新加载；声音面板仍可使用。</p><button className="quiet-button" onClick={() => window.location.reload()}>重新加载页面</button></div>}>
      <Attempt onRetry={() => setAttempt((value) => value + 1)} />
    </ErrorBoundary>
  </div>
}
