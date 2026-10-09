import { AudioCheck } from '../ui/AudioCheck'
import { ScenePreview } from '../world/ScenePreview'

export function App() {
  return (
    <main className="app-shell">
      <header className="masthead">
        <a className="wordmark" href="./" aria-label="Soundscape Railway 首页"><span className="brand-mark" aria-hidden="true">▥</span><span>SOUNDSCAPE<br /><span className="wordmark-sub">RAILWAY</span></span></a>
        <span className="milestone-badge">M0 · 技术验证</span>
      </header>
      <div className="intro">
        <p className="eyebrow">A SMALL PLACE FOR SOUND</p>
        <h1>下一站，<br /><span>声音的栖息地。</span></h1>
        <p className="intro-copy">一座小小的车站，一段属于自己的声音。<br />旅程从此刻的技术原型开始。</p>
      </div>
      <div className="verification-grid"><ScenePreview /><AudioCheck /></div>
      <footer><span className="footer-dot" aria-hidden="true" /><p>当前仅验证 3D 与点击启声。完整旅程尚未开放。</p><span className="edition">PROTOTYPE / 00</span></footer>
    </main>
  )
}
