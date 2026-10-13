import { MOODS, type Mood } from '../features/modes'
import type { Track } from './catalog'

export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_LIBRARY_BYTES = 100 * 1024 * 1024
export const MAX_TRACKS = 20
export const MAX_DURATION = 300
export function validateFile(file: Pick<File, 'name' | 'type' | 'size'>): void {
  if (!/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name) || file.type && !file.type.startsWith('audio/') && file.type !== 'application/ogg') throw new Error('请选择 MP3、WAV、M4A、AAC、OGG 或 FLAC 音频')
  if (!file.size || file.size > MAX_FILE_BYTES) throw new Error('每个文件需大于 0 且不超过 10 MiB')
}
export function validateDecoded(buffer: Pick<AudioBuffer, 'duration' | 'length' | 'numberOfChannels'>): void {
  if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > MAX_DURATION || buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2 || buffer.length * buffer.numberOfChannels * 4 > 64 * 1024 * 1024) throw new Error('音频需在 5 分钟内、单/双声道，解码后不超过 64 MiB')
}
export function validateCapacity(bytes: number, count: number, incoming: number, estimate?: StorageEstimate): void {
  if (count >= MAX_TRACKS || bytes + incoming > MAX_LIBRARY_BYTES) throw new Error('本地曲库上限为 20 首 / 100 MiB，请先删除不需要的导入曲目')
  if (estimate?.quota !== undefined && estimate.usage !== undefined && estimate.quota - estimate.usage < incoming * 1.1) throw new Error('浏览器存储空间不足，请先释放空间')
}
export async function inspectDuration(blob: Blob): Promise<void> {
  const media = new Audio(), url = URL.createObjectURL(blob)
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    await new Promise<void>((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error('音频信息读取超时，请换一份文件重试')), 10000)
      media.onloadedmetadata = () => {
        if (Number.isFinite(media.duration) && media.duration > 0 && media.duration <= MAX_DURATION) resolve()
        else reject(new Error('音频需在 5 分钟内，并能读取有效时长'))
      }
      media.onerror = () => reject(new Error('音频无法解码，请确认文件及浏览器支持'))
      media.preload = 'metadata'; media.src = url
    })
  } finally {
    clearTimeout(timeout); media.onloadedmetadata = null; media.onerror = null
    media.removeAttribute('src'); media.load(); URL.revokeObjectURL(url)
  }
}
export async function decodeAudio(blob: Blob): Promise<AudioBuffer> {
  // Check duration before allocating an entire decoded PCM buffer on a phone.
  await inspectDuration(blob)
  const decoder = new OfflineAudioContext(2, 1, 22050)
  const bytes = await blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('音频解码超时，请换一份文件重试')), 30000)
    void decoder.decodeAudioData(bytes).then((buffer) => {
      try { validateDecoded(buffer); resolve(buffer) } catch (error) { reject(error) }
    }, reject).finally(() => clearTimeout(timeout))
  })
}
export function importedTrack(id: string, file: File, duration: number, instrumental: boolean, mood: Mood): Track {
  if (!Object.hasOwn(MOODS, mood)) throw new Error('请选择曲目的氛围标签')
  return { id, title: file.name.replace(/\.[^.]+$/, '').slice(0, 100) || '本地音频', artist: '本地导入 · 仅此设备', source: 'imported', tags: [instrumental ? 'instrumental' : 'local', mood], eligibleModes: instrumental ? ['focus', 'relax', 'free'] : ['relax', 'free'], moodTags: [mood], energy: instrumental ? 0.25 : 0.5, instrumental, duration, assetPath: `indexeddb:${id}`, bytes: file.size }
}
