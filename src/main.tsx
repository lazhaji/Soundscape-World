import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { ErrorBoundary } from './ui/ErrorBoundary'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing root element')

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary fallback={<main className="fatal-error" role="alert"><h1>页面暂时不可用</h1><p>请重新加载页面再试一次。</p><button onClick={() => window.location.reload()}>重新加载页面</button></main>}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
