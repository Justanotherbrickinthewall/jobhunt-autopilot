// Stands in for src/components/Rail.tsx, which the phone copy never draws.
import { useState } from 'react'
import { Menu } from '../../components/Menu.tsx'
import { mergeBlock, progressBlock } from '../../data/progress-sync.ts'

// The text size scales every font token through --text-scale, which styles.css multiplies in.
const SIZES = [{ label: 'Normal', scale: 1 }, { label: 'Large', scale: 1.15 }, { label: 'Largest', scale: 1.3 }]
const SCALE_KEY = 'night-reading:text-scale'

function savedSize(): number {
  try { const i = SIZES.findIndex((s) => String(s.scale) === localStorage.getItem(SCALE_KEY)); return i < 0 ? 0 : i } catch { return 0 }
}

const apply = (i: number) => document.documentElement.style.setProperty('--text-scale', String(SIZES[i].scale))

/** Called before the first render, so the page does not flash at the wrong size. */
export const applySavedTextScale = (): void => apply(savedSize())

const THEME_KEY = 'night-reading:theme:v1'
type Theme = 'dark' | 'light' | 'system'
const THEMES: { label: string; value: Theme }[] = [{ label: 'Dark', value: 'dark' }, { label: 'Light', value: 'light' }, { label: 'Match phone', value: 'system' }]

function savedTheme(): Theme {
  try { const t = localStorage.getItem(THEME_KEY); return t === 'light' || t === 'system' ? t : 'dark' } catch { return 'dark' }
}

// phone/index.html runs the same steps before first paint. Keep the two in step.
function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === 'system') delete root.dataset.theme
  else root.dataset.theme = t
  const light = t === 'light' || (t === 'system' && !matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#EEF0EB' : '#121513')
}

export function DisplayMenu() {
  const [i, setI] = useState(savedSize)
  const [theme, setTheme] = useState(savedTheme)
  const size = (n: number) => {
    setI(n)
    apply(n)
    try { localStorage.setItem(SCALE_KEY, String(SIZES[n].scale)) } catch { /* storage unavailable */ }
  }
  const pick = (t: Theme) => {
    setTheme(t)
    applyTheme(t)
    try { localStorage.setItem(THEME_KEY, t) } catch { /* storage unavailable */ }
  }
  const [copy, setCopy] = useState<'idle' | 'copied' | 'manual'>('idle')
  const [block, setBlock] = useState('')
  // navigator.clipboard.writeText must run inside the tap, so it is called before any await. If it throws, the text is shown for selecting by hand.
  const copyProgress = async () => {
    const text = progressBlock()
    setBlock(text)
    try {
      await navigator.clipboard.writeText(text)
      setCopy('copied')
      setTimeout(() => setCopy('idle'), 2000)
    } catch { setCopy('manual') }
  }
  const [paste, setPaste] = useState<{ manual: boolean; text: string; msg: string }>({ manual: false, text: '', msg: '' })
  const merge = (text: string) => {
    try {
      const n = mergeBlock(text)
      setPaste({ manual: false, text: '', msg: `Merged, ${n} changed` })
      if (n) setTimeout(() => location.reload(), 800)   // the app reads storage on load
    } catch (e) { setPaste({ manual: true, text, msg: e instanceof Error ? e.message : 'Not merged' }) }
  }
  // readText must run inside the tap. If it is refused or missing, a textarea takes the block by hand.
  const pasteProgress = async () => {
    try { merge(await navigator.clipboard.readText()) } catch { setPaste({ manual: true, text: '', msg: '' }) }
  }
  return (
    <Menu label="Display" align="right">
      {() => (
        <>
          <p className="menu-head">Text size</p>
          {SIZES.map((s, n) => <button key={s.label} type="button" className="menu-item" aria-pressed={i === n} onClick={() => size(n)}>{s.label}</button>)}
          <p className="menu-head">Theme</p>
          {THEMES.map((t) => <button key={t.value} type="button" className="menu-item" aria-pressed={theme === t.value} onClick={() => pick(t.value)}>{t.label}</button>)}
          <p className="menu-head">Progress</p>
          <button type="button" className="menu-item" onClick={() => void copyProgress()}>{copy === 'copied' ? 'Copied' : 'Copy progress'}</button>
          {copy === 'manual' && <textarea readOnly rows={4} value={block} style={{ width: '100%' }} aria-label="Progress to copy by hand" onFocus={(e) => e.currentTarget.select()} />}
          <button type="button" className="menu-item" onClick={() => void pasteProgress()}>Paste progress</button>
          {paste.manual && <>
            <textarea rows={4} value={paste.text} style={{ width: '100%' }} aria-label="Progress block to paste" onChange={(e) => setPaste({ ...paste, text: e.target.value })} />
            <button type="button" className="menu-item" onClick={() => merge(paste.text)}>Merge</button>
          </>}
          {paste.msg && <p className="menu-note">{paste.msg}</p>}
        </>
      )}
    </Menu>
  )
}
