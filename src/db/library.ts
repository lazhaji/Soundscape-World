import { MODES, MOODS } from '../features/modes'
import type { Track } from '../audio/catalog'
import type { Feedback } from '../audio/recommendation'
import { MAX_FILE_BYTES, MAX_DURATION, validateCapacity } from '../audio/importAudio'
import { databaseRequest } from './database'

interface StoredTrack { track: Track; blob: Blob }
function validTrack(value: unknown): value is StoredTrack {
  if (!value || typeof value !== 'object') return false
  const { track: t, blob } = value as StoredTrack
  return !!t && typeof t.id === 'string' && /^local-[a-f0-9]{64}$/.test(t.id)
    && t.source === 'imported' && t.generator === undefined && t.assetPath === `indexeddb:${t.id}`
    && typeof t.title === 'string' && t.title.length > 0 && t.title.length <= 100 && typeof t.artist === 'string' && t.artist.length <= 100
    && Array.isArray(t.tags) && t.tags.length <= 10 && t.tags.every((tag) => typeof tag === 'string' && tag.length <= 50)
    && Array.isArray(t.eligibleModes) && t.eligibleModes.every((mode) => Object.hasOwn(MODES, mode) && mode !== 'sleep')
    && Array.isArray(t.moodTags) && t.moodTags.every((mood) => Object.hasOwn(MOODS, mood)) && typeof t.instrumental === 'boolean'
    && Number.isFinite(t.energy) && t.energy >= 0 && t.energy <= 1 && Number.isFinite(t.duration) && t.duration > 0 && t.duration <= MAX_DURATION
    && blob instanceof Blob && blob.size > 0 && blob.size <= MAX_FILE_BYTES && t.bytes === blob.size
}
function validFeedback(value: unknown): value is Feedback {
  if (!value || typeof value !== 'object') return false
  const e = value as Feedback
  return typeof e.id === 'string' && e.id.length <= 100 && typeof e.trackId === 'string' && e.trackId.length <= 100 && ['like', 'unlike', 'skip'].includes(e.kind) && Number.isFinite(e.at)
}
export const libraryRepository = {
  load: () => databaseRequest<{ tracks: Track[]; events: Feedback[] }>(['tracks', 'feedback'], 'readonly', (tx, done) => {
    let tracks: Track[] = [], events: Feedback[] = []
    const trackRequest = tx.objectStore('tracks').getAll(), eventRequest = tx.objectStore('feedback').getAll()
    trackRequest.onsuccess = () => {
      if (!trackRequest.result.every(validTrack)) { tx.abort(); return }
      tracks = (trackRequest.result as StoredTrack[]).map((row) => row.track); done({ tracks, events })
    }
    eventRequest.onsuccess = () => {
      if (!eventRequest.result.every(validFeedback)) { tx.abort(); return }
      events = (eventRequest.result as Feedback[]).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)); done({ tracks, events })
    }
  }),
  read: (id: string) => databaseRequest<Blob>(['tracks'], 'readonly', (tx, done) => {
    const request = tx.objectStore('tracks').get(id)
    request.onsuccess = () => { if (validTrack(request.result)) done(request.result.blob); else tx.abort() }
  }),
  add: (track: Track, blob: Blob) => databaseRequest<void>(['tracks'], 'readwrite', (tx, done) => {
    if (!validTrack({ track, blob })) throw new Error('Invalid imported track')
    const store = tx.objectStore('tracks'), request = store.getAll()
    request.onsuccess = () => {
      const rows = request.result as StoredTrack[]
      if (!rows.every(validTrack)) { tx.abort(); return }
      if (rows.some((row) => row.track.id === track.id)) { done(); return }
      try { validateCapacity(rows.reduce((sum, row) => sum + row.blob.size, 0), rows.length, blob.size) }
      catch { tx.abort(); return }
      store.add({ track, blob }, track.id); done()
    }
  }),
  remove: (id: string) => databaseRequest<void>(['tracks', 'feedback'], 'readwrite', (tx, done) => {
    tx.objectStore('tracks').delete(id)
    const cursor = tx.objectStore('feedback').openCursor()
    cursor.onsuccess = () => {
      const row = cursor.result
      if (!row) { done(); return }
      if ((row.value as Feedback).trackId === id) row.delete()
      row.continue()
    }
  }),
  feedback: (event: Feedback) => databaseRequest<void>(['feedback'], 'readwrite', (tx, done) => {
    if (!validFeedback(event)) throw new Error('Invalid feedback')
    tx.objectStore('feedback').add(event, event.id); done()
  }),
}
