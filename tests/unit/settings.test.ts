import { afterEach, expect, it, vi } from 'vitest'
import { accessSettings } from '../../src/db/settings'
import { DEFAULT_SETTINGS } from '../../src/features/modes'

afterEach(() => vi.useRealTimers())
it('turns browser security errors while accessing IndexedDB into a recoverable rejection', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, get: () => { throw new Error('SecurityError') } })
  try { await expect(accessSettings('read')).rejects.toThrow('unavailable') }
  finally { if (original) Object.defineProperty(globalThis, 'indexedDB', original); else Reflect.deleteProperty(globalThis, 'indexedDB') }
})
it('fails clearly for unavailable storage, sync open failures and invalid writes', async () => {
  await expect(accessSettings('read', undefined, undefined)).rejects.toThrow('unavailable')
  await expect(accessSettings('read', undefined, { open: () => { throw new Error() } } as unknown as IDBFactory)).rejects.toThrow('Cannot open')
  await expect(accessSettings('write')).rejects.toThrow('Invalid')
})
it('bounds stalled storage and closes a connection that arrives after timeout', async () => {
  vi.useFakeTimers()
  const request = { result: { close: vi.fn() }, onsuccess: () => {} }
  const operation = accessSettings('read', undefined, { open: () => request } as unknown as IDBFactory)
  const assertion = expect(operation).rejects.toThrow('timed out')
  await vi.advanceTimersByTimeAsync(2500); await assertion
  request.onsuccess()
  expect(request.result.close).toHaveBeenCalledOnce()
})
it('resolves writes only after the transaction commits and stores only settings', async () => {
  const put = vi.fn(() => request)
  const transaction = { objectStore: () => ({ put }), oncomplete: () => {}, onerror: () => {}, onabort: () => {} }
  const request = { result: undefined, onsuccess: () => {} }
  const open = { result: { close: vi.fn(), transaction: () => transaction, onversionchange: () => {} }, onsuccess: () => {} }
  const operation = accessSettings('write', { ...DEFAULT_SETTINGS }, { open: () => open } as unknown as IDBFactory)
  const complete = vi.fn(); void operation.then(complete)
  open.onsuccess(); request.onsuccess()
  await Promise.resolve()
  expect(complete).not.toHaveBeenCalled()
  expect(put).toHaveBeenCalledWith(DEFAULT_SETTINGS, 'mode')
  transaction.oncomplete()
  await expect(operation).resolves.toEqual(DEFAULT_SETTINGS)
  expect(open.result.close).toHaveBeenCalledOnce()
})
