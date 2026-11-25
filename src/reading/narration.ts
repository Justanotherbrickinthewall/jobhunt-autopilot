// The read-along controller, ported from fde-roadmap's engine/narration.ts. Plain TypeScript, no React.
// The neural voice comes from POST /api/tts; the fallback is the browser's speechSynthesis with boundary events.
import { readKey, writeKey } from './storage.ts'
import { alignWords, tokenAtChar, type NarrUnit, type TimedWord } from './text.ts'

export type NarrationSettings = { rate: number; source: 'neural' | 'system'; follow: boolean; voice: string }

// The phone has no server, so the voice is always the system one.
const PHONE = import.meta.env.VITE_PHONE === '1'
const SETTINGS_KEY = 'hunt-board:narration:v1'
const DEFAULTS: NarrationSettings = { rate: 1, source: 'neural', follow: true, voice: 'en-GB-RyanNeural' }
const NO_SETTINGS: Partial<NarrationSettings> = {}

const getSettings = (): NarrationSettings => ({ ...DEFAULTS, ...readKey(SETTINGS_KEY, NO_SETTINGS), ...(PHONE ? { source: 'system' as const } : {}) })
const saveSettings = (patch: Partial<NarrationSettings>) => writeKey(SETTINGS_KEY, { ...getSettings(), ...patch })

export type NarrStatus = 'idle' | 'loading' | 'playing' | 'paused'

export type NarrState = {
  status: NarrStatus
  index: number   // current unit, -1 when none
  word: number    // current word inside the unit, -1 before the first word
  total: number
  rate: number
  source: NarrationSettings['source']
  follow: boolean
  message: string | null
}

type TtsData = { id: string; words: TimedWord[] }

export function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === 'en-GB' && v.localService) ??
    voices.find((v) => v.lang.replace('_', '-') === 'en-GB') ??
    voices.find((v) => v.lang.startsWith('en') && v.localService) ??
    voices.find((v) => v.lang.startsWith('en'))
  )
}

export class NarrationController {
  private units: NarrUnit[] = []
  private state: NarrState
  private listeners = new Set<() => void>()
  private session = 0
  private audio: HTMLAudioElement | null = null
  private raf = 0
  private utter: SpeechSynthesisUtterance | null = null
  private prefetchCache = new Map<string, Promise<TtsData>>()
  private serverDownUntil = 0
  private voice: string
  /** Reads the units of the current view from the page right now. The provider sets it. */
  readPage: (() => NarrUnit[]) | null = null

  constructor() {
    const s = getSettings()
    this.voice = s.voice
    this.state = { status: 'idle', index: -1, word: -1, total: 0, rate: s.rate, source: s.source, follow: s.follow, message: null }
  }

  // ---- store plumbing ----
  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb)
    return () => { this.listeners.delete(cb) }
  }
  getState = (): NarrState => this.state
  private set(patch: Partial<NarrState>): void {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
  }
  /** The active word for a block key, or null when the block is not current. */
  activeWord = (key: string): number | null => {
    const u = this.units[this.state.index]
    return u && u.key === key ? this.state.word : null
  }

  // ---- setup ----
  /** Replaces the units of the current view. Playback carries on while the spoken block is still there. */
  setUnits(units: NarrUnit[]): void {
    const same = units.length === this.units.length && units.every((u, i) => u.key === this.units[i].key && u.text === this.units[i].text)
    if (same) return
    const current = this.units[this.state.index]
    this.units = units
    const at = current ? units.findIndex((u) => u.key === current.key && u.text === current.text) : -1
    if (current && at === -1) {
      this.stop()   // the spoken block left the view: the tab changed or the drawer closed
      this.set({ total: units.length })
      return
    }
    this.set({ total: units.length, index: at })
  }

  // ---- public controls ----
  toggle(): void {
    const { status, index } = this.state
    if (status === 'playing' || status === 'loading') return this.pause()
    if (status === 'paused' && this.audio && !this.audio.ended) return this.resume()
    if (status === 'paused' && this.utter && typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking) return this.resume()
    void this.playIndex(index >= 0 ? index : this.firstVisibleIndex())
  }

  pause(): void {
    if (this.state.status === 'idle' || this.state.status === 'paused') return
    this.audio?.pause()
    if (typeof speechSynthesis !== 'undefined' && this.utter) speechSynthesis.pause()
    this.set({ status: 'paused' })
  }

  resume(): void {
    if (this.audio && !this.audio.ended) void this.audio.play()
    else if (this.utter && typeof speechSynthesis !== 'undefined') speechSynthesis.resume()
    this.set({ status: 'playing' })
  }

  next(): void {
    const i = this.state.index + 1
    if (i < this.units.length) void this.playIndex(i)
    else this.stop()
  }

  prev(): void {
    const word = this.state.word
    const i = this.state.index
    // A press inside the first few words goes back a block; otherwise it restarts this one.
    void this.playIndex(i > 0 && word < 3 ? i - 1 : Math.max(0, i))
  }

  playFrom(key: string, word = 0): void {
    const i = this.units.findIndex((u) => u.key === key)
    if (i >= 0) void this.playIndex(i, word)
  }

  stop(): void {
    this.session++
    this.teardown()
    this.set({ status: 'idle', index: -1, word: -1 })
  }

  setRate(rate: number): void {
    const r = Math.min(1.6, Math.max(0.8, rate))
    saveSettings({ rate: r })
    this.set({ rate: r })
    if (this.audio) this.audio.playbackRate = r
    else if (this.utter && this.state.status !== 'idle') void this.playIndex(this.state.index, Math.max(0, this.state.word))
  }

  setSource(source: NarrationSettings['source']): void {
    if (PHONE) return
    saveSettings({ source })
    this.set({ source, message: null })
    this.serverDownUntil = 0
    if (this.state.status === 'playing' || this.state.status === 'loading') void this.playIndex(this.state.index, Math.max(0, this.state.word))
  }

  setFollow(follow: boolean): void {
    saveSettings({ follow })
    this.set({ follow })
    if (follow) this.scrollToCurrent()
  }

  // ---- internals ----
  private teardown(): void {
    cancelAnimationFrame(this.raf)
    if (this.audio) {
      this.audio.onended = null
      this.audio.onerror = null
      this.audio.pause()
      this.audio = null
    }
    if (typeof speechSynthesis !== 'undefined') {
      if (this.utter) {
        this.utter.onend = null
        this.utter.onerror = null
        this.utter.onboundary = null
      }
      speechSynthesis.cancel()
    }
    this.utter = null
  }

  private element(key: string): Element | null {
    return document.querySelector(`[data-narr-key="${CSS.escape(key)}"]`)
  }

  private firstVisibleIndex(): number {
    for (let i = 0; i < this.units.length; i++) {
      const el = this.element(this.units[i].key)
      if (el && el.getBoundingClientRect().bottom > 120) return i
    }
    return 0
  }

  private scrollToCurrent(): void {
    const u = this.units[this.state.index]
    if (!u || !this.state.follow) return
    const el = this.element(u.key)
    if (!el) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }

  private async playIndex(i: number, startWord = 0): Promise<void> {
    const token = ++this.session
    this.teardown()
    if (i < 0 || i >= this.units.length) return this.stop()
    const unit = this.units[i]
    this.set({ index: i, word: startWord > 0 ? startWord : -1, status: 'loading' })
    this.scrollToCurrent()

    let done = false
    if (!PHONE && this.state.source === 'neural' && Date.now() > this.serverDownUntil) {
      try {
        const data = await this.fetchTts(unit)
        if (token !== this.session) return
        await this.playAudio(unit, data, token, startWord)
        done = true
      } catch {
        if (token !== this.session) return
        this.teardown()   // drop the dead Audio, or Pause, Resume and speed would act on it instead of the system voice
        this.serverDownUntil = Date.now() + 30_000
        this.set({ message: 'Neural voice unavailable. Using the system voice.' })
      }
    }
    if (token !== this.session) return
    if (!done) {
      if (typeof speechSynthesis === 'undefined') {
        this.set({ status: 'paused', message: 'No voice is available in this browser.' })
        return
      }
      await this.speak(unit, token, startWord)
    }
    if (token !== this.session) return
    // The view may have changed while this unit played, and the page observer is a frame behind a click,
    // so the page is read again here and the next one is found by key.
    if (this.readPage) this.setUnits(this.readPage())
    if (token !== this.session) return
    const next = this.units.findIndex((u) => u.key === unit.key) + 1
    if (next > 0 && next < this.units.length) void this.playIndex(next)
    else this.set({ status: 'idle', index: -1, word: -1 })
  }

  private fetchTts(unit: NarrUnit): Promise<TtsData> {
    if (PHONE) return Promise.reject(new Error('tts is not available on the phone'))   // spoken text never leaves the page
    const key = `${this.voice}|${unit.text}`
    let p = this.prefetchCache.get(key)
    if (!p) {
      p = (async () => {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: unit.text, voice: this.voice }),
          signal: AbortSignal.timeout(65_000),   // just past the server's 60 s synthesis kill, so long blocks still get the neural voice
        })
        if (!res.ok) throw new Error(`tts ${res.status}`)
        const data = (await res.json()) as TtsData
        if (!/^[a-f0-9]{40}$/u.test(data.id) || !Array.isArray(data.words)) throw new Error('bad tts reply')
        return data
      })()
      p.catch(() => this.prefetchCache.delete(key))
      this.prefetchCache.set(key, p)
      if (this.prefetchCache.size > 40) this.prefetchCache.delete(this.prefetchCache.keys().next().value as string)
    }
    return p
  }

  private prefetchNext(i: number): void {
    const next = this.units[i + 1]
    if (!next || this.state.source !== 'neural' || Date.now() < this.serverDownUntil) return
    this.fetchTts(next).catch(() => {})
  }

  private playAudio(unit: NarrUnit, data: TtsData, token: number, startWord: number): Promise<void> {
    const starts = alignWords(unit.tokens, data.words)
    return new Promise((resolve, reject) => {
      const audio = new Audio(PHONE ? '' : `/api/tts/audio/${data.id}.mp3`)
      this.audio = audio
      audio.playbackRate = this.state.rate
      audio.preservesPitch = true
      if (startWord > 0) audio.currentTime = starts[startWord] ?? 0   // set before the metadata loads, it becomes the start position
      let started = false
      const tick = () => {
        if (token !== this.session) return
        const t = audio.currentTime
        let w = -1
        for (let k = 0; k < starts.length; k++) {
          if (starts[k] <= t + 0.02) w = k
          else break
        }
        if (w !== this.state.word) this.set({ word: w })
        this.raf = requestAnimationFrame(tick)
      }
      audio.onended = () => { cancelAnimationFrame(this.raf); resolve() }
      audio.onerror = () => { cancelAnimationFrame(this.raf); reject(new Error('audio error')) }
      const begin = () => {
        started = true
        if (token !== this.session) return
        if (this.state.message) this.set({ message: '' })   // the neural voice is back, so the fallback note is stale
        if (this.state.status === 'paused') audio.pause()
        else this.set({ status: 'playing' })
        this.raf = requestAnimationFrame(tick)
        this.prefetchNext(this.state.index)
      }
      audio.play().then(begin, (e: unknown) => {
        if (started) return
        // A Pause during the start aborts play(). The audio is fine, so carry on as if it had started.
        if (e instanceof DOMException && e.name === 'AbortError') return begin()
        // Autoplay blocked or a decode failure: treat it as unavailable only if it never started.
        reject(e instanceof Error ? e : new Error('audio play failed'))
      })
    })
  }

  private speak(unit: NarrUnit, token: number, fromWord: number): Promise<void> {
    return new Promise((resolve) => {
      const base = fromWord > 0 && unit.tokens[fromWord] ? unit.tokens[fromWord].start : 0
      const u = new SpeechSynthesisUtterance(unit.text.slice(base))
      u.lang = 'en-GB'
      u.rate = this.state.rate
      const v = pickVoice()
      if (v) u.voice = v
      u.onstart = () => {
        if (token === this.session) {
          if (this.state.status === 'paused') speechSynthesis.pause()
          else this.set({ status: 'playing' })
        }
        this.prefetchNext(this.state.index)
      }
      u.onboundary = (e) => {
        if (token !== this.session) return
        if (e.name && e.name !== 'word') return
        const w = tokenAtChar(unit.tokens, e.charIndex + base)
        if (w !== this.state.word) this.set({ word: w })
      }
      u.onend = () => resolve()
      u.onerror = () => resolve()
      this.utter = u   // hold a reference: some engines drop events if the utterance is collected
      speechSynthesis.cancel()
      speechSynthesis.speak(u)
    })
  }
}
