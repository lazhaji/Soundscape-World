import { useEffect, useRef } from 'react'
import type { GlassController, SpringController } from '../vendor/liquid-glass/liquid-glass'

/** Native checkbox owns interaction; the lens only bends an aria-hidden track copy. */
export function LiquidSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const root = useRef<HTMLSpanElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const position = useRef<SpringController | null>(null)

  useEffect(() => {
    const element = root.current, control = input.current
    const refract = element?.querySelector<HTMLElement>('.liquid-switch-refract')
    if (!element || !control || !refract) return
    let disposed = false
    let clear = () => {}
    const preferences = ['(prefers-reduced-motion: reduce)', '(prefers-reduced-transparency: reduce)', '(prefers-contrast: more)', '(forced-colors: active)'].map((query) => matchMedia(query))
    let revision = 0
    const setup = () => {
      const current = ++revision
      clear()
      if (preferences.some((query) => query.matches)) return
      // A failed optional chunk keeps the fully usable CSS/native switch.
      void import('../vendor/liquid-glass/liquid-glass.js').then(({ createGlass, createSpring }) => {
        if (disposed || current !== revision) return
        let glass: GlassController | undefined
        try {
          glass = createGlass(refract, { clip: true, hidden: true, refraction: 8, bezel: 0.85, curvature: 3, chroma: 0.12, specular: 0.65, mapScale: 1 })
          let x = control.checked ? 1 : 0, press = 0
          const render = () => {
            const width = 28 + press * 12, height = 26 + press * 4
            const left = 2 + x * 24 - press * 6, top = 3 - press * 2
            element.style.setProperty('--switch-x', `${left}px`)
            element.style.setProperty('--switch-y', `${top}px`)
            element.style.setProperty('--switch-width', `${width}px`)
            element.style.setProperty('--switch-height', `${height}px`)
            element.style.setProperty('--switch-press', String(press))
            glass?.update({ x: left + 12, y: top + 12, width, height, radius: height / 2, hidden: press < 0.01 })
          }
          const move = createSpring(x, (value) => { x = value; render() })
          const squish = createSpring(0, (value) => { press = value; render() })
          position.current = move
          const down = () => squish.set(1)
          const up = () => squish.set(0)
          const keyDown = (event: KeyboardEvent) => { if (event.key === ' ') down() }
          control.addEventListener('pointerdown', down)
          control.addEventListener('keydown', keyDown)
          control.addEventListener('keyup', up)
          control.addEventListener('blur', up)
          window.addEventListener('pointerup', up)
          window.addEventListener('pointercancel', up)
          element.dataset.enhanced = 'true'
          render()
          clear = () => {
            move.stop(); squish.stop(); glass?.destroy(); position.current = null
            control.removeEventListener('pointerdown', down)
            control.removeEventListener('keydown', keyDown)
            control.removeEventListener('keyup', up)
            control.removeEventListener('blur', up)
            window.removeEventListener('pointerup', up)
            window.removeEventListener('pointercancel', up)
            delete element.dataset.enhanced
            element.removeAttribute('style')
          }
        } catch { glass?.destroy() }
      }).catch(() => { /* Decorative failure leaves the native switch available. */ })
    }
    preferences.forEach((query) => query.addEventListener('change', setup))
    setup()
    return () => { disposed = true; ++revision; clear(); preferences.forEach((query) => query.removeEventListener('change', setup)) }
  }, [])

  useEffect(() => { position.current?.set(checked ? 1 : 0) }, [checked])

  return <label className="quiet-choice">
    <span className="quiet-copy"><strong>暂时不被打扰</strong><small>只留声音，给自己一点空间</small></span>
    <span className="liquid-switch" ref={root} data-checked={checked}>
      <input ref={input} type="checkbox" role="switch" aria-label="暂时不被打扰" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="liquid-switch-track" aria-hidden="true"><span>开</span><span>关</span></span>
      <span className="liquid-switch-refract" aria-hidden="true"><span className="liquid-switch-copy" /></span>
      <span className="liquid-switch-thumb" aria-hidden="true" />
    </span>
  </label>
}
