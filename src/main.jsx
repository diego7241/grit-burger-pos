import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

async function checkVersion() {
  try {
    const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' })
    const { v } = await res.json()
    if (v !== __BUILD_VERSION__) window.location.reload()
  } catch (_) {}
}

checkVersion()
setInterval(checkVersion, 60_000)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)