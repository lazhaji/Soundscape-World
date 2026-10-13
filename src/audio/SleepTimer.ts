export type TimerAction = 'music' | 'all'
export interface TimerState { expiresAt: number; action: TimerAction }
/** The runtime owns polling; closing a panel cannot stop or extend the deadline. */
export class SleepTimer {
  state: TimerState | null = null
  constructor(private readonly expire: (action: TimerAction) => void, private readonly now = Date.now) {}
  start(minutes: number, action: TimerAction): void {
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180 || !['music', 'all'].includes(action)) throw new Error('定时需为 1–180 分钟')
    this.state = { expiresAt: this.now() + minutes * 60000, action }
  }
  cancel(): void { this.state = null }
  tick(): boolean {
    if (!this.state || this.now() < this.state.expiresAt) return false
    const { action } = this.state
    this.state = null
    this.expire(action)
    return true
  }
}
