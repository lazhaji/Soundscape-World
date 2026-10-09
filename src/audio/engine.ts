import { AudioEngine } from './AudioEngine'

export const audioEngine = new AudioEngine()

// Fast Refresh must not leave a previous module's source playing.
if (import.meta.hot) {
  import.meta.hot.dispose(() => { void audioEngine.dispose() })
}
