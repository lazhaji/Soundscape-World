import { createGeneratedAudio, MUSIC_DURATION } from './generatedAudio'
import type { SoundBuffers } from './generatedAudio'
import { SmoothGain, ZONE_MIX } from './mixer'
import type { WorldZone } from '../world/zones'

export type AudioStatus = 'idle' | 'starting' | 'playing' | 'paused' | 'background' | 'interrupted' | 'error' | 'unsupported'
export interface AudioSnapshot { status: AudioStatus; message: string; zone: WorldZone; musicVolume: number; rainVolume: number }
type ContextFactory = () => AudioContext | null
type BufferFactory = (context: AudioContext) => SoundBuffers
interface Graph {
  master: SmoothGain; musicUser: SmoothGain; rainUser: SmoothGain; effects: SmoothGain
  musicZone: SmoothGain; rainZone: SmoothGain; music: AudioBufferSourceNode; rain: AudioBufferSourceNode
}

function createBrowserContext(): AudioContext | null {
  const Constructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return Constructor ? new Constructor() : null
}

/** Application-owned transport. A zone transition never starts/stops/seeks a source. */
export class AudioEngine {
  private context: AudioContext | null = null
  private graph: Graph | null = null
  private pending: Promise<void> | null = null
  private revision = 0
  private offset = 0
  private startedAt = 0
  private sourceBuilds = 0
  private listeners = new Set<() => void>()
  private snapshot: AudioSnapshot = { status: 'idle', message: '尚未启声 · 点击后开始聆听', zone: 'outside', musicVolume: 0.55, rainVolume: 0.7 }

  constructor(private readonly contextFactory: ContextFactory = createBrowserContext, private readonly bufferFactory: BufferFactory = createGeneratedAudio) {}
  getSnapshot = (): AudioSnapshot => this.snapshot
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private publish(change: Partial<AudioSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...change }
    this.listeners.forEach((listener) => listener())
  }

  getPlaybackSeconds = (): number => this.offset + (this.graph && this.context ? Math.max(0, this.context.currentTime - this.startedAt) : 0)
  getDiagnostics = () => ({
    contextState: this.context?.state ?? 'absent', musicSources: this.graph ? 1 : 0, rainSources: this.graph ? 1 : 0,
    sourceBuilds: this.sourceBuilds, elapsed: this.getPlaybackSeconds(),
    musicGain: this.graph?.musicZone.value(this.context?.currentTime ?? 0) ?? ZONE_MIX[this.snapshot.zone].music,
    rainGain: this.graph?.rainZone.value(this.context?.currentTime ?? 0) ?? ZONE_MIX[this.snapshot.zone].rain,
  })

  setWorldZone = (zone: WorldZone): void => {
    if (zone === this.snapshot.zone) return
    this.publish({ zone })
    if (!this.graph || !this.context) return
    const mix = ZONE_MIX[zone]
    this.graph.musicZone.set(mix.music, this.context.currentTime)
    this.graph.rainZone.set(mix.rain, this.context.currentTime)
  }

  setVolume = (channel: 'music' | 'rain', value: number): void => {
    if (!Number.isFinite(value)) return
    const volume = Math.max(0, Math.min(1, value))
    this.publish(channel === 'music' ? { musicVolume: volume } : { rainVolume: volume })
    const gain = channel === 'music' ? this.graph?.musicUser : this.graph?.rainUser
    if (gain && this.context) gain.set(volume, this.context.currentTime, 0.08)
  }

  private onContextStateChange = (): void => {
    if (this.snapshot.status === 'playing' && this.context?.state !== 'running') {
      this.graph?.master.set(0, this.context?.currentTime ?? 0, 0)
      this.publish({ status: 'interrupted', message: '声音被浏览器中断 · 点击继续' })
    }
  }

  startFromGesture = (): Promise<void> => {
    if (this.pending) return this.pending
    if (this.snapshot.status === 'playing' && this.context?.state === 'running') return Promise.resolve()
    const revision = ++this.revision
    const operation = this.start(revision)
    this.pending = operation
    void operation.finally(() => { if (this.pending === operation) this.pending = null })
    return operation
  }

  private async start(revision: number): Promise<void> {
    this.publish({ status: 'starting', message: '正在启声…' })
    try {
      if (!this.context || this.context.state === 'closed') {
        this.releaseGraph()
        this.context?.removeEventListener('statechange', this.onContextStateChange)
        this.context = this.contextFactory()
        this.context?.addEventListener('statechange', this.onContextStateChange)
      }
      const context = this.context
      if (!context) { this.publish({ status: 'unsupported', message: '此浏览器不支持 Web Audio，仍可静音探索' }); return }
      // Invoke resume in the trusted click stack, before generating buffers/awaiting.
      await this.withTimeout(context.resume())
      if (revision !== this.revision) return
      if (context.state !== 'running') throw new Error('Audio did not resume')
      if (!this.graph) this.createGraph(context)
      this.graph!.master.set(0.7, context.currentTime, 0.3)
      this.publish({ status: 'playing', message: '正在聆听 · 声音随你的位置变化' })
    } catch {
      if (revision !== this.revision) return
      this.graph?.master.set(0, this.context?.currentTime ?? 0, 0)
      this.publish({ status: 'error', message: '启声未成功，请检查声音权限后重试' })
    }
  }

  private createGraph(context: AudioContext): void {
    const buffers = this.bufferFactory(context)
    const nodes: AudioNode[] = []
    const sources: AudioBufferSourceNode[] = []
    const gain = (value: number) => {
      const node = context.createGain(); nodes.push(node)
      return new SmoothGain(node, value, context.currentTime)
    }
    try {
      const mix = ZONE_MIX[this.snapshot.zone]
      const master = gain(0), musicUser = gain(this.snapshot.musicVolume), rainUser = gain(this.snapshot.rainVolume)
      const effects = gain(0.5), musicZone = gain(mix.music), rainZone = gain(mix.rain)
      musicZone.node.connect(musicUser.node); musicUser.node.connect(master.node)
      rainZone.node.connect(rainUser.node); rainUser.node.connect(master.node)
      effects.node.connect(master.node); master.node.connect(context.destination)
      const source = (buffer: AudioBuffer, target: SmoothGain) => {
        const node = context.createBufferSource(); sources.push(node); nodes.push(node)
        node.buffer = buffer; node.loop = true; node.connect(target.node)
        return node
      }
      const music = source(buffers.music, musicZone), rain = source(buffers.rain, rainZone)
      rain.loopStart = 0.12
      const now = context.currentTime
      music.start(now, this.offset % MUSIC_DURATION)
      rain.start(now, 0.12)
      this.startedAt = now
      this.graph = { master, musicUser, rainUser, effects, musicZone, rainZone, music, rain }
      this.sourceBuilds += 1
    } catch (error) {
      sources.forEach((source) => { try { source.stop() } catch { /* Not started yet. */ } })
      nodes.forEach((node) => node.disconnect())
      throw error
    }
  }

  private withTimeout(operation: Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Audio operation timed out')), 10000)
      void operation.then(() => { clearTimeout(timeout); resolve() }, (error: unknown) => { clearTimeout(timeout); reject(error) })
    })
  }

  pause = (background = false): void => {
    ++this.revision
    this.pending = null
    const revision = this.revision
    this.publish({ status: background ? 'background' : 'paused', message: background ? '离开页面时已暂停 · 点击继续聆听' : '已暂停 · 播放进度已保留' })
    const context = this.context
    if (!context || context.state === 'closed') return
    this.graph?.master.set(0, context.currentTime, 0)
    void context.suspend().catch(() => {
      if (revision === this.revision) this.publish({ status: 'error', message: '浏览器未能暂停音频，已静音；请重新启声' })
    })
  }

  pauseForBackground = (): void => {
    if (this.snapshot.status === 'playing' || this.snapshot.status === 'starting') this.pause(true)
  }

  private releaseGraph(): void {
    if (!this.graph) return
    this.offset = this.getPlaybackSeconds()
    const { music, rain, ...gains } = this.graph
    for (const source of [music, rain]) { try { source.stop() } catch { /* Already stopped. */ }; source.disconnect() }
    Object.values(gains).forEach((gain) => gain.node.disconnect())
    this.graph = null
  }

  async dispose(): Promise<void> {
    this.pause()
    this.releaseGraph()
    const context = this.context
    this.context = null
    context?.removeEventListener('statechange', this.onContextStateChange)
    if (context && context.state !== 'closed') await context.close()
  }
}
