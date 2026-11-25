import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist/index.css'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/jetbrains-mono/index.css'
import { PhoneApp } from './PhoneApp.tsx'
import { ReadAlongProvider } from '../reading/ReadAlong.tsx'
import '../styles.css'
import '../styles/list-detail.css' // the drill's question list and Learn's rows need these before Learn has loaded
import '../styles/detail.css'
import './phone.css'
import { mergeKeys } from '../data/progress-sync.ts'
import { applySavedTextScale } from './standins/rail.tsx'

applySavedTextScale()

// A cold launch lands on the base address. Open the screen the candidate left, and a chapter at the paragraph they were reading.
const base = import.meta.env.BASE_URL
try {
  if (location.pathname === base && !location.hash) {
    const to = localStorage.getItem('night-reading:last-screen')
    if (to && to !== base && to.startsWith(base)) {
      const last = JSON.parse(localStorage.getItem('fde:last') ?? 'null')
      const at = last && to.endsWith(`/chapter/${last.chapterId}`) ? last.blockId ?? last.sectionId : undefined
      history.replaceState(null, '', at ? `${to}#${at}` : to)
    }
  }
} catch { /* storage unavailable or unreadable */ }

if (import.meta.env.PROD && 'serviceWorker' in navigator) void navigator.serviceWorker.register(`${base}sw.js`, { scope: base })

// Once per load, merge the progress the build published. The merge never lowers a value and keeps the phone's own reading position.
void fetch(`${base}progress.json`).then((r) => (r.ok ? r.json() : null)).then((b) => {
  if (!b || b.v !== 1 || typeof b.keys !== 'object' || !b.keys) return
  const reloaded = sessionStorage.getItem('progress-merged')   // a reload caused by this merge never causes another
  sessionStorage.removeItem('progress-merged')
  if (mergeKeys(b.keys) > 0 && !reloaded) { sessionStorage.setItem('progress-merged', '1'); location.reload() }
}).catch(() => { /* offline or not published */ })

try { history.scrollRestoration = 'manual' } catch { /* not supported */ }

createRoot(document.getElementById('root')!).render(<StrictMode><ReadAlongProvider><PhoneApp /></ReadAlongProvider></StrictMode>)
