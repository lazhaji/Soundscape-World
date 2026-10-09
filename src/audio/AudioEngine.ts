import { fillWhiteNoise } from './noise'

export type AudioStatus = 'idle' | 'starting' | 'playing' | 'stopped' | 'interrupted' | 'error' | 'unsupported'
export interface AudioSnapshot { status: AudioStatus; message: string }

type ContextFactory = () => AudioContext | null

function createBrowserContext(): AudioContext | null {
  const AudioContextConstructor = window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return AudioContextConstructor ? new AudioContextConstructor() : null
}

/** App-owned service. Constructing/subscribing never creates an AudioContext. */
export class AudioEngine {
  private context: AudioContext | null = null
  private source: AudioBufferSourceNode | null = null
  private gain: GainNode | null = null
  private pending: Promise<void> | null = null
  private revision = 0
  private listeners = new Set<() => void>()
  private snapshot: AudioSnapshot = { status: 'idle', message: '尚未启声 · 点击后才会播放' }

  constructor(private readonly contextFactory: ContextFactory = createBrowserContext) {}

  getSnapshot = (): AudioSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private publish(status: AudioStatus, message: string): void {
    this.snapshot = { status, message }
    this.listeners.forEach((listener) => listener())
  }

  private onContextStateChange = (): void => {
    if (this.snapshot.status === 'playing' && this.context?.state !== 'running') {
      this.releaseSource()
      this.publish('interrupted', '浏览器已中断声音，请点击重新启声')
    }
  }

  /** Call directly in a trusted click handler, before any asynchronous work. */
  startFromGesture = (): Promise<void> => {
    if (this.pending) return this.pending
    if (this.snapshot.status === 'playing' && this.context?.state === 'running') return Promise.resolve()
    const revision = ++this.revision
    const operation = this.start(revision)
    this.pending = operation
    void operation.finally(() => {
      if (this.pending === operation) this.pending = null
    })
    return operation
  }

  private async start(revision: number): Promise<void> {
    this.publish('starting', '正在启声…')
    try {
      if (!this.context || this.context.state === 'closed') {
        this.context?.removeEventListener('statechange', this.onContextStateChange)
        this.context = this.contextFactory()
        this.context?.addEventListener('statechange', this.onContextStateChange)
      }
      const context = this.context
      if (!context) {
        this.publish('unsupported', '当前浏览器不支持 Web Audio，请换用支持的浏览器')
        return
      }

      // resume() is invoked synchronously in the original gesture call stack.
      await this.resumeContext(context)
      if (revision !== this.revision) return
      if (context.state !== 'running') throw new Error('Audio context did not resume')

      this.releaseSource()
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
      fillWhiteNoise(buffer.getChannelData(0))
      this.gain = context.createGain()
      this.gain.gain.setValueAtTime(0, context.currentTime)
      this.gain.gain.linearRampToValueAtTime(0.035, context.currentTime + 0.3)
      this.gain.connect(context.destination)
      this.source = context.createBufferSource()
      this.source.buffer = buffer
      this.source.loop = true
      this.source.connect(this.gain)
      this.source.start()
      this.publish('playing', '白噪音试听中 · 本机实时合成')
    } catch {
      if (revision !== this.revision) return
      this.releaseSource()
      this.publish('error', '未能启动声音，请检查浏览器声音权限后重试')
    }
  }

  private resumeContext(context: AudioContext): Promise<void> {
    const resume = context.resume()
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Audio unlock timed out')), 10000)
      void resume.then(() => {
        clearTimeout(timeout)
        resolve()
      }, (error: unknown) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  stop = (): void => {
    ++this.revision
    this.pending = null
    this.releaseSource()
    this.publish('stopped', '试听已停止 · 可再次点击启声')
  }

  private releaseSource(): void {
    if (this.source) {
      try { this.source.stop() } catch { /* Also safe when start() itself failed. */ }
      this.source.disconnect()
      this.source = null
    }
    this.gain?.disconnect()
    this.gain = null
  }

  /** Only the application owner/HMR disposes; React view cleanup just unsubscribes. */
  async dispose(): Promise<void> {
    this.stop()
    const context = this.context
    this.context = null
    context?.removeEventListener('statechange', this.onContextStateChange)
    if (context && context.state !== 'closed') await context.close()
  }
}
