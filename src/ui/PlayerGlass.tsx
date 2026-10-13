import { useEffect, useRef, type RefObject } from 'react'
import { createGlassRenderer } from '../vendor/liquid-glass/glass-webgl.js'
import type { GlassFrame } from './LiquidStatus'

/** The existing scene supplies the just-rendered frame, as it does for LiquidStatus. */
export function PlayerGlass({ frameRef }: { frameRef: RefObject<GlassFrame> }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const output = canvas.current!, dialog = output.closest('dialog')!
    const source = document.createElement('canvas'), context = source.getContext('2d', { alpha: false })!
    let renderer: ReturnType<typeof createGlassRenderer>
    try { renderer = createGlassRenderer(output, source, { pixelRatio: 1 }) }
    catch { dialog.dataset.optics = 'fallback'; return }
    renderer.setLenses([{ x: 0, y: 0, width: 400, height: 500, radius: 32, refraction: 24, bezel: 0.3, curvature: 4, chroma: 0.1, specular: 0.5 }])
    const draw: GlassFrame = (scene) => {
      if (document.hidden) return
      const rect = dialog.getBoundingClientRect(), x = scene.width / scene.clientWidth, y = scene.height / scene.clientHeight
      const width = Math.max(1, Math.round(rect.width)), height = Math.max(1, Math.round(rect.height))
      if (source.width !== width) source.width = width
      if (source.height !== height) source.height = height
      context.filter = 'blur(2px)'
      context.drawImage(scene, (rect.left - 8) * x, (rect.top - 8) * y, (rect.width + 16) * x, (rect.height + 16) * y, -8, -8, width + 16, height + 16)
      renderer.updateLens(0, { width, height }); renderer.render(); dialog.dataset.optics = 'webgl'
    }
    const lost = (event: Event) => { event.preventDefault(); frameRef.current = null; dialog.dataset.optics = 'fallback' }
    frameRef.current = draw
    output.addEventListener('webglcontextlost', lost)
    return () => {
      if (frameRef.current === draw) frameRef.current = null
      output.removeEventListener('webglcontextlost', lost); renderer.destroy()
      queueMicrotask(() => { if (!output.isConnected) output.getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext() })
    }
  }, [frameRef])
  return <canvas ref={canvas} className="player-glass" aria-hidden="true" />
}
