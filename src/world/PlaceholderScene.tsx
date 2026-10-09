import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'

export type GroundPoint = { x: number; z: number }
interface Props {
  point: GroundPoint | null
  onPoint: (point: GroundPoint) => void
  onReady: () => void
  onFailure: () => void
}

function Lifecycle({ onReady, onFailure }: Pick<Props, 'onReady' | 'onFailure'>) {
  const gl = useThree((state) => state.gl)
  const rendered = useRef(false)
  useFrame(() => {
    if (!rendered.current) {
      rendered.current = true
      onReady()
    }
  })
  useEffect(() => {
    const canvas = gl.domElement
    const lost = (event: Event) => { event.preventDefault(); onFailure() }
    canvas.addEventListener('webglcontextlost', lost)
    return () => { canvas.removeEventListener('webglcontextlost', lost) }
  }, [gl, onFailure])
  return null
}

function FixedCamera() {
  const size = useThree((state) => state.size)
  return <OrthographicCamera makeDefault position={[8, 11.714, 8]} zoom={Math.min(size.width / 10.5, size.height / 8.5)} near={0.1} far={80} onUpdate={(camera) => camera.lookAt(0, 0.4, 0)} />
}

/** Deliberately a blockout, not the M1 explorable store. R3F owns/disposes these resources. */
export default function PlaceholderScene({ point, onPoint, onReady, onFailure }: Props) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      fallback={<p className="scene-fallback" role="alert">无法创建 WebGL 画布。请使用下方「重新加载场景」重试。</p>}
      aria-label="固定 45 度视角的程序化建筑占位，点击底座验证触点"
    >
      <FixedCamera />
      <Lifecycle onReady={onReady} onFailure={onFailure} />
      <hemisphereLight args={['#b2d3e9', '#19324d', 2.4]} />
      <directionalLight position={[-3, 7, 5]} color="#ffd9a0" intensity={3.2} />
      <mesh position={[0, -0.18, 0]} onClick={(event) => { event.stopPropagation(); onPoint({ x: event.point.x, z: event.point.z }) }}>
        <boxGeometry args={[6, 0.36, 6]} />
        <meshStandardMaterial color="#3d556a" roughness={0.85} />
      </mesh>
      <group onClick={(event) => event.stopPropagation()}>
        <mesh position={[-0.45, 0.9, -0.5]}>
          <boxGeometry args={[3.5, 1.8, 2.6]} />
          <meshStandardMaterial color="#abc0c6" roughness={0.85} />
        </mesh>
        <mesh position={[-0.45, 1.9, -0.5]}>
          <boxGeometry args={[3.9, 0.22, 3]} />
          <meshStandardMaterial color="#304457" />
        </mesh>
        <mesh position={[-0.45, 1.56, 0.825]}>
          <boxGeometry args={[3.6, 0.27, 0.12]} />
          <meshStandardMaterial color="#f3c47d" emissive="#f3c47d" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[-1.1, 0.86, 0.816]}>
          <boxGeometry args={[1.65, 1, 0.08]} />
          <meshStandardMaterial color="#ffd9a0" emissive="#f3c47d" emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[0.59, 0.7, 0.826]}>
          <boxGeometry args={[0.7, 1.4, 0.1]} />
          <meshStandardMaterial color="#648b9e" metalness={0.2} roughness={0.55} />
        </mesh>
      </group>
      {point && <mesh position={[point.x, 0.035, point.z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}>
        <ringGeometry args={[0.12, 0.2, 32]} />
        <meshBasicMaterial color="#ffd9a0" />
      </mesh>}
    </Canvas>
  )
}
