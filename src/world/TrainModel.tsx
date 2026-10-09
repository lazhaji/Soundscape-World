import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import type { Group, PerspectiveCamera as Camera } from 'three'
import { journey } from '../app/runtime'
import { ARRIVAL } from '../app/JourneyController'

function Box({ position, size, color, glow = false }: { position: [number, number, number]; size: [number, number, number]; color: string; glow?: boolean }) {
  return <mesh position={position}><boxGeometry args={size} />{glow ? <meshBasicMaterial color={color} /> : <meshStandardMaterial color={color} roughness={0.65} metalness={0.15} />}</mesh>
}

function Door({ side, openness }: { side: -1 | 1; openness: () => number }) {
  const group = useRef<Group>(null)
  useFrame(() => { if (group.current) group.current.position.x = side * (0.48 + openness() * 0.98) })
  return <group ref={group} position={[side * 0.48, 0, -2.58]}>
    <Box position={[0, 0.54, 0]} size={[0.94, 1.06, 0.11]} color="#7d8d96" />
    <Box position={[0, 2.57, 0]} size={[0.94, 0.28, 0.11]} color="#7d8d96" />
    {[-0.435, 0.435].map((x) => <Box key={x} position={[x, 1.78, 0]} size={[0.07, 1.45, 0.12]} color="#a4b5b9" />)}
    <mesh position={[0, 1.77, 0]}><boxGeometry args={[0.79, 1.33, 0.035]} /><meshStandardMaterial color="#91b3b9" transparent opacity={0.19} metalness={0.4} roughness={0.18} /></mesh>
    <Box position={[-side * 0.36, 0.91, 0.075]} size={[0.025, 0.4, 0.035]} color="#d3d9d4" />
    <Box position={[0, 0.3, 0.08]} size={[0.7, 0.024, 0.015]} color="#dac393" />
  </group>
}

function PassingLandscape({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<Group>(null)
  const distance = useRef(0)
  useFrame((_, delta) => {
    const state = journey.getSnapshot()
    const speed = state.phase === 'arriving' ? Math.max(0, 1 - journey.arrivalSeconds / ARRIVAL.opening) : 1
    if (!reducedMotion) distance.current += Math.min(delta, 0.05) * 5 * speed
    root.current?.children.forEach((building, index) => { building.position.x = ((index * 2.3 + distance.current) % 32.2) - 16.1 })
  })
  return <group ref={root} position={[0, 0, -5]}>
    {Array.from({ length: 14 }, (_, index) => <group key={index} position={[index * 2.3 - 16.1, 0, 0]}>
      <Box position={[0, 0.9, 0]} size={[1.7, 2 + index % 3 * 0.45, 0.6]} color={index % 2 ? '#21364e' : '#182d46'} />
      {[0.65, 1.2, 1.75].map((y) => <Box key={y} position={[0, y, 0.32]} size={[0.92, 0.045, 0.03]} color={index % 3 ? '#617b88' : '#bdaf8b'} glow />)}
      <Box position={[0.96, 1.9, 0.1]} size={[0.035, 3.7, 0.05]} color="#3c5369" />
    </group>)}
  </group>
}

export function TrainModel({ reducedMotion }: { reducedMotion: boolean }) {
  const camera = useRef<Camera>(null)
  const size = useThree((state) => state.size)
  const elapsed = useRef(0)
  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, 0.05)
    if (!camera.current) return
    const state = journey.getSnapshot()
    const speed = state.phase === 'arriving' ? Math.max(0, 1 - journey.arrivalSeconds / ARRIVAL.opening) : 1
    const walk = state.phase === 'arriving' ? Math.max(0, (journey.arrivalSeconds - ARRIVAL.alighting) / (ARRIVAL.lifting - ARRIVAL.alighting)) : 0
    camera.current.position.set(0, 1.54 + (reducedMotion ? 0 : Math.sin(elapsed.current * 5) * 0.006 * speed), 4.7 - walk * 4.8)
    camera.current.lookAt(0, 1.43, -2.6)
  })
  const openness = () => Math.min(1, Math.max(0, (journey.arrivalSeconds - ARRIVAL.opening) / (ARRIVAL.alighting - ARRIVAL.opening)))
  return <>
    <PerspectiveCamera ref={camera} makeDefault position={[0, 1.54, 4.7]} fov={size.width < size.height ? 53 : 43} near={0.08} far={60} />
    <color attach="background" args={['#101d32']} />
    <hemisphereLight args={['#d5e2e4', '#19324d', 1.7]} />
    <pointLight position={[0, 2.7, 1]} color="#ffe0b0" intensity={16} distance={10} decay={2} />
    <pointLight position={[0, 2.5, -1.6]} color="#f3d3a1" intensity={7} distance={6} decay={2} />
    <PassingLandscape reducedMotion={reducedMotion} />
    <Box position={[0, -0.08, 0.6]} size={[5.4, 0.16, 9]} color="#253c4a" />
    <Box position={[0, 3.13, 0.6]} size={[5.4, 0.15, 9]} color="#b1b5ad" />
    {[-1, 1].map((side) => <group key={side}>
      <Box position={[side * 2.65, 1.5, 0.6]} size={[0.14, 3.2, 9]} color="#82949a" />
      <Box position={[side * 1.85, 0.53, -2.7]} size={[1.65, 1.08, 0.15]} color="#8b9ca0" />
      <Box position={[side * 1.85, 2.75, -2.7]} size={[1.65, 0.76, 0.15]} color="#8b9ca0" />
      <Box position={[side * 2.57, 1.75, -2.7]} size={[0.18, 1.6, 0.18]} color="#8b9ca0" />
      <Box position={[side * 1.07, 1.5, -2.61]} size={[0.16, 3.02, 0.28]} color="#bcc6be" />
      <Box position={[side * 1.37, 1.42, -2.45]} size={[0.035, 1.08, 0.04]} color="#dedbc0" />
      <Box position={[side * 1.85, 1.03, -2.6]} size={[1.4, 0.08, 0.2]} color="#bac5bc" />
      <Box position={[side * 1.85, 2.37, -2.6]} size={[1.4, 0.08, 0.2]} color="#bac5bc" />
      <Box position={[side * 1.85, 2.94, 0.2]} size={[0.1, 0.04, 7]} color="#ffe2ae" glow />
      <Box position={[side * 1.3, 0.01, 0.4]} size={[0.018, 0.018, 7]} color="#748886" />
      {[0, 1.6, 3.2].map((z) => <group key={z} position={[side * 2.12, 0, z]}>
        <Box position={[0, 0.47, 0]} size={[0.78, 0.25, 1.13]} color="#3d6876" />
        <Box position={[side * 0.26, 0.94, 0]} size={[0.22, 0.85, 1.13]} color="#3b6170" />
        <Box position={[side * 0.22, 1.35, 0]} size={[0.25, 0.18, 0.7]} color="#afbab1" />
        <Box position={[0, 0.71, 0.6]} size={[0.64, 0.065, 0.06]} color="#acbdb7" />
      </group>)}
    </group>)}
    <Box position={[0, 2.9, -2.5]} size={[1.7, 0.27, 0.18]} color="#142c3d" />
    <Box position={[0, 2.9, -2.395]} size={[0.67, 0.045, 0.02]} color="#f3c47d" glow />
    <Box position={[0, 0.025, -2.45]} size={[2.04, 0.025, 0.16]} color="#dfc79d" />
    <Door side={-1} openness={openness} /><Door side={1} openness={openness} />
  </>
}
