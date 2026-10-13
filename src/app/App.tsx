import { lazy, Suspense, useEffect, useState } from 'react'
import { DebugPage } from './DebugPage'
import { attachPageLifecycle, setDebugMode } from './runtime'

const TrainDemoPage = lazy(() => import('../demo/train/TrainDemoPage'))

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
  return debug ? <DebugPage /> : <Suspense fallback={null}><TrainDemoPage /></Suspense>
}
