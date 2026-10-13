/** Additive v1 -> v2 migration; the existing settings/mode row is never replaced. */
export function databaseRequest<T>(stores: string[], mode: IDBTransactionMode, run: (transaction: IDBTransaction, result: (value: T) => void) => void, factory?: IDBFactory, timeoutMs = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    try { factory ??= globalThis.indexedDB } catch { reject(new Error('IndexedDB unavailable')); return }
    if (!factory) { reject(new Error('IndexedDB unavailable')); return }
    let database: IDBDatabase | undefined, transaction: IDBTransaction | undefined, value: T
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true; clearTimeout(timeout); database?.close()
      if (error) reject(error); else resolve(value)
    }
    const timeout = setTimeout(() => {
      finish(new Error('Storage timed out'))
      try { transaction?.abort() } catch { /* Already completed. */ }
    }, timeoutMs)
    try {
      const open = factory.open('soundscape-db', 2)
      open.onupgradeneeded = () => {
        if (settled) { open.transaction?.abort(); return }
        for (const name of ['settings', 'tracks', 'feedback']) if (!open.result.objectStoreNames.contains(name)) open.result.createObjectStore(name)
      }
      open.onblocked = () => finish(new Error('Storage blocked: close other tabs'))
      open.onerror = () => finish(open.error ?? new Error('Cannot open storage'))
      open.onsuccess = () => {
        database = open.result
        if (settled) { database.close(); return }
        database.onversionchange = () => database?.close()
        try {
          transaction = database.transaction(stores, mode)
          transaction.oncomplete = () => finish()
          transaction.onerror = () => finish(transaction?.error ?? new Error('Cannot access storage'))
          transaction.onabort = () => finish(transaction?.error ?? new Error('Storage transaction aborted'))
          run(transaction, (next) => { value = next })
        } catch (error) {
          try { transaction?.abort() } catch { /* Already completed. */ }
          finish(error instanceof Error ? error : new Error('Cannot access storage'))
        }
      }
    } catch { finish(new Error('Cannot open storage')) }
  })
}
