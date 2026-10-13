import { createDoorSound, createGeneratedAudio, createMusic, createNoise, createRain, createWind, MUSIC_DURATION } from './generatedAudio'
import type { SoundBuffers } from './generatedAudio'
import { SmoothGain, ZONE_MIX } from './mixer'
import type { AudioZone } from './mixer'
import { DEFAULT_SETTINGS, musicPolicy } from '../features/modes'
import type { ModeSettings } from '../features/modes'
import { CATALOG, isEligible, type Track } from './catalog'
import type { TimerAction } from './SleepTimer'

export type AudioStatus = 'idle' | 'starting' | 'playing' | 'paused' | 'background' | 'interrupted' | 'error' | 'unsupported'
export interface AudioSnapshot { status: AudioStatus; message: string; zone: AudioZone; musicVolume: number; rainVolume: number; settings: ModeSettings; musicOff: boolean }
type ContextFactory = () => AudioContext | null
type BufferFactory = (context: AudioContext) => SoundBuffers
interface Graph {
  master: SmoothGain; musicUser: SmoothGain; rainUser: SmoothGain; effects: SmoothGain
  musicZone: SmoothGain; rainZone: SmoothGain; musicMode: SmoothGain; trainZone: SmoothGain; trainMotor: SmoothGain
  music: AudioBufferSourceNode | null; train: AudioBufferSourceNode
  currentWeather: WeatherLayer; weatherLayers: Set<WeatherLayer>
}
interface WeatherLayer { source: AudioBufferSourceNode; fade: SmoothGain }

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
  private track: Track | null = CATALOG[0]!
  private importedBuffer: AudioBuffer | null = null
  private musicEnded: (() => void) | null = null
  private fadeTimeout: ReturnType<typeof setTimeout> | undefined
  private fadeGeneration = 0
  private trainMoving = true
  private weather: 'rain' | 'wind' = 'rain'
  private ambientMix: { rain: number; train: number; rolling: number } | null = null
  private effects = new Set<AudioBufferSourceNode>()
  private listeners = new Set<() => void>()
  private snapshot: AudioSnapshot = { status: 'idle', message: '尚未启声 · 点击后开始聆听', zone: 'outside', musicVolume: 0.55, rainVolume: 0.7, settings: { ...DEFAULT_SETTINGS }, musicOff: false }

  constructor(private readonly contextFactory: ContextFactory = createBrowserContext, private readonly bufferFactory: BufferFactory = createGeneratedAudio) {}
  getSnapshot = (): AudioSnapshot => this.snapshot
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private publish(change: Partial<AudioSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...change }
    this.listeners.forEach((listener) => listener())
  }

  getPlaybackSeconds = (): number => this.offset + (this.graph?.music && this.context ? Math.max(0, this.context.currentTime - this.startedAt) : 0)
  getDiagnostics = () => ({
    contextState: this.context?.state ?? 'absent', musicSources: this.graph?.music ? 1 : 0, rainSources: this.graph ? 1 : 0,
    sourceBuilds: this.sourceBuilds, elapsed: this.getPlaybackSeconds(),
    musicGain: this.graph?.musicZone.value(this.context?.currentTime ?? 0) ?? ZONE_MIX[this.snapshot.zone].music,
    rainGain: this.graph?.rainZone.value(this.context?.currentTime ?? 0) ?? ZONE_MIX[this.snapshot.zone].rain,
    trainSources: this.graph ? 1 : 0,
    trainGain: this.graph?.trainZone.value(this.context?.currentTime ?? 0) ?? ZONE_MIX[this.snapshot.zone].train,
    policyGain: this.graph?.musicMode.value(this.context?.currentTime ?? 0) ?? this.policyLevel(),
    trackId: this.track?.id ?? null, musicOff: this.snapshot.musicOff,
  })

  private policyLevel(): number {
    return this.snapshot.musicOff || !this.track || !isEligible(this.track, this.snapshot.settings.mode) ? 0 : musicPolicy(this.snapshot.settings, this.track.eligibleModes).level
  }
  setOnMusicEnded(callback: (() => void) | null): void { this.musicEnded = callback }
  selectTrack(track: Track | null, buffer: AudioBuffer | null = null): void {
    if (track && !isEligible(track, this.snapshot.settings.mode)) throw new Error('该曲目不适用于当前状态')
    if (track?.source === 'imported' && !buffer) throw new Error('本地音频未能读取')
    this.track = track; this.importedBuffer = buffer
    this.offset = 0
    if (this.graph && this.context) {
      this.stopMusic()
      this.startedAt = this.context.currentTime
      if (track) {
        const node = this.context.createBufferSource()
        try {
          node.buffer = this.musicBuffer(this.context)
          node.loop = track.source === 'generated'
          node.loopStart = track.generator === 'white' || track.generator === 'pink' ? 0.12 : 0
          node.connect(this.graph.musicZone.node)
          node.onended = () => {
            if (this.graph?.music !== node) return
            this.offset = track.duration; this.graph.music = null; node.disconnect(); node.onended = null
            this.musicEnded?.()
          }
          node.start(this.context.currentTime, node.loopStart)
          this.graph.music = node
        } catch (error) { node.disconnect(); throw error }
      }
      this.graph.musicMode.set(0, this.context.currentTime, 0)
      this.graph.musicMode.set(this.policyLevel(), this.context.currentTime, 0.12)
    }
    this.publish({})
  }
  private musicBuffer(context: AudioContext, fallback?: AudioBuffer): AudioBuffer {
    if (this.importedBuffer) return this.importedBuffer
    if (this.track?.generator === 'white' || this.track?.generator === 'pink') return createNoise(context, this.track.generator)
    return fallback ?? createMusic(context)
  }
  private stopMusic(): void {
    const source = this.graph?.music
    if (!source) return
    source.onended = null
    try { source.stop() } catch { /* Already ended. */ }
    source.disconnect(); source.buffer = null; this.graph!.music = null
  }
  enableMusic = (): void => {
    this.publish({ musicOff: false })
    if (this.graph && this.context) this.graph.musicMode.set(this.policyLevel(), this.context.currentTime, 0.3)
  }
  finishTimer = (action: TimerAction): void => {
    if (action === 'music') {
      this.publish({ musicOff: true, message: '定时已结束 · 音乐关闭，环境声保留' })
      if (this.graph && this.context) this.graph.musicMode.set(0, this.context.currentTime, 1.5)
      return
    }
    this.cancelFade()
    const generation = this.fadeGeneration
    if (!this.graph || this.context?.state !== 'running' || this.snapshot.status !== 'playing') { this.pause(); return }
    this.graph.master.set(0, this.context.currentTime, 1.5)
    this.publish({ message: '定时已结束 · 全部声音正在淡出' })
    this.fadeTimeout = setTimeout(() => { if (generation === this.fadeGeneration) this.pause() }, 1550)
  }
  private cancelFade(): void { clearTimeout(this.fadeTimeout); this.fadeTimeout = undefined; this.fadeGeneration++ }

  setWorldZone = (zone: AudioZone): void => {
    if (zone === this.snapshot.zone) return
    this.publish({ zone })
    if (!this.graph || !this.context) return
    const mix = ZONE_MIX[zone]
    this.graph.musicZone.set(mix.music, this.context.currentTime)
    this.graph.rainZone.set(mix.rain, this.context.currentTime)
    this.graph.trainZone.set(mix.train, this.context.currentTime)
  }

  setModeSettings = (settings: ModeSettings): void => {
    this.publish({ settings: { ...settings } })
    if (this.graph && this.context) this.graph.musicMode.set(this.policyLevel(), this.context.currentTime)
  }

  setTrainMoving = (moving: boolean): void => {
    if (this.trainMoving === moving) return
    this.trainMoving = moving
    if (this.graph && this.context) this.graph.trainMotor.set(moving ? 0.5 : 0.08, this.context.currentTime, 1.6)
  }

  setWeather = (weather: 'rain' | 'wind'): void => {
    if (weather === this.weather) return
    this.weather = weather
    if (!this.graph || !this.context) return
    const graph = this.graph
    const now = this.context.currentTime
    const fadeDuration = 0.5
    const previous = graph.currentWeather
    const fadeNode = this.context.createGain()
    const fade = new SmoothGain(fadeNode, 0, now)
    fadeNode.connect(graph.rainZone.node)
    const next = this.context.createBufferSource()
    next.buffer = weather === 'wind' ? createWind(this.context) : createRain(this.context)
    next.loop = true; next.loopStart = 0.12
    next.connect(fadeNode)
    const layer = { source: next, fade }
    graph.weatherLayers.add(layer)
    next.onended = () => {
      next.onended = null
      next.disconnect()
      fadeNode.disconnect()
      graph.weatherLayers.delete(layer)
    }
    next.start(now, 0.12)
    previous.fade.set(0, now, fadeDuration)
    fade.set(1, now, fadeDuration)
    previous.source.stop(now + fadeDuration + 0.05)
    graph.currentWeather = layer
  }

  /** Visual scenes may supply continuous distance/motion levels without changing user volume. */
  setAmbientMix = (mix: { rain: number; train: number; rolling: number }): void => {
    if (![mix.rain, mix.train, mix.rolling].every(Number.isFinite)) return
    this.ambientMix = { rain: Math.max(0, Math.min(1, mix.rain)), train: Math.max(0, Math.min(1, mix.train)), rolling: Math.max(0, Math.min(1, mix.rolling)) }
    this.applyAmbientMix()
  }
  private applyAmbientMix() {
    if (!this.graph || !this.context || !this.ambientMix) return
    this.graph.rainZone.set(this.ambientMix.rain, this.context.currentTime, 0.15)
    this.graph.trainZone.set(this.ambientMix.train, this.context.currentTime, 0.15)
    this.graph.trainMotor.set(0.08 + 0.42 * this.ambientMix.rolling, this.context.currentTime, 0.15)
  }
  clearAmbientMix = (): void => {
    this.ambientMix = null
    if (!this.graph || !this.context) return
    const mix = ZONE_MIX[this.snapshot.zone]
    this.graph.rainZone.set(mix.rain, this.context.currentTime)
    this.graph.trainZone.set(mix.train, this.context.currentTime)
    this.graph.trainMotor.set(this.trainMoving ? 0.5 : 0.08, this.context.currentTime)
  }
  playDoorEffect = (): void => {
    if (!this.graph || !this.context || this.context.state !== 'running' || this.snapshot.status !== 'playing') return
    const source = this.context.createBufferSource()
    source.buffer = createDoorSound(this.context)
    source.connect(this.graph.effects.node)
    this.effects.add(source)
    source.onended = () => { source.disconnect(); this.effects.delete(source) }
    source.start()
  }
  private stopEffects() {
    this.effects.forEach((source) => { source.onended = null; try { source.stop() } catch { /* Already ended. */ }; source.disconnect() })
    this.effects.clear()
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
    if (this.fadeTimeout !== undefined && this.graph && this.context) this.graph.master.set(0.7, this.context.currentTime, 0.3)
    this.cancelFade()
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
      const musicMode = gain(this.policyLevel()), trainZone = gain(mix.train), trainMotor = gain(this.trainMoving ? 0.5 : 0.08)
      musicZone.node.connect(musicMode.node); musicMode.node.connect(musicUser.node); musicUser.node.connect(master.node)
      rainZone.node.connect(rainUser.node); rainUser.node.connect(master.node)
      trainZone.node.connect(trainMotor.node); trainMotor.node.connect(rainUser.node)
      effects.node.connect(rainUser.node); master.node.connect(context.destination)
      const source = (buffer: AudioBuffer, target: SmoothGain) => {
        const node = context.createBufferSource(); sources.push(node); nodes.push(node)
        node.buffer = buffer; node.loop = true; node.connect(target.node)
        return node
      }
      const music = this.track ? source(this.musicBuffer(context, buffers.music), musicZone) : null, weatherFade = gain(1), rain = source(this.weather === 'wind' ? createWind(context) : buffers.rain, weatherFade), train = source(buffers.train, trainZone)
      weatherFade.node.connect(rainZone.node)
      rain.loopStart = 0.12
      const now = context.currentTime
      if (music) {
        music.loop = this.track?.source === 'generated'
        music.loopStart = this.track?.generator === 'white' || this.track?.generator === 'pink' ? 0.12 : 0
        music.onended = () => {
          if (this.graph?.music !== music) return
          this.offset = this.track?.duration ?? 0; this.graph.music = null; music.disconnect(); music.onended = null; this.musicEnded?.()
        }
        music.start(now, Math.max(music.loopStart, this.offset % (this.track?.duration ?? MUSIC_DURATION)))
      }
      rain.start(now, 0.12)
      train.start(now)
      this.startedAt = now
      const currentWeather = { source: rain, fade: weatherFade }
      this.graph = { master, musicUser, rainUser, effects, musicZone, rainZone, musicMode, trainZone, trainMotor, music, train, currentWeather, weatherLayers: new Set([currentWeather]) }
      this.applyAmbientMix()
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
    this.cancelFade()
    this.stopEffects()
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
    this.stopEffects()
    if (!this.graph) return
    this.offset = this.getPlaybackSeconds()
    const graph = this.graph
    this.stopMusic()
    try { graph.train.stop() } catch { /* Already stopped. */ }; graph.train.disconnect()
    for (const { source, fade } of graph.weatherLayers) { try { source.stop() } catch { /* Already stopped. */ }; source.disconnect(); fade.node.disconnect() }
    for (const gain of [graph.master, graph.musicUser, graph.rainUser, graph.effects, graph.musicZone, graph.rainZone, graph.musicMode, graph.trainZone, graph.trainMotor]) gain.node.disconnect()
    this.graph = null
  }

  async dispose(): Promise<void> {
    this.pause()
    this.releaseGraph()
    this.importedBuffer = null; this.musicEnded = null
    const context = this.context
    this.context = null
    context?.removeEventListener('statechange', this.onContextStateChange)
    if (context && context.state !== 'closed') await context.close()
  }
}
