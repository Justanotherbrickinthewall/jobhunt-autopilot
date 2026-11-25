import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist/index.css'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/jetbrains-mono/index.css'
import { App } from './App.tsx'
import { ReadAlongProvider } from './reading/ReadAlong.tsx'
import { hydrateFromServer } from './reading/storage.ts'
import { loadNotebook } from './reading/bookmarks.ts'
import './styles.css'
import './styles/list-detail.css'
import './styles/detail.css'
import './styles/retro.css' // Retro rules stay out of the phone bundle

// The window scrolls under 900px, and the browser's own restore lands mid-page on content that has changed. App scrolls to the top on every move instead.
try { history.scrollRestoration = 'manual' } catch { /* not supported */ }

// The progress file is read before the first render, so a tick saved there shows at once.
void hydrateFromServer().finally(() => {
  void loadNotebook()
  createRoot(document.getElementById('root')!).render(<StrictMode><ReadAlongProvider><App /></ReadAlongProvider></StrictMode>)
})
