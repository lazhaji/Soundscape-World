import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { station } from '../app/runtime'
import { StoreModel } from './StoreModel'
import { Player } from './Player'
import { STATION } from './stationLayout'

interface Props { onReady: () => void; onFailure: () => void }

function usePageVisible() {
  const [visible, setVisible] = useState(!document.hidden)
  useEffect(() => {
    const update = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return visible
}
function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(query.matches)
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])
  return reduced
}

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

function FixedCamera() {
  const size = useThree((state) => state.size)
  return <OrthographicCamera makeDefault position={[8, 11.714, 8]} zoom={Math.min(size.width / 12.5, size.height / 10)} near={0.1} far={80} onUpdate={(camera) => camera.lookAt(0, 0.4, 0)} />
}

function Ground() {
  const { destination } = useSyncExternalStore(station.subscribe, station.getSnapshot)
  return <group>
    <mesh position={[0, -0.19, 0]} raycast={() => {}}><boxGeometry args={[8, 0.38, 8]} /><meshStandardMaterial color="#273f52" roughness={0.7} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} onClick={(event) => {
      // Touch scrolling/drags must not become walking commands.
      if (event.delta > 6) return
      event.stopPropagation()
      station.moveTo({ x: event.point.x, z: event.point.z })
    }}><planeGeometry args={[8, 8]} /><meshBasicMaterial visible={false} /></mesh>
    <mesh position={[0, 0.005, 2.9]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}><planeGeometry args={[8, 1.1]} /><meshStandardMaterial color="#23374a" /></mesh>
    {[-3, -1.5, 0, 1.5, 3].map((x) => <mesh key={x} position={[x, 0.012, 3.2]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}><planeGeometry args={[0.7, 0.035]} /><meshBasicMaterial color="#719baf" /></mesh>)}
    <mesh position={[0, 0.02, STATION.threshold.z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}><planeGeometry args={[1.2, 0.85]} /><meshStandardMaterial color="#788d84" /></mesh>
    {destination && <mesh position={[destination.x, 0.04, destination.z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}><ringGeometry args={[0.16, 0.22, 32]} /><meshBasicMaterial color="#ffe0a0" /></mesh>}
  </group>
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
    <FixedCamera /><SceneRuntime {...props} />
    <hemisphereLight args={['#b2d3e9', '#19324d', 2]} />
    <directionalLight position={[-3, 7, 5]} color="#ffd9a0" intensity={2.6} />
    <Ground /><StoreModel /><Player reducedMotion={reducedMotion} />
  </Canvas>
}
