import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { journey, station } from '../app/runtime'
import { ARRIVAL } from '../app/JourneyController'
import type { OrthographicCamera as Camera } from 'three'
import { StoreModel } from './StoreModel'
import { Player } from './Player'
import { STATION } from './stationLayout'
import { usePageVisible, useReducedMotion } from './sceneHooks'

interface Props { onReady: () => void; onFailure: () => void }

function SceneRuntime({ onReady, onFailure }: Props) {
  const gl = useThree((state) => state.gl)
  const rendered = useRef(false)
  useFrame((_, delta) => {
    if (!rendered.current) { rendered.current = true; onReady() }
    if (!document.hidden) station.step(delta)
  })
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onFailure() }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl, onFailure])
  return null
}

function FixedCamera({ cinematic = false }: { cinematic?: boolean }) {
  const size = useThree((state) => state.size)
  const ref = useRef<Camera>(null)
  useFrame(() => {
    if (!ref.current || !cinematic) return
    const progress = journey.getSnapshot().phase === 'arriving' ? Math.max(0, Math.min(1, (journey.arrivalSeconds - ARRIVAL.lifting) / (ARRIVAL.complete - ARRIVAL.lifting))) : 1
    const eased = progress * progress * (3 - 2 * progress)
    ref.current.position.set(4 + 4 * eased, 3.8 + 7.914 * eased, 9 - eased)
    ref.current.lookAt(0, 0.4, 0)
  })
  return <OrthographicCamera ref={ref} makeDefault position={[8, 11.714, 8]} zoom={Math.min(size.width / 12.5, size.height / 10)} near={0.1} far={80} onUpdate={(camera) => camera.lookAt(0, 0.4, 0)} />
}

function Ground({ interactive }: { interactive: boolean }) {
  const { destination } = useSyncExternalStore(station.subscribe, station.getSnapshot)
  return <group>
    <mesh position={[0, -0.19, 0]} raycast={() => {}}><boxGeometry args={[8, 0.38, 8]} /><meshStandardMaterial color="#273f52" roughness={0.7} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} onClick={(event) => {
      // Touch scrolling/drags must not become walking commands.
      if (event.delta > 6 || !interactive) return
      event.stopPropagation()
      station.moveTo({ x: event.point.x, z: event.point.z })
    }}><planeGeometry args={[8, 8]} /><meshBasicMaterial visible={false} /></mesh>
    <mesh position={[0, 0.005, 2.9]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}><planeGeometry args={[8, 1.1]} /><meshStandardMaterial color="#23374a" /></mesh>
    {[-3, -1.5, 0, 1.5, 3].map((x) => <mesh key={x} position={[x, 0.012, 3.2]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}><planeGeometry args={[0.7, 0.035]} /><meshBasicMaterial color="#719baf" /></mesh>)}
    <mesh position={[0, 0.02, STATION.threshold.z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}><planeGeometry args={[1.2, 0.85]} /><meshStandardMaterial color="#788d84" /></mesh>
    {destination && <mesh position={[destination.x, 0.04, destination.z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}><ringGeometry args={[0.16, 0.22, 32]} /><meshBasicMaterial color="#ffe0a0" /></mesh>}
  </group>
}

export function StationContents({ reducedMotion, cinematic = false, interactive = true }: { reducedMotion: boolean; cinematic?: boolean; interactive?: boolean }) {
  return <>
    <FixedCamera cinematic={cinematic && !reducedMotion} />
    <hemisphereLight args={['#b2d3e9', '#19324d', 2]} />
    <directionalLight position={[-3, 7, 5]} color="#ffd9a0" intensity={2.6} />
    <Ground interactive={interactive} /><StoreModel /><Player reducedMotion={reducedMotion} />
  </>
}

export default function StationScene(props: Props) {
  const visible = usePageVisible()
  const reducedMotion = useReducedMotion()
  return <Canvas
    frameloop={visible ? 'always' : 'never'} dpr={[1, 1.5]}
    gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
    fallback={<p className="scene-fallback" role="alert">无法启动 WebGL。可重试场景，或先聆听声音。</p>}
    aria-label="固定 45 度微缩便利店，点击地面行走"
  >
    <SceneRuntime {...props} /><StationContents reducedMotion={reducedMotion} />
  </Canvas>
}
