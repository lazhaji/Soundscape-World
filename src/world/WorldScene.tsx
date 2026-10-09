import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { journey, station } from '../app/runtime'
import { StationContents } from './StationScene'
import { TrainModel } from './TrainModel'
import { usePageVisible, useReducedMotion } from './sceneHooks'

interface Props { onReady: () => void; onFailure: () => void }
function WorldRuntime({ onReady, onFailure, reducedMotion }: Props & { reducedMotion: boolean }) {
  const gl = useThree((state) => state.gl)
  const ready = useRef(false)
  useFrame((_, delta) => {
    if (!ready.current) { ready.current = true; onReady() }
    if (document.hidden) return
    journey.step(delta, reducedMotion)
    const { phase, stage } = journey.getSnapshot()
    if (phase === 'home_station' || (phase === 'arriving' && stage === 'lifting')) station.step(delta)
  })
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onFailure() }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl, onFailure])
  return null
}

export default function WorldScene(props: Props) {
  const visible = usePageVisible()
  const reducedMotion = useReducedMotion()
  const { phase, stage } = useSyncExternalStore(journey.subscribe, journey.getSnapshot)
  const atStation = phase === 'home_station' || (phase === 'arriving' && stage === 'lifting')
  return <Canvas frameloop={visible ? 'always' : 'never'} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} aria-label={atStation ? '固定 45 度便利店，点击地面行走' : '新干线车厢，面向车门'} fallback={<p>3D 场景画布；声音与旅程控件位于画布外。</p>}>
    <WorldRuntime {...props} reducedMotion={reducedMotion} />
    {atStation ? <StationContents reducedMotion={reducedMotion} cinematic interactive={phase === 'home_station'} /> : <TrainModel reducedMotion={reducedMotion} />}
  </Canvas>
}
