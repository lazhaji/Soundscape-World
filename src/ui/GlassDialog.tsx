import { useEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import type { GlassFrame } from './LiquidStatus'
import { PlayerGlass } from './PlayerGlass'

export function GlassDialog({ labelId, onClose, children, className = '', frameRef }: { labelId: string; onClose: () => void; children: ReactNode; className?: string; frameRef?: RefObject<GlassFrame> }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const previous = document.activeElement
    dialog.showModal()
    return () => { dialog.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [])
  return <dialog ref={ref} className={`glass glass-dialog ${className}`} aria-labelledby={labelId} onCancel={(event) => { event.preventDefault(); onClose() }} onKeyDown={(event) => {
    if (event.key !== 'Tab') return
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, a[href], [tabindex="0"]'))
      .filter((element) => element.getClientRects().length > 0)
      .filter((element) => !(element instanceof HTMLInputElement && element.type === 'radio' && !element.checked))
    const first = controls[0], last = controls.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    {frameRef && <PlayerGlass frameRef={frameRef} />}
    <button className="close-dialog" aria-label="关闭面板" onClick={onClose}>×</button>
    <div className="dialog-content">
      {children}
    </div>
  </dialog>
}
