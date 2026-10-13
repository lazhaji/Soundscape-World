import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CanvasTexture, Object3D, PCFShadowMap, SRGBColorSpace, type BufferAttribute, type Group, type InstancedMesh, type Mesh, type MeshBasicMaterial, type PerspectiveCamera } from 'three'
import { StoreModel } from '../../world/StoreModel'
import { usePageVisible, useReducedMotion } from '../../world/sceneHooks'
import { audioEngine } from '../../audio/engine'
import { Block, DemoTrainModel } from './DemoTrainModel'
import { between, type Environment } from './TrainDemoController'
import { CABIN_SHOT, reducedMotionFade, sampleShot } from './cinematography'
import { syncDemoSound, trainDemo } from './runtime'

const PALETTES = {
  day: { sky: '#a8c9d1', grass: '#7e9a72', leaf: '#688268', light: '#fff3d2', strength: 2.5, ambient: 1.6 },
  dusk: { sky: '#b99286', grass: '#717865', leaf: '#5e7065', light: '#ffd3a1', strength: 2, ambient: 1.1 },
  night: { sky: '#182936', grass: '#324b49', leaf: '#2d4746', light: '#9cc6e3', strength: 1.25, ambient: 0.8 },
}
const fraction = (n: number) => Math.sin(n * 127.1 + 31.7) * 43758.5453 % 1 + 1

function Driver({ reduced, onFade, onReady, onFailure }: { reduced: boolean; onFade: (opacity: number) => void; onReady: () => void; onFailure: () => void }) {
  const { gl } = useThree()
  const ready = useRef(false)
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onFailure() }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl, onFailure])
  useFrame((state, delta) => {
    if (document.hidden) return
    trainDemo.step(delta)
    syncDemoSound()
    const shot = sampleShot(trainDemo, state.size.width / state.size.height, reduced)
    const camera = state.camera as PerspectiveCamera
    const sway = !reduced && trainDemo.getSnapshot().phase === 'cruising' ? Math.sin(trainDemo.elapsed * 1.7) * 0.006 : 0
    camera.position.set(shot.eye[0], shot.eye[1] + sway, shot.eye[2])
    camera.lookAt(...shot.target)
    if (Math.abs(camera.fov - shot.fov) > 0.001) { camera.fov = shot.fov; camera.updateProjectionMatrix() }
    onFade(reduced ? reducedMotionFade(trainDemo) : 0)
    if (!ready.current) { ready.current = true; onReady() }
  }, -10)
  return null
}

function Landscape({ environment, reduced }: { environment: Environment; reduced: boolean }) {
  const trees = useRef<InstancedMesh>(null), trunks = useRef<InstancedMesh>(null)
  const offset = useRef(0)
  const dummy = useMemo(() => new Object3D(), [])
  const palette = PALETTES[environment.daylight]
  useFrame((_, delta) => {
    offset.current += reduced ? 0 : Math.min(delta, 0.05) * trainDemo.scenerySpeed
    for (let i = 0; i < 80; i++) {
      const a = fraction(i) % 1, b = fraction(i + 84) % 1
      const x = i % 2 ? 7 + a * 18 : -11 - a * 12
      const z = ((b * 100 - offset.current) % 100 + 100) % 100 - 45
      const height = 1.4 + (fraction(i + 9) % 1) * 2
      dummy.position.set(x, height * 0.52, z); dummy.scale.set(0.13, height, 0.13); dummy.updateMatrix()
      trunks.current?.setMatrixAt(i, dummy.matrix)
      dummy.position.setY(height * 0.85); dummy.scale.set(height * 0.5, height * 0.7, height * 0.5); dummy.updateMatrix()
      trees.current?.setMatrixAt(i, dummy.matrix)
    }
    if (trees.current) trees.current.instanceMatrix.needsUpdate = true
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true
  })
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.36, 0]} receiveShadow><planeGeometry args={[240, 240]} /><meshStandardMaterial color={palette.grass} roughness={1} /></mesh>
    <instancedMesh ref={trunks} args={[undefined, undefined, 80]} frustumCulled={false}><cylinderGeometry args={[1, 1, 1, 5]} /><meshStandardMaterial color="#655f4b" /></instancedMesh>
    <instancedMesh ref={trees} args={[undefined, undefined, 80]} frustumCulled={false}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color={palette.leaf} roughness={1} /></instancedMesh>
    {[-1, 1].map((side) => <mesh key={side} position={[side * 58, 1.5, -20]} scale={[45, 9, 40]}><sphereGeometry args={[1, 20, 10]} /><meshStandardMaterial color={palette.leaf} roughness={1} /></mesh>)}
    {Array.from({ length: environment.weather === 'clear' ? 3 : 8 }, (_, i) => <mesh key={i} position={[38 + i % 3 * 13, 10 + i % 2 * 2, -30 + i * 12]} scale={[9, 1.1, 4.5]}><sphereGeometry args={[1, 12, 6]} /><meshStandardMaterial color={environment.daylight === 'night' ? '#45575b' : environment.weather === 'clear' ? '#eeeee2' : '#b6c0bd'} roughness={1} /></mesh>)}
  </group>
}

function Rain({ active, reduced }: { active: boolean; reduced: boolean }) {
  const position = useRef<BufferAttribute>(null)
  const time = useRef(0)
  const values = useMemo(() => new Float32Array(300 * 6), [])
  useFrame((_, delta) => {
    if (!active || !position.current) return
    if (!reduced) time.current += Math.min(delta, 0.05)
    for (let i = 0; i < 300; i++) {
      const x = (fraction(i + 123) % 1) * 26 - 13
      const z = (fraction(i + 331) % 1) * 30 - 15
      const y = (((fraction(i + 221) % 1) * 10 - time.current * 6) % 10 + 10) % 10
      const sheltered = x > -6.9 && x < -3.7 && Math.abs(z - trainDemo.trainZ) < 7.5 || x > -2.5 && x < 2.5 && z > -2.9 && z < 0.9
      const height = sheltered ? -10 : y
      values.set([x, height, z, x - 0.03, height - 0.19, z], i * 6)
    }
    position.current.needsUpdate = true
  })
  return <lineSegments visible={active} frustumCulled={false}>
    <bufferGeometry><bufferAttribute ref={position} attach="attributes-position" args={[values, 3]} /></bufferGeometry>
    <lineBasicMaterial color="#d3e4e4" transparent opacity={0.32} depthWrite={false} />
  </lineSegments>
}

function ShopSign() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 160
    const context = canvas.getContext('2d')!
    context.fillStyle = '#ebd7ae'; context.fillRect(0, 0, 768, 160)
    context.fillStyle = '#364f53'; context.textAlign = 'center'
    context.font = 'bold 65px sans-serif'; context.fillText('雨 灯', 384, 76)
    context.font = '22px sans-serif'; context.fillText('R A I N L I G H T   ·   2 4 H', 384, 126)
    const result = new CanvasTexture(canvas); result.colorSpace = SRGBColorSpace
    return result
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={[0, 1.78, 0.946]}><planeGeometry args={[3.6, 0.55]} /><meshBasicMaterial map={texture} /></mesh>
}

function Station() {
  const root = useRef<Group>(null)
  useFrame(() => {
    if (!root.current) return
    root.current.visible = trainDemo.getSnapshot().phase !== 'cruising' && !(trainDemo.getSnapshot().phase === 'returning' && trainDemo.boardingTime > 6)
    root.current.position.z = trainDemo.stationOffset
  })
  return <group ref={root} name="demo-station">
    <Block at={[-0.7, -0.01, 0]} size={[9.4, 0.4, 8.5]} color="#9b9c8a" />
    <mesh position={[0, 0.205, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={(event) => { event.stopPropagation(); trainDemo.moveTo({ x: event.point.x, z: event.point.z }) }} receiveShadow>
      <planeGeometry args={[7.7, 7.7]} /><meshStandardMaterial color="#a7a998" roughness={0.85} />
    </mesh>
    <Block at={[-3.28, 0.24, 0]} size={[1.25, 0.11, 8.2]} color="#c4c3af" />
    <Block at={[-3.75, 0.304, 0]} size={[0.15, 0.025, 8]} color="#d6bb63" />
    {Array.from({ length: 24 }, (_, i) => <Block key={i} at={[-3.74, 0.32, -3.8 + i * 0.32]} size={[0.17, 0.018, 0.055]} color="#e9d48e" />)}
    <group position={[0, 0.21, 0]}><StoreModel simulation={trainDemo.station} /><ShopSign /></group>
    {[-2.5, 3.2].map((x) => <group key={x} position={[x, 0.21, x < 0 ? -2.7 : 3.25]}>
      <Block at={[0, 1.35, 0]} size={[0.06, 2.7, 0.06]} color="#3c5356" />
      <Block at={[0, 2.7, 0]} size={[0.35, 0.09, 0.35]} color="#ffe2a8" glow />
      <pointLight position={[0, 2.5, 0]} intensity={2.4} color="#ffdc9d" distance={5} decay={2} />
    </group>)}
    <Block at={[2.95, 0.55, 1.3]} size={[0.48, 0.7, 0.48]} color="#667573" />
    <Block at={[2.95, 0.94, 1.3]} size={[0.55, 0.1, 0.55]} color="#dacda9" />
    <Block at={[1.25, 0.65, 3.2]} size={[1.8, 0.12, 0.4]} color="#9b8160" />
    {[0.6, 1.9].map((x) => <Block key={x} at={[x, 0.4, 3.2]} size={[0.09, 0.45, 0.3]} color="#475958" />)}
  </group>
}

function Rails() {
  const sleepers = useRef<InstancedMesh>(null)
  useEffect(() => {
    const dummy = new Object3D()
    for (let i = 0; i < 100; i++) {
      dummy.position.set(-5.3, -0.035, i * 1.5 - 75); dummy.updateMatrix()
      sleepers.current?.setMatrixAt(i, dummy.matrix)
    }
    if (sleepers.current) sleepers.current.instanceMatrix.needsUpdate = true
  }, [])
  return <group>
    <Block at={[-5.3, -0.14, 0]} size={[3.3, 0.14, 150]} color="#596061" />
    {[-6.15, -4.45].map((x) => <Block key={x} at={[x, 0, 0]} size={[0.055, 0.1, 150]} color="#a5afb2" />)}
    <instancedMesh ref={sleepers} args={[undefined, undefined, 100]} frustumCulled={false}><boxGeometry args={[2.5, 0.06, 0.15]} /><meshStandardMaterial color="#767165" roughness={0.9} /></instancedMesh>
  </group>
}

function Passenger({ reduced }: { reduced: boolean }) {
  const root = useRef<Group>(null), leftLeg = useRef<Mesh>(null), rightLeg = useRef<Mesh>(null)
  useFrame(() => {
    if (!root.current) return
    const { phase } = trainDemo.getSnapshot()
    let x = trainDemo.station.position.x, z = trainDemo.station.position.z, heading = trainDemo.station.heading
    let walking = trainDemo.station.getSnapshot().moving
    let visible = phase === 'station' || phase === 'returning'
    if (phase === 'arriving') {
      visible = trainDemo.arrivalTime >= 4.2
      x = -4.65 + 1.75 * between(trainDemo.arrivalTime, 4.2, 6.4); z = 2.5; heading = Math.PI / 2; walking = trainDemo.arrivalTime < 6.4
    }
    if (phase === 'returning' && trainDemo.boardingAt !== null) {
      x = -2.9 - 1.75 * between(trainDemo.boardingTime, 0, 1.4); z = 2.5; heading = -Math.PI / 2
      walking = true; visible = trainDemo.boardingTime < 1.5
    }
    root.current.visible = visible; root.current.position.set(x, 0.31, z); root.current.rotation.y = heading
    const stride = walking && !reduced ? Math.sin(trainDemo.elapsed * 12) * 0.45 : 0
    if (leftLeg.current) leftLeg.current.rotation.x = stride
    if (rightLeg.current) rightLeg.current.rotation.x = -stride
  })
  return <group ref={root} name="demo-passenger">
    <mesh position={[0, 0.41, 0]} castShadow><capsuleGeometry args={[0.16, 0.25, 4, 10]} /><meshStandardMaterial color="#dca75d" /></mesh>
    <mesh position={[0, 0.77, 0]} castShadow><sphereGeometry args={[0.15, 12, 8]} /><meshStandardMaterial color="#e8c5a5" /></mesh>
    <mesh position={[0, 0.84, -0.025]}><sphereGeometry args={[0.14, 12, 8]} /><meshStandardMaterial color="#414841" /></mesh>
    <Block at={[0, 0.43, -0.16]} size={[0.24, 0.28, 0.14]} color="#5a6b67" />
    {[-1, 1].map((side) => <mesh key={side} ref={side < 0 ? leftLeg : rightLeg} position={[side * 0.075, 0.15, 0]}><boxGeometry args={[0.1, 0.28, 0.12]} /><meshStandardMaterial color="#374852" /></mesh>)}
  </group>
}

function WindowBarrier() {
  const mesh = useRef<Mesh>(null), material = useRef<MeshBasicMaterial>(null)
  useFrame(() => {
    if (mesh.current) { mesh.current.position.z = trainDemo.trainZ - 0.5; mesh.current.visible = trainDemo.barrierOpacity > 0 }
    if (material.current) material.current.opacity = trainDemo.barrierOpacity
  })
  return <mesh ref={mesh} position={[-3.8, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[16, 5]} /><meshBasicMaterial ref={material} color="#364b4c" transparent depthWrite={false} /></mesh>
}

function World({ reduced, onFade, onReady, onFailure }: { reduced: boolean; onFade: (opacity: number) => void; onReady: () => void; onFailure: () => void }) {
  const { environment } = useSyncExternalStore(trainDemo.subscribe, trainDemo.getSnapshot)
  const palette = PALETTES[environment.daylight]
  const sky = environment.daylight === 'day' && environment.weather !== 'clear' ? (environment.weather === 'rain' ? '#879fa6' : '#b1c2c8') : palette.sky
  return <>
    <Driver reduced={reduced} onFade={onFade} onReady={onReady} onFailure={onFailure} />
    <color attach="background" args={[sky]} />
    <fog attach="fog" args={[sky, 38, 115]} />
    <ambientLight intensity={palette.ambient} color="#dce8e3" />
    <directionalLight position={[8, 16, 9]} intensity={palette.strength} color={palette.light} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.001} />
    <Landscape environment={environment} reduced={reduced} />
    <Rails /><Station /><DemoTrainModel controller={trainDemo} /><Passenger reduced={reduced} /><WindowBarrier />
    <Rain active={environment.weather === 'rain'} reduced={reduced} />
  </>
}

function FrameOutput({ onFrame }: { onFrame: (source: HTMLCanvasElement) => void }) {
  useFrame(({ gl, scene, camera }) => {
    gl.render(scene, camera)
    onFrame(gl.domElement)
  }, 1)
  return null
}

export default function TrainDemoScene(props: { onFade: (opacity: number) => void; onReady: () => void; onFailure: () => void; onFrame: (source: HTMLCanvasElement) => void }) {
  const visible = usePageVisible(), systemReduced = useReducedMotion()
  // Explicit preview opt-in preserves the system preference on the ordinary entry point.
  const reduced = systemReduced && new URLSearchParams(window.location.search).get('motion') !== 'full'
  useEffect(() => { if (!visible) audioEngine.pauseForBackground() }, [visible])
  return <Canvas shadows={{ type: PCFShadowMap }} dpr={[1, 1.5]} frameloop={visible ? 'always' : 'never'} camera={{ position: CABIN_SHOT.eye, fov: CABIN_SHOT.fov, near: 0.04, far: 180 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
    <World {...props} reduced={reduced} />
    <FrameOutput onFrame={props.onFrame} />
  </Canvas>
}
