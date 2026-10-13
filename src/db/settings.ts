import { parseSettings, type ModeSettings } from '../features/modes'
import { databaseRequest } from './database'

export function accessSettings(action: 'read' | 'write', value?: ModeSettings, factory?: IDBFactory): Promise<ModeSettings | null> {
  if (action === 'write' && !parseSettings(value)) return Promise.reject(new Error('Invalid mode settings'))
  return databaseRequest(['settings'], action === 'read' ? 'readonly' : 'readwrite', (transaction, result) => {
    const store = transaction.objectStore('settings')
    const request = action === 'read' ? store.get('mode') : store.put(parseSettings(value), 'mode')
    request.onsuccess = () => result(action === 'read' ? parseSettings(request.result) : parseSettings(value))
  }, factory, 2500)
}
