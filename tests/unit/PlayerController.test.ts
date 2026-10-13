import { afterEach, expect, it, vi } from 'vitest'
import { PlayerController } from '../../src/audio/PlayerController'
import { CATALOG, type Track } from '../../src/audio/catalog'
import type { Feedback } from '../../src/audio/recommendation'
import { mockAudio } from '../helpers/audio'

afterEach(() => vi.unstubAllGlobals())
function setup(tracks: Track[] = []) {
  const audio = mockAudio()
  const repository = { load: vi.fn(async () => ({ tracks, events: [] as Feedback[] })), read: vi.fn(async () => new Blob(['audio'])), add: vi.fn(async () => {}), remove: vi.fn(async () => {}), feedback: vi.fn<(event: Feedback) => Promise<void>>().mockResolvedValue() }
  const decode = vi.fn(async () => ({ duration: 10, length: 220500, numberOfChannels: 1 }) as AudioBuffer)
  const player = new PlayerController(audio.engine, repository, decode, () => 0)
  return { ...audio, repository, decode, player }
}
const local = { ...CATALOG[0]!, id: `local-${'a'.repeat(64)}`, source: 'imported' as const, generator: undefined, assetPath: `indexeddb:local-${'a'.repeat(64)}`, bytes: 5 }
const localTrack: Track = { ...local, generator: 'rainlight' }
delete localTrack.generator

it('does not let a late decode replace a newer selection or re-enable timed-off music', async () => {
  const { player, repository, engine } = setup([localTrack])
  await player.load()
  let resolve!: (blob: Blob) => void
  repository.read.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
  const stale = player.select(localTrack)
  await player.select(CATALOG[1]!); resolve(new Blob(['x'])); await stale
  expect(player.getSnapshot().current?.id).toBe(CATALOG[1]!.id)
  repository.read.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
  const pending = player.select(localTrack); engine.finishTimer('music'); resolve(new Blob(['x'])); await pending
  expect(engine.getSnapshot().musicOff).toBe(true)
  player.dispose()
})
it('persists feedback only on commit; failures do not pretend that a like was saved', async () => {
  const { player, repository } = setup()
  await player.load(); repository.feedback.mockRejectedValueOnce(new Error('disk full'))
  await player.feedback('like'); expect(player.isLiked(CATALOG[0]!.id)).toBe(false)
  await player.feedback('like'); expect(player.isLiked(CATALOG[0]!.id)).toBe(true)
  expect(repository.feedback.mock.calls[1]![0]).toMatchObject({ kind: 'like', trackId: CATALOG[0]!.id, id: expect.any(String) })
  await player.feedback('skip'); expect(player.getSnapshot().current?.id).not.toBe(CATALOG[0]!.id)
  player.dispose()
})
it('reports insecure-context crypto limitations without leaving controls busy or changing data', async () => {
  const { player, repository } = setup()
  await player.load(); vi.stubGlobal('crypto', {})
  await player.feedback('like'); expect(player.getSnapshot()).toMatchObject({ busy: false, events: [], message: expect.stringContaining('HTTPS') })
  await player.importFile(new File(['audio'], 'sample.wav'), true, 'calm')
  expect(player.getSnapshot()).toMatchObject({ busy: false, message: expect.stringContaining('HTTPS') })
  expect(repository.add).not.toHaveBeenCalled(); expect(repository.feedback).not.toHaveBeenCalled()
  player.dispose()
})
it('keeps data after failed import/delete and deduplicates content before decoding', async () => {
  vi.stubGlobal('navigator', { storage: { estimate: async () => ({ quota: 1e9, usage: 0 }) } })
  const { player, repository, decode } = setup()
  await player.load()
  const file = new File(['sample'], 'sound.wav', { type: 'audio/wav' })
  repository.add.mockRejectedValueOnce(new DOMException('full', 'QuotaExceededError'))
  await player.importFile(file, true, 'calm'); expect(player.getSnapshot().catalog).toHaveLength(3)
  await player.importFile(file, true, 'calm'); expect(player.getSnapshot().catalog).toHaveLength(4)
  await player.importFile(file, true, 'calm'); expect(decode).toHaveBeenCalledTimes(2)
  const id = player.getSnapshot().catalog.at(-1)!.id
  repository.remove.mockRejectedValueOnce(new Error('blocked')); await player.remove(id)
  expect(player.getSnapshot().catalog).toHaveLength(4)
  await player.select(player.getSnapshot().catalog.at(-1)!); await player.remove(id)
  expect(player.getSnapshot().catalog).toHaveLength(3); expect(player.getSnapshot().current?.id).not.toBe(id)
  player.dispose()
})
it('falls back to ambience on decode errors and retains built-ins when storage is unavailable', async () => {
  const { player, decode, repository, engine } = setup([localTrack])
  await player.load(); decode.mockRejectedValueOnce(new Error('bad codec'))
  await player.select(localTrack); expect(player.getSnapshot().current).toBeNull(); expect(engine.getDiagnostics().trackId).toBeNull()
  repository.load.mockRejectedValueOnce(new Error('blocked')); await player.load()
  expect(player.getSnapshot().storageError).toBe(true)
  await player.select(CATALOG[2]!); expect(player.getSnapshot().current?.id).toBe(CATALOG[2]!.id)
  player.beginSession({ mode: 'sleep', mood: 'calm', doNotDisturb: false })
  expect(player.getSnapshot().timer?.action).toBe('all')
  expect(player.getSnapshot().current?.generator).not.toBe('rainlight')
  player.dispose()
})
