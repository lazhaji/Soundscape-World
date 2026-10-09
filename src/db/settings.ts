import { parseSettings } from '../features/modes'
import type { ModeSettings } from '../features/modes'

const DB_NAME = 'soundscape-db'
const TIMEOUT_MS = 2500

/** M2 stores only confirmed mode/mood/DND. M4 will add archive stores by migration. */
export function accessSettings(action: 'read' | 'write', value?: ModeSettings, factory?: IDBFactory): Promise<ModeSettings | null> {
  return new Promise((resolve, reject) => {
    if (action === 'write' && !parseSettings(value)) { reject(new Error('Invalid mode settings')); return }
    try { factory ??= globalThis.indexedDB } catch { reject(new Error('IndexedDB unavailable')); return }
    if (!factory) { reject(new Error('IndexedDB unavailable')); return }
    let database: IDBDatabase | undefined
    let transaction: IDBTransaction | undefined
    let settled = false
    const finish = (error?: Error, result: ModeSettings | null = null) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      database?.close()
      if (error) reject(error); else resolve(result)
    }
    const timeout = setTimeout(() => {
      finish(new Error('Settings storage timed out'))
      try { transaction?.abort() } catch { /* Transaction may already be complete. */ }
    }, TIMEOUT_MS)
    try {
      const open = factory.open(DB_NAME, 1)
      open.onupgradeneeded = () => {
        if (settled) { open.transaction?.abort(); return }
        if (!open.result.objectStoreNames.contains('settings')) open.result.createObjectStore('settings')
      }
      open.onblocked = () => finish(new Error('Settings storage blocked'))
      open.onerror = () => finish(new Error('Cannot open settings'))
      open.onsuccess = () => {
        database = open.result
        if (settled) { database.close(); return }
        database.onversionchange = () => database?.close()
        try {
          transaction = database.transaction('settings', action === 'read' ? 'readonly' : 'readwrite')
          const store = transaction.objectStore('settings')
          const request = action === 'read' ? store.get('mode') : store.put(parseSettings(value), 'mode')
          let result: ModeSettings | null = null
          request.onsuccess = () => { result = action === 'read' ? parseSettings(request.result) : parseSettings(value) }
          transaction.oncomplete = () => finish(undefined, result)
          transaction.onerror = () => finish(new Error('Cannot access settings'))
          transaction.onabort = () => finish(new Error('Settings transaction aborted'))
        } catch { finish(new Error('Cannot access settings store')) }
      }
    } catch { finish(new Error('Cannot open settings storage')) }
  })
}
