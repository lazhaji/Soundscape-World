import { useEffect, useRef, useState, type RefObject } from 'react'
import { STATUSES, type StatusChoice } from '../features/status'
import { createGlassRenderer } from '../vendor/liquid-glass/glass-webgl.js'
import { createSpring } from '../vendor/liquid-glass/liquid-glass.js'
import { HOLD_MS, StatusGesture } from './StatusGesture'
import { StatusSymbol } from './StatusSymbol'
import './liquid-status.css'

export type GlassFrame = ((source: HTMLCanvasElement) => void) | null
const choices = Object.keys(STATUSES) as StatusChoice[]

export function LiquidStatus({ initial, frameRef, onSelect, onConfirm }: { initial: StatusChoice; frameRef: RefObject<GlassFrame>; onSelect: (choice: StatusChoice) => void; onConfirm: (choice: StatusChoice) => void }) {
  const anchor = useRef<HTMLDivElement>(null), surface = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null)
  const [machine] = useState(() => new StatusGesture(initial))
  const [view, setView] = useState({ phase: machine.phase, choice: machine.choice })
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const keyboardOpen = useRef(false)

  useEffect(() => {
    const host = anchor.current!, body = surface.current!, output = canvas.current!
    const trigger = body.querySelector<HTMLButtonElement>('.status-trigger')!
    const source = document.createElement('canvas'), context = source.getContext('2d', { alpha: false })!
    let renderer: ReturnType<typeof createGlassRenderer>
    try { renderer = createGlassRenderer(output, source, { pixelRatio: 1 }) }
    catch { const failure = requestAnimationFrame(() => setFailed(true)); return () => cancelAnimationFrame(failure) }
    renderer.setLenses([{ width: 260, height: 88, radius: 32, refraction: 14, bezel: 0.8, curvature: 3, chroma: 0.12, specular: 0.6, specularWidth: 1.5 }])
    let expand = 0, press = 0, drag = 0, velocity = 0, timer = 0, keyboard = false, disposed = false
    let pressedOption: string | undefined
    let rect = { x: 0, y: 0, width: 260, height: 88, radius: 32 }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const drawShape = () => {
      const at = host.getBoundingClientRect(), base = host.clientWidth
      const stretch = reduced.matches ? 0 : Math.min(12, Math.abs(velocity) * 0.012)
      const width = base + (reduced.matches ? 0 : press * 10 + stretch)
      const maxHeight = Math.min(424, innerHeight - (innerHeight - at.bottom) - 16)
      const height = 88 + (maxHeight - 88) * Math.max(0, expand) - (reduced.matches ? 0 : press * 4 + stretch * 0.2)
      const radius = 32 + Math.min(1, Math.max(0, expand)) * 4
      const x = -drag - (width - base) / 2
      Object.assign(body.style, { width: `${width}px`, height: `${height}px`, borderRadius: `${radius}px`, transform: `translateX(${x}px)` })
      body.style.setProperty('--expand', String(Math.min(1, Math.max(0, expand))))
      rect = { x: at.left + x, y: at.bottom - height, width, height, radius }
    }
    const expansion = createSpring(0, (value) => { expand = value; drawShape() })
    const pressing = createSpring(0, (value) => { press = value; drawShape() })
    const dragging = createSpring(0, (value, speed) => { drag = value; velocity = speed; drawShape() })
    const publish = () => {
      setView((old) => old.phase === machine.phase && old.choice === machine.choice ? old : { phase: machine.phase, choice: machine.choice })
      expansion.set(machine.phase === 'Expanded' ? 1 : 0)
      pressing.set(machine.phase === 'Pressing' || machine.phase === 'Dragging' ? 1 : 0)
      dragging.set(machine.drag, { immediate: machine.phase === 'Dragging' })
      if (machine.phase !== 'Pressing') clearTimeout(timer)
    }
    const cancel = () => { clearTimeout(timer); keyboard = false; pressedOption = undefined; machine.cancel(); publish() }
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return
      keyboardOpen.current = false
      pressedOption = (event.target as Element).closest<HTMLElement>('[data-choice]')?.dataset.choice
      if (event.target !== trigger && !trigger.contains(event.target as Node)) return
      if (!machine.begin(event.pointerId, event.clientX, event.clientY)) return
      event.preventDefault(); trigger.focus({ preventScroll: true }); trigger.setPointerCapture(event.pointerId)
      publish()
      timer = window.setTimeout(() => { machine.hold(); publish() }, HOLD_MS)
    }
    const move = (event: PointerEvent) => {
      machine.move(event.pointerId, event.clientX, event.clientY, host.clientWidth); publish()
    }
    const up = (event: PointerEvent) => {
      clearTimeout(timer)
      const confirmed = machine.release(event.pointerId, host.clientWidth)
      publish()
      if (trigger.hasPointerCapture(event.pointerId)) trigger.releasePointerCapture(event.pointerId)
      if (confirmed) onConfirm(machine.choice)
    }
    const lost = () => { if (machine.phase === 'Pressing' || machine.phase === 'Dragging') cancel() }
    const outside = (event: PointerEvent) => { if (!body.contains(event.target as Node)) cancel() }
    const hidden = () => { if (document.hidden) cancel() }
    const resized = () => { cancel(); drawShape() }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); cancel(); trigger.focus(); return }
      if (machine.phase === 'Expanded' && ['ArrowDown', 'ArrowUp', 'Tab', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
        const options = [...body.querySelectorAll<HTMLButtonElement>('[data-choice]')]
        const at = options.indexOf(document.activeElement as HTMLButtonElement)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 6 : (at + (event.key === 'ArrowUp' || event.shiftKey ? 6 : 1)) % 7
        options[next]?.focus(); return
      }
      if (event.target !== trigger || event.repeat) return
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        keyboardOpen.current = true
        if (machine.begin(-1, 0, 0)) { keyboard = true; publish(); timer = window.setTimeout(() => { machine.hold(); publish() }, HOLD_MS) }
      }
      if (event.key === 'ArrowLeft' && machine.phase === 'Selected') {
        event.preventDefault(); keyboard = true; machine.begin(-2, host.clientWidth, 0); publish()
        timer = window.setTimeout(() => { machine.move(-2, host.clientWidth * 0.58, 0, host.clientWidth); publish() }, HOLD_MS)
      }
    }
    const keyup = (event: KeyboardEvent) => {
      if (!keyboard || ![' ', 'Enter', 'ArrowLeft'].includes(event.key)) return
      event.preventDefault(); clearTimeout(timer); keyboard = false
      const confirmed = machine.release(event.key === 'ArrowLeft' ? -2 : -1, host.clientWidth); publish()
      if (confirmed) onConfirm(machine.choice)
    }
    const click = (event: MouseEvent) => {
      const option = (event.target as Element).closest<HTMLButtonElement>('[data-choice]')
      // Touch browsers can retarget the long-press release click to the newly revealed row.
      if (option && (event.detail === 0 || option.dataset.choice === pressedOption)) { machine.select(option.dataset.choice as StatusChoice); onSelect(machine.choice); publish(); trigger.focus({ preventScroll: true }) }
      // Assistive activation can open the list; it can never confirm a journey.
      else if (event.detail === 0 && event.target === trigger && machine.phase !== 'Expanded') { keyboardOpen.current = true; machine.expand(); publish() }
      pressedOption = undefined
    }
    const lostContext = (event: Event) => { event.preventDefault(); frameRef.current = null; cancel(); setFailed(true) }
    frameRef.current = (scene) => {
      if (disposed || document.hidden) return
      const width = Math.max(1, Math.round(rect.width)), height = Math.max(1, Math.round(rect.height))
      if (source.width !== width) source.width = width
      if (source.height !== height) source.height = height
      const scaleX = scene.width / scene.clientWidth, scaleY = scene.height / scene.clientHeight
      const amount = Math.min(1, Math.max(0, expand))
      // Upstream's WebGL shader omits the panel's 2px frost; blur the padded source before refraction.
      context.filter = `blur(${2 * amount}px)`
      // Called synchronously after Three renders: no stale/cleared drawing buffer, no preserveDrawingBuffer.
      context.drawImage(scene, (rect.x - 8) * scaleX, (rect.y - 8) * scaleY, (rect.width + 16) * scaleX, (rect.height + 16) * scaleY, -8, -8, width + 16, height + 16)
      renderer.updateLens(0, { x: 0, y: 0, width: rect.width, height: rect.height, radius: rect.radius, refraction: 14 + 10 * amount, bezel: 0.8 - amount * 0.5, curvature: 3 + amount, chroma: 0.12 - amount * 0.02, specular: 0.6 - amount * 0.1, specularWidth: 1.5 + amount * 0.5 })
      renderer.render()
      body.dataset.optics = 'webgl'
    }
    body.addEventListener('pointerdown', down); body.addEventListener('pointermove', move); body.addEventListener('pointerup', up)
    body.addEventListener('pointercancel', cancel); body.addEventListener('lostpointercapture', lost)
    document.addEventListener('keydown', keydown); document.addEventListener('keyup', keyup); body.addEventListener('click', click)
    body.addEventListener('contextmenu', preventMenu)
    output.addEventListener('webglcontextlost', lostContext)
    document.addEventListener('pointerdown', outside); document.addEventListener('visibilitychange', hidden)
    window.addEventListener('blur', cancel); window.addEventListener('resize', resized)
    const resize = new ResizeObserver(drawShape); resize.observe(host)
    drawShape()
    return () => {
      disposed = true; frameRef.current = null; clearTimeout(timer); expansion.stop(); pressing.stop(); dragging.stop(); resize.disconnect(); renderer.destroy()
      // This canvas owns a separate small compositor context; release it on every unmount.
      queueMicrotask(() => { if (!output.isConnected) output.getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext() })
      body.removeEventListener('pointerdown', down); body.removeEventListener('pointermove', move); body.removeEventListener('pointerup', up)
      body.removeEventListener('pointercancel', cancel); body.removeEventListener('lostpointercapture', lost)
      document.removeEventListener('keydown', keydown); document.removeEventListener('keyup', keyup); body.removeEventListener('click', click)
      body.removeEventListener('contextmenu', preventMenu); output.removeEventListener('webglcontextlost', lostContext)
      document.removeEventListener('pointerdown', outside); document.removeEventListener('visibilitychange', hidden)
      window.removeEventListener('blur', cancel); window.removeEventListener('resize', resized)
    }
  }, [attempt, frameRef, machine, onSelect, onConfirm])

  useEffect(() => {
    if (view.phase === 'Expanded' && keyboardOpen.current) surface.current?.querySelector<HTMLButtonElement>(`[data-choice="${view.choice}"]`)?.focus({ preventScroll: true })
  }, [view.phase, view.choice])

  return <div ref={anchor} className="status-anchor">
    <div ref={surface} className="status-surface" data-state={view.phase}>
      <canvas key={attempt} ref={canvas} className="status-glass" aria-hidden="true" />
      <div className="status-tint" aria-hidden="true" />
      <button className="status-trigger" aria-label={`${STATUSES[view.choice]}，长按选择状态；选择后向左滑动确认`} aria-expanded={view.phase === 'Expanded'} aria-controls="status-options" aria-describedby="status-help" tabIndex={view.phase === 'Expanded' ? -1 : 0}>
        <StatusSymbol choice={view.choice} /><span>{STATUSES[view.choice]}</span>
      </button>
      <div id="status-options" role="group" aria-label="状态" className="status-options" hidden={view.phase !== 'Expanded'}>
        {choices.map((choice) => <button key={choice} data-choice={choice} aria-pressed={view.choice === choice}><StatusSymbol choice={choice} /><span>{STATUSES[choice]}</span></button>)}
      </div>
    </div>
    <span id="status-help" className="sr-only">长按空格或回车展开，Tab 选择状态。选好后按住左方向键再松开确认；Escape 取消。</span>
    <span className="sr-only" role="status">{view.phase === 'Selected' ? `已选择${STATUSES[view.choice]}，向左滑动确认` : ''}</span>
    {failed && <div className="status-error" role="alert">玻璃渲染未能开启<button onClick={() => { setFailed(false); setAttempt((n) => n + 1) }}>重试</button></div>}
  </div>
}

function preventMenu(event: Event) { event.preventDefault() }
