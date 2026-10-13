import type { StatusChoice } from '../features/status'

export const HOLD_MS = 600
export type GesturePhase = 'Idle' | 'Pressing' | 'Expanded' | 'Selected' | 'Dragging' | 'Confirmed'

/** Pointer-independent rules, including release-to-confirm and interrupted gestures. */
export class StatusGesture {
  phase: GesturePhase = 'Idle'
  drag = 0
  private origin: 'Idle' | 'Selected' = 'Idle'
  private pointer: { id: number; x: number; y: number } | null = null
  constructor(public choice: StatusChoice) {}

  begin(id: number, x: number, y: number) {
    if (this.pointer || (this.phase !== 'Idle' && this.phase !== 'Selected')) return false
    this.origin = this.phase
    this.pointer = { id, x, y }
    this.phase = 'Pressing'
    return true
  }
  hold() {
    if (this.phase === 'Pressing' && this.pointer) { this.phase = 'Expanded'; this.drag = 0 }
  }
  move(id: number, x: number, y: number, width: number) {
    if (this.pointer?.id !== id || this.phase === 'Expanded') return
    const dx = x - this.pointer.x, dy = y - this.pointer.y
    if (Math.abs(dy) > 44 || dx > 28) { this.cancel(); return }
    if (this.origin === 'Selected' && dx < -8) this.phase = 'Dragging'
    else if (this.origin === 'Idle' && Math.abs(dx) > 10) { this.cancel(); return }
    if (this.phase === 'Dragging') this.drag = Math.min(width * 0.52, Math.max(0, -dx))
  }
  release(id: number, width: number) {
    if (this.pointer?.id !== id) return false
    const confirmed = this.phase === 'Dragging' && this.drag >= width * 0.4
    this.pointer = null
    if (confirmed) this.phase = 'Confirmed'
    else if (this.phase !== 'Expanded') { this.phase = this.origin; this.drag = 0 }
    return confirmed
  }
  select(choice: StatusChoice) {
    if (this.phase !== 'Expanded') return
    this.choice = choice; this.phase = 'Selected'; this.origin = 'Selected'; this.pointer = null; this.drag = 0
  }
  cancel() {
    if (this.phase === 'Confirmed') return
    this.pointer = null; this.phase = this.origin; this.drag = 0
  }
  expand() {
    if (this.phase !== 'Idle' && this.phase !== 'Selected') return
    this.origin = this.phase; this.phase = 'Expanded'
  }
}
