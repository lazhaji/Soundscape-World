import { createContext, useContext, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, MeshStandardMaterial } from 'three'
import { station } from '../app/runtime'
import { FURNITURE, WALLS } from './stationLayout'
import type { StationSimulation } from './StationSimulation'

const StoreSimulation = createContext(station)

interface BoxProps { position: [number, number, number]; size: [number, number, number]; color: string; fade?: boolean; emissive?: string }
function Box({ position, size, color, fade = false, emissive = '#000000' }: BoxProps) {
  const station = useContext(StoreSimulation)
  const material = useRef<MeshStandardMaterial>(null)
  useFrame((_, delta) => {
    if (!fade || !material.current) return
    const target = station.cutaway ? 0.025 : 1
    material.current.opacity += (target - material.current.opacity) * (1 - Math.exp(-7 * Math.min(delta, 0.05)))
    material.current.depthWrite = material.current.opacity > 0.95
  })
  return <mesh position={position} raycast={() => {}}><boxGeometry args={size} /><meshStandardMaterial ref={material} color={color} emissive={emissive} emissiveIntensity={0.35} roughness={0.8} transparent={fade} /></mesh>
}

function SlidingDoor() {
  const station = useContext(StoreSimulation)
  const left = useRef<Group>(null), right = useRef<Group>(null)
  const openness = useRef(0)
  useFrame((_, delta) => {
    openness.current += ((station.doorOpen ? 1 : 0) - openness.current) * (1 - Math.exp(-12 * Math.min(delta, 0.05)))
    if (left.current) left.current.position.x = -0.31 - openness.current * 0.6
    if (right.current) right.current.position.x = 0.31 + openness.current * 0.6
  })
  return <group position={[0, 0, 0.7]}>
    {[0, 1].map((index) => <group key={index} ref={index === 0 ? left : right} position={[index ? 0.31 : -0.31, 0, 0]}>
      <mesh position={[0, 0.77, 0]} raycast={() => {}}><boxGeometry args={[0.59, 1.45, 0.045]} /><meshStandardMaterial color="#b2d3e9" transparent opacity={0.24} depthWrite={false} /></mesh>
      <Box position={[0, 1.49, 0]} size={[0.62, 0.045, 0.07]} color="#668692" />
      <Box position={[0, 0.06, 0]} size={[0.62, 0.045, 0.07]} color="#668692" />
      <Box position={[index ? -0.29 : 0.29, 0.77, 0]} size={[0.045, 1.45, 0.07]} color="#aac9ce" />
      <Box position={[index ? -0.2 : 0.2, 0.74, 0.05]} size={[0.045, 0.25, 0.06]} color="#f3c47d" />
    </group>)}
  </group>
}

/** Replace this visual module with GLB later; navigation and audio stay independent. */
export function StoreModel({ simulation = station }: { simulation?: StationSimulation }) {
  return <StoreSimulation.Provider value={simulation}><group name="store-model">
    <Box position={[0, 0.015, -1]} size={[4.6, 0.03, 3.4]} color="#b4a88d" />
    {WALLS.map((wall, index) => <Box key={index} position={[(wall.minX + wall.maxX) / 2, 0.88, (wall.minZ + wall.maxZ) / 2]} size={[wall.maxX - wall.minX, 1.76, wall.maxZ - wall.minZ]} color={index < 3 ? '#718589' : '#a0b3b5'} fade={index === 1 || index >= 3} />)}
    <Box position={[0, 1.89, -1]} size={[5.05, 0.23, 3.95]} color="#344753" fade />
    <Box position={[0, 1.69, 0.84]} size={[4.72, 0.25, 0.18]} color="#f3c47d" emissive="#e8bb7e" fade />
    <Box position={[0, 1.7, 0.95]} size={[1.1, 0.09, 0.025]} color="#274655" fade />
    {FURNITURE.map((item, index) => {
      const x = (item.minX + item.maxX) / 2, z = (item.minZ + item.maxZ) / 2
      const width = item.maxX - item.minX, depth = item.maxZ - item.minZ
      return <group key={index}>
        <Box position={[x, item.kind === 'fridge' ? 0.6 : 0.38, z]} size={[width, item.kind === 'fridge' ? 1.2 : 0.76, depth]} color={item.kind === 'shelf' ? '#607e85' : '#bdc7b7'} />
        {item.kind === 'shelf' ? [0.35, 0.72, 1.07].map((height) => <group key={height}>
          <Box position={[x, height, z]} size={[width + 0.03, 0.06, depth]} color="#e1c697" />
          {[-0.55, -0.2, 0.15, 0.5].map((offset, n) => <Box key={offset} position={[x + 0.06, height + 0.14, z + offset]} size={[0.26, 0.21, 0.19]} color={['#bf855d', '#8caa87', '#deca8b', '#9ab2bb'][n]!} />)}
        </group>) : item.kind === 'fridge' ? <Box position={[x, 0.7, item.maxZ + 0.015]} size={[width - 0.12, 0.84, 0.04]} color="#487381" emissive="#597d8e" /> : <>
          <Box position={[x, 0.8, z]} size={[width + 0.08, 0.1, depth + 0.05]} color="#ddc699" />
          <Box position={[x + 0.17, 0.96, z]} size={[0.25, 0.22, 0.22]} color="#344753" />
        </>}
      </group>
    })}
    <SlidingDoor />
    <pointLight position={[-0.4, 1.6, -1.2]} color="#ffd9a0" intensity={4} distance={5} decay={2} />
  </group></StoreSimulation.Provider>
}
