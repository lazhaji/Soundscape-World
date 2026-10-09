import { AudioControls } from '../ui/AudioControls'
import { ScenePreview } from '../world/ScenePreview'

export function DebugPage() {
  return (
    <main className="app-shell">
      <header className="masthead">
        <a className="wordmark" href="#/" aria-label="返回主体验"><span className="brand-mark" aria-hidden="true">▥</span><span>SOUNDSCAPE<br /><span className="wordmark-sub">RAILWAY</span></span></a>
        <span className="milestone-badge">M1 · 空间音景</span>
      </header>
      <div className="intro">
        <p className="eyebrow">A SMALL PLACE FOR SOUND</p>
        <h1>雨夜里，<span>有一盏灯等你。</span></h1>
        <p className="intro-copy">点一点，走进街角便利店。<br />音乐在店里，雨声在门外。</p>
      </div>
      <div className="verification-grid"><ScenePreview /><AudioControls /></div>
      <footer><span className="footer-dot" aria-hidden="true" /><p>M1 可交互原型 · 程序化模型与本地合成音景</p><span className="edition">SOUNDSCAPE / 01</span></footer>
    </main>
  )
}
