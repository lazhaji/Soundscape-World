import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { station } from '../app/runtime'

export function Player({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<Group>(null), body = useRef<Group>(null)
  const leftLeg = useRef<Mesh>(null), rightLeg = useRef<Mesh>(null)
  const stride = useRef(0)
  useFrame((_, delta) => {
    const moving = station.getSnapshot().moving
    if (moving) stride.current += Math.min(delta, 0.05) * 13
    if (root.current) { root.current.position.set(station.position.x, 0.03, station.position.z); root.current.rotation.y = station.heading }
    const gait = moving && !reducedMotion ? Math.sin(stride.current) * 0.35 : 0
    if (leftLeg.current) leftLeg.current.rotation.x = gait
    if (rightLeg.current) rightLeg.current.rotation.x = -gait
    if (body.current) body.current.position.y = Math.abs(gait) * 0.025
  })
  return <group ref={root} name="player" position={[station.position.x, 0.03, station.position.z]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}><circleGeometry args={[0.24, 24]} /><meshBasicMaterial color="#0d2233" transparent opacity={0.35} depthWrite={false} /></mesh>
    <group ref={body}>
      <mesh position={[0, 0.4, 0]}><capsuleGeometry args={[0.14, 0.22, 4, 8]} /><meshStandardMaterial color="#f3c47d" /></mesh>
      <mesh position={[0, 0.7, 0]}><sphereGeometry args={[0.14, 12, 8]} /><meshStandardMaterial color="#ebc9a1" /></mesh>
      <mesh position={[0, 0.77, -0.035]}><sphereGeometry args={[0.135, 12, 8]} /><meshStandardMaterial color="#31414e" /></mesh>
      <mesh position={[0, 0.68, 0.127]}><sphereGeometry args={[0.034, 8, 6]} /><meshStandardMaterial color="#d6aa82" /></mesh>
      <mesh ref={leftLeg} position={[-0.065, 0.14, 0]}><boxGeometry args={[0.085, 0.23, 0.095]} /><meshStandardMaterial color="#223b52" /></mesh>
      <mesh ref={rightLeg} position={[0.065, 0.14, 0]}><boxGeometry args={[0.085, 0.23, 0.095]} /><meshStandardMaterial color="#223b52" /></mesh>
    </group>
  </group>
}
