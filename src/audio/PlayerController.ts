import type { AudioEngine } from './AudioEngine'
import { CATALOG, isEligible, type Track } from './catalog'
import { decodeAudio, importedTrack, validateCapacity, validateFile } from './importAudio'
import { likedTracks, recommendTrack, type Feedback } from './recommendation'
import { SleepTimer, type TimerAction, type TimerState } from './SleepTimer'
import { libraryRepository } from '../db/library'
import type { ModeSettings, Mood } from '../features/modes'

interface PlayerSnapshot {
  catalog: Track[]; current: Track | null; events: Feedback[]; loading: boolean
  busy: boolean; ready: boolean; storageError: boolean; message: string; timer: TimerState | null
}
export class PlayerController {
  private snapshot: PlayerSnapshot = { catalog: [...CATALOG], current: CATALOG[0]!, events: [], loading: false, busy: false, ready: false, storageError: false, message: '', timer: null }
  private listeners = new Set<() => void>()
  private recent = [CATALOG[0]!.id]
  private revision = 0
  private settingsKey: string
  private unsubscribe: () => void
  readonly timer: SleepTimer
  constructor(private readonly engine: AudioEngine, private readonly repository = libraryRepository, private readonly decode = decodeAudio, private readonly random = Math.random, now = Date.now) {
    this.settingsKey = JSON.stringify(engine.getSnapshot().settings)
    this.timer = new SleepTimer((action) => { this.engine.finishTimer(action); this.publish({ message: action === 'music' ? '定时已结束：音乐关闭，环境声保留。' : '定时已结束：全部声音淡出。', timer: null }) }, now)
    this.unsubscribe = engine.subscribe(() => {
      const settings = engine.getSnapshot().settings, key = JSON.stringify(settings)
      if (key !== this.settingsKey) { this.settingsKey = key; void this.next(false) }
    })
    engine.setOnMusicEnded(() => { void this.next(false) })
  }
  getSnapshot = (): PlayerSnapshot => this.snapshot
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private publish(change: Partial<PlayerSnapshot>): void { this.snapshot = { ...this.snapshot, ...change }; this.listeners.forEach((listener) => listener()) }
  report(message: string): void { this.publish({ message }) }
  async load(): Promise<void> {
    if (this.snapshot.busy) return
    this.publish({ busy: true })
    try {
      const { tracks, events } = await this.repository.load()
      this.publish({ catalog: [...CATALOG, ...tracks], events, ready: true, storageError: false, message: '' })
    } catch { this.publish({ storageError: true, ready: true, message: '本地曲库暂不可用。内置音源仍可播放；请关闭其他旧页面后重试读取。' }) }
    finally { this.publish({ busy: false }) }
  }
  async select(track: Track | null, explicit = true): Promise<void> {
    const settings = this.engine.getSnapshot().settings
    if (track && (!this.snapshot.catalog.some((item) => item.id === track.id) || !isEligible(track, settings.mode))) { this.report('该曲目不适用于当前状态。'); return }
    const revision = ++this.revision
    if (explicit) this.engine.enableMusic()
    this.publish({ loading: true, message: '' })
    try {
      let buffer: AudioBuffer | null = null
      if (track?.source === 'imported') {
        const blob = await this.repository.read(track.id)
        if (revision !== this.revision) return
        buffer = await this.decode(blob)
      }
      if (revision !== this.revision) return
      this.engine.selectTrack(track, buffer)
      if (track) this.recent = [...this.recent.filter((id) => id !== track.id), track.id].slice(-5)
      this.publish({ current: track, message: track ? '' : '当前仅播放环境声。可选择内置噪音或导入适用曲目。' })
    } catch {
      if (revision !== this.revision) return
      this.engine.selectTrack(null)
      this.publish({ current: null, message: '曲目读取或解码失败，已回退环境声。可重试或删除该导入曲目。' })
    } finally { if (revision === this.revision) this.publish({ loading: false }) }
  }
  next = async (explicit = true): Promise<void> => {
    const track = recommendTrack(this.engine.getSnapshot().settings, this.snapshot.catalog, this.snapshot.events, this.recent, this.random)
    await this.select(track, explicit)
  }
  async feedback(kind: 'like' | 'unlike' | 'skip'): Promise<void> {
    const track = this.snapshot.current
    if (!track || this.snapshot.busy || !this.snapshot.ready || this.snapshot.storageError) return
    this.publish({ busy: true })
    try {
      if (!globalThis.crypto?.randomUUID) throw new Error('请使用 HTTPS 或本机 localhost 保存偏好。')
      const event: Feedback = { id: crypto.randomUUID(), trackId: track.id, kind, at: Math.max(Date.now(), (this.snapshot.events.at(-1)?.at ?? 0) + 1) }
      await this.repository.feedback(event)
      this.publish({ events: [...this.snapshot.events, event], message: kind === 'skip' ? '已记录跳过，降低今后的推荐权重。' : kind === 'like' ? '已加入喜欢。' : '已取消喜欢。' })
      if (kind === 'skip' && this.snapshot.current?.id === track.id) await this.next()
    } catch (error) { this.report(error instanceof Error && error.message.startsWith('请使用 HTTPS') ? error.message : '偏好未能保存，原有记录未变。请检查设备存储后重试。') }
    finally { this.publish({ busy: false }) }
  }
  isLiked(id: string): boolean { return likedTracks(this.snapshot.events).has(id) }
  async importFile(file: File, instrumental: boolean, mood: Mood): Promise<void> {
    if (this.snapshot.busy || !this.snapshot.ready || this.snapshot.storageError) return
    this.publish({ busy: true, message: '正在校验本地音频…' })
    try {
      validateFile(file)
      if (!globalThis.crypto?.subtle) throw new Error('请使用 HTTPS 或本机 localhost 导入音频。')
      const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
      const id = `local-${Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')}`
      if (this.snapshot.catalog.some((track) => track.id === id)) { this.report('这份音频已在曲库中，无需重复导入。'); return }
      const tracks = this.snapshot.catalog.filter((track) => track.source === 'imported')
      const estimate = await navigator.storage?.estimate?.().catch(() => undefined)
      validateCapacity(tracks.reduce((sum, track) => sum + (track.bytes ?? 0), 0), tracks.length, file.size, estimate)
      const buffer = await this.decode(file)
      const track = importedTrack(id, file, buffer.duration, instrumental, mood)
      await this.repository.add(track, file)
      this.publish({ catalog: [...this.snapshot.catalog, track], message: `已保存「${track.title}」到此设备。刷新后仍可使用。` })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      this.report(error instanceof DOMException && error.name === 'QuotaExceededError' ? '存储空间不足，未导入；原曲库未变。' : /[\u4e00-\u9fff]/.test(message) ? message : '音频无法解码或保存。请确认格式与浏览器支持，释放存储空间后重试；原曲库未变。')
    } finally { this.publish({ busy: false }) }
  }
  async remove(id: string): Promise<void> {
    if (this.snapshot.busy || !this.snapshot.catalog.some((track) => track.id === id && track.source === 'imported')) return
    this.publish({ busy: true })
    try {
      await this.repository.remove(id)
      ++this.revision
      this.publish({ catalog: this.snapshot.catalog.filter((track) => track.id !== id), events: this.snapshot.events.filter((event) => event.trackId !== id), loading: false, message: '已删除此设备中的副本及其偏好记录；原文件未改动。' })
      this.recent = this.recent.filter((item) => item !== id)
      if (this.snapshot.current?.id === id) await this.next(false)
    } catch { this.report('删除未成功，曲库与偏好记录保留。请重试。') }
    finally { this.publish({ busy: false }) }
  }
  startTimer(minutes: number, action: TimerAction): void {
    try { this.timer.start(minutes, action); this.publish({ timer: this.timer.state, message: '' }) }
    catch (error) { this.report((error as Error).message) }
  }
  cancelTimer = (): void => { this.timer.cancel(); this.publish({ timer: null, message: '定时已取消。' }) }
  beginSession(settings: ModeSettings): void {
    this.engine.enableMusic(); this.engine.setModeSettings(settings)
    if (settings.mode === 'focus' || settings.mode === 'sleep') this.startTimer(settings.mode === 'focus' ? 25 : 30, settings.mode === 'focus' ? 'music' : 'all')
  }
  dispose(): void { ++this.revision; this.unsubscribe(); this.engine.setOnMusicEnded(null); this.timer.cancel(); this.listeners.clear() }
}
