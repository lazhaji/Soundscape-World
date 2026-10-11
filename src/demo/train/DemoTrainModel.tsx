import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, type Group } from 'three'
import type { TrainDemoController } from './TrainDemoController'

interface BlockProps { at: [number, number, number]; size: [number, number, number]; color: string; glow?: boolean }
export function Block({ at, size, color, glow = false }: BlockProps) {
  return <mesh position={at} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.65} emissive={glow ? color : '#000000'} emissiveIntensity={glow ? 0.7 : 0} /></mesh>
}

function Seat({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0.25, z]}>
    <Block at={[0, 0.18, 0]} size={[0.44, 0.35, 0.42]} color="#273745" />
    <Block at={[0, 0.43, 0]} size={[0.6, 0.14, 0.64]} color="#354f66" />
    <group rotation={[-0.09, 0, 0]} position={[0, 0.91, -0.29]}>
      <Block at={[0, 0, 0]} size={[0.6, 0.94, 0.13]} color="#3d5268" />
      <Block at={[0, 0.31, -0.081]} size={[0.45, 0.22, 0.022]} color="#d7dddf" />
      <Block at={[0, -0.2, -0.094]} size={[0.46, 0.33, 0.035]} color="#b7b8b5" />
      <Block at={[0, -0.13, -0.119]} size={[0.12, 0.025, 0.02]} color="#767d7f" />
      {[-0.2, 0, 0.2].map((dx) => <Block key={dx} at={[dx, 0.04, -0.072]} size={[0.012, 0.23, 0.007]} color="#738390" />)}
    </group>
    {[-0.34, 0.34].map((dx) => <Block key={dx} at={[dx, 0.65, 0]} size={[0.065, 0.08, 0.51]} color="#6b7176" />)}
  </group>
}

function Glass({ x, z, width = 1.6 }: { x: number; z: number; width?: number }) {
  return <mesh position={[x, 1.54, z]} rotation={[0, Math.PI / 2, 0]}>
    <planeGeometry args={[width, 1.15]} /><meshStandardMaterial color="#c8e2e2" transparent opacity={0.1} metalness={0.3} roughness={0.15} side={DoubleSide} depthWrite={false} />
  </mesh>
}

export function DemoTrainModel({ controller }: { controller: TrainDemoController }) {
  const root = useRef<Group>(null), firstDoor = useRef<Group>(null), secondDoor = useRef<Group>(null)
  useFrame(() => {
    if (root.current) { root.current.position.z = controller.trainZ; root.current.visible = controller.trainVisible }
    if (firstDoor.current) firstDoor.current.position.z = 2.15 - controller.doorOpen * 0.7
    if (secondDoor.current) secondDoor.current.position.z = 2.85 + controller.doorOpen * 0.7
  })
  return <group ref={root} position={[-5.3, 0, 0]} name="demo-train">
    <Block at={[0, 0.14, 0]} size={[2.72, 0.24, 10.6]} color="#666969" />
    <Block at={[0, 0.275, 0]} size={[2.62, 0.04, 10.4]} color="#726f67" />
    <Block at={[0, 2.66, 0]} size={[2.85, 0.2, 10.6]} color="#e2e4df" />
    <Block at={[0, 2.52, 0]} size={[2.62, 0.04, 10.2]} color="#d6cbb7" />
    {[-1, 1].map((side) => <group key={side}>
      <Block at={[side * 1.35, 2.32, 0]} size={[0.14, 0.44, 10.4]} color="#e5dfce" />
      <Block at={[side * 1.265, 2.13, 0]} size={[0.04, 0.055, 10.2]} color="#a18a65" />
      <Block at={[side * 1.2, 0.91, -1.65]} size={[0.28, 0.075, 6.8]} color="#b9a37b" />
      {(side === 1 ? [[-1.65, 6.7], [4.23, 2.06]] : [[0, 10.4]]).map(([z, length]) => <group key={z!}>
        <Block at={[side * 1.35, 0.6, z!]} size={[0.14, 0.67, length!]} color="#e9e7de" />
        <Block at={[side * 1.435, 0.63, z!]} size={[0.03, 0.21, length!]} color="#315a76" />
      </group>)}
      {[-4.5, -2.7, -0.9, 0.9, 1.8, 3.2, 5.15].map((z) => <Block key={z} at={[side * 1.35, 1.53, z]} size={[0.16, 1.2, 0.13]} color="#c9bfa8" />)}
      {[-3.6, -1.8, 0, 4.15].map((z) => <Glass key={z} x={side * 1.353} z={z} />)}
      <Block at={[side * 0.89, 2.47, 0]} size={[0.12, 0.03, 9.8]} color="#ffe7b5" glow />
      <Block at={[side * 1.1, 2.31, 0]} size={[0.48, 0.035, 9.6]} color="#b9b9ab" />
    </group>)}
    <Glass x={-1.35} z={2.05} width={2.1} />
    {[0, 1].map((side) => <group key={side} ref={side ? secondDoor : firstDoor} position={[1.35, 0, side ? 2.85 : 2.15]}>
      <Block at={[0, 1.18, 0]} size={[0.095, 1.82, 0.68]} color="#cfd6d4" />
      <Block at={[0.055, 1.6, 0]} size={[0.016, 0.8, 0.49]} color="#7497a4" />
      <Block at={[0.058, 0.64, 0]} size={[0.02, 0.2, 0.67]} color="#315a76" />
      <Block at={[0.072, 1.04, side ? -0.25 : 0.25]} size={[0.025, 0.21, 0.035]} color="#adb4b0" />
    </group>)}
    {[-3.3, -1.35, 0.6].flatMap((z) => [-0.77, 0.72].map((x) => <Seat key={`${x}/${z}`} x={x} z={z} />))}
    {[-4.7, 4.7].map((z) => <group key={z}>
      <Block at={[0, 1.35, z]} size={[2.5, 2.05, 0.1]} color="#c8c6b8" />
      <Block at={[0, 1.35, z + (z > 0 ? -0.06 : 0.06)]} size={[0.8, 1.9, 0.04]} color="#aab3b2" />
    </group>)}
    {[-1, 1].map((direction) => <group key={direction} position={[0, 0, direction * 5.1]}>
      <mesh position={[0, 1.25, direction * 0.6]} scale={[1.36, 1.1, 1.55]}><sphereGeometry args={[1, 16, 10]} /><meshStandardMaterial color="#e5e8e1" roughness={0.38} /></mesh>
      <mesh position={[0, 1.8, direction * 1.15]} scale={[1.05, 0.43, 0.7]}><sphereGeometry args={[1, 16, 8]} /><meshStandardMaterial color="#264758" roughness={0.3} /></mesh>
      {[-0.85, 0.85].map((x) => <Block key={x} at={[x, 0.91, direction * 1.65]} size={[0.25, 0.11, 0.1]} color="#ffedb1" glow />)}
    </group>)}
    <pointLight position={[0, 2.2, -2]} intensity={2.4} color="#fff0ce" distance={6} decay={2} />
    <pointLight position={[0, 2.2, 2]} intensity={1.8} color="#fff0ce" distance={6} decay={2} />
  </group>
}
