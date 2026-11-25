// The narration and karaoke controller. Plain TypeScript, no React.
import { getHandsFree, phoneAudio, unlockAudio } from "./handsfree.ts";
// Neural voice: POST /api/tts. Fallback: speechSynthesis with boundary events.
import { getNarrationSettings, saveNarrationSettings, type NarrationSettings } from "./settings.ts";
import { alignWords, textHash, tokenAtChar, type NarrUnit, type TimedWord } from "./text.ts";

const PHONE = import.meta.env.VITE_PHONE === "1";

// The phone's pre-built neural audio: audio/<chapterId>.json maps a unit key to its mp3 and word timings. A miss is remembered.
type Manifest = { units: Record<string, TtsData & { textHash: string }> };
const manifests = new Map<string, Promise<Manifest | null>>();
const loadManifest = (chapterId: string): Promise<Manifest | null> => {
  let p = manifests.get(chapterId);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}audio/${chapterId}.json`).then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null), () => null);
    manifests.set(chapterId, p);
  }
  return p;
};

export type NarrStatus = "idle" | "loading" | "playing" | "paused";

export type NarrState = {
  status: NarrStatus;
  index: number; // current unit, -1 when none
  word: number; // current word inside the unit, -1 before the first word
  total: number;
  rate: number;
  source: NarrationSettings["source"];
  follow: boolean;
  message: string | null;
};

// POST /api/tts returns {id, words}; the audio is at /api/tts/audio/<id>.mp3.
type TtsData = { id: string; words: TimedWord[] };

export class NarrationController {
  private units: NarrUnit[] = [];
  private state: NarrState;
  private listeners = new Set<() => void>();
  private session = 0;
  private audio: HTMLAudioElement | null = null;
  private raf = 0;
  private utter: SpeechSynthesisUtterance | null = null;
  private prefetchCache = new Map<string, Promise<TtsData>>();
  private serverDownUntil = 0;
  private voice: string;
  private chapterId = "";
  private blobUrl: string | null = null;
  private phoneUnits = new Map<string, Promise<{ data: TtsData; blob: Blob }>>();
  /** Called once when the last unit finishes on its own. Never from stop(). */
  onEnd: (() => void) | null = null;

  constructor() {
    const s = getNarrationSettings();
    this.voice = s.voice;
    // The phone build has no server, so it always speaks with the browser's own voice.
    this.state = { status: "idle", index: -1, word: -1, total: 0, rate: s.rate, source: import.meta.env.VITE_PHONE === "1" ? "system" : s.source, follow: s.follow, message: null };
  }

  // ---- store plumbing ----
  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };
  getState = (): NarrState => this.state;
  private set(patch: Partial<NarrState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  /** Active word for a block key, or null when the block is not current. */
  activeWord = (key: string): number | null => {
    const u = this.units[this.state.index];
    return u && u.key === key ? this.state.word : null;
  };

  // ---- setup ----
  setUnits(units: NarrUnit[], chapterId = ""): void {
    this.stop();
    this.units = units;
    this.chapterId = chapterId;
    this.set({ total: units.length, index: -1, word: -1 });
  }

  // ---- public controls ----
  toggle(): void {
    unlockAudio();
    const { status, index } = this.state;
    if (status === "playing" || status === "loading") return this.pause();
    if (status === "paused" && this.audio && !this.audio.ended) return this.resume();
    if (status === "paused" && this.utter && typeof speechSynthesis !== "undefined" && speechSynthesis.speaking) return this.resume();
    void this.playIndex(index >= 0 ? index : this.firstVisibleIndex());
  }

  pause(): void {
    if (this.state.status === "idle" || this.state.status === "paused") return;
    this.audio?.pause();
    if (typeof speechSynthesis !== "undefined" && this.utter) speechSynthesis.pause();
    this.set({ status: "paused" });
  }

  resume(): void {
    if (this.audio && !this.audio.ended) void this.audio.play();
    else if (this.utter && typeof speechSynthesis !== "undefined") speechSynthesis.resume();
    this.set({ status: "playing" });
  }

  next(): void {
    unlockAudio();
    const i = this.state.index + 1;
    if (i < this.units.length) void this.playIndex(i);
    else this.stop();
  }

  prev(): void {
    unlockAudio();
    const word = this.state.word;
    const i = this.state.index;
    // A second press inside the first few words goes back a block; otherwise restart this one.
    void this.playIndex(i > 0 && word < 3 ? i - 1 : Math.max(0, i));
  }

  playFrom(key: string): void {
    unlockAudio();
    const i = this.units.findIndex((u) => u.key === key);
    if (i >= 0) void this.playIndex(i);
  }

  stop(): void {
    this.session++;
    this.teardown();
    this.set({ status: "idle", index: -1, word: -1 });
  }

  setRate(rate: number): void {
    const r = Math.min(1.6, Math.max(0.8, rate));
    saveNarrationSettings({ rate: r });
    this.set({ rate: r });
    if (this.audio) this.audio.playbackRate = r;
    else if (this.utter && this.state.status !== "idle") void this.playIndex(this.state.index, Math.max(0, this.state.word));
  }

  setSource(source: NarrationSettings["source"]): void {
    if (import.meta.env.VITE_PHONE === "1") return;
    saveNarrationSettings({ source });
    this.set({ source, message: null });
    this.serverDownUntil = 0;
    if (this.state.status === "playing" || this.state.status === "loading") void this.playIndex(this.state.index, Math.max(0, this.state.word));
  }

  setFollow(follow: boolean): void {
    saveNarrationSettings({ follow });
    this.set({ follow });
    if (follow) this.scrollToCurrent();
  }

  // ---- internals ----
  private teardown(): void {
    cancelAnimationFrame(this.raf);
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
    if (this.audio) {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.pause();
      this.audio = null;
    }
    if (typeof speechSynthesis !== "undefined") {
      if (this.utter) {
        this.utter.onend = null;
        this.utter.onerror = null;
        this.utter.onboundary = null;
      }
      speechSynthesis.cancel();
    }
    this.utter = null;
  }

  private firstVisibleIndex(): number {
    for (let i = 0; i < this.units.length; i++) {
      const el = document.querySelector(`[data-narr-key="${CSS.escape(this.units[i].key)}"]`);
      if (el && el.getBoundingClientRect().bottom > 120) return i;
    }
    return 0;
  }

  private scrollToCurrent(): void {
    const u = this.units[this.state.index];
    if (!u || !this.state.follow) return;
    const el = document.querySelector(`[data-narr-key="${CSS.escape(u.key)}"]`);
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }

  private async playIndex(i: number, startWord = 0): Promise<void> {
    const token = ++this.session;
    this.teardown();
    if (i < 0 || i >= this.units.length) return this.stop();
    const unit = this.units[i];
    this.set({ index: i, word: startWord > 0 ? startWord : -1, status: "loading" });
    this.scrollToCurrent();

    let done = false;
    if (this.state.source === "neural" && Date.now() > this.serverDownUntil) {
      try {
        const data = await this.fetchTts(unit);
        if (token !== this.session) return;
        await this.playAudio(unit, data, token);
        done = true;
      } catch {
        if (token !== this.session) return;
        this.serverDownUntil = Date.now() + 30_000;
        this.set({ message: "Neural voice unavailable. Using the system voice." });
      }
    }
    if (token !== this.session) return;
    if (!done && PHONE) {
      try {
        await this.playPhoneAudio(unit, token);
        done = true;
      } catch {
        // No audio for this unit, or it failed: the system voice reads it.
      }
      if (token !== this.session) return;
    }
    if (!done) {
      if (typeof speechSynthesis === "undefined") {
        this.set({ status: "paused", message: "No voice is available in this browser." });
        return;
      }
      await this.speak(unit, token, startWord);
    }
    if (token !== this.session) return;
    if (unit.stopAfter && !getHandsFree()) {   // hands-free reads on past a code step
      this.teardown();
      const nextIdx = i + 1 < this.units.length ? i + 1 : -1;
      this.set({ status: nextIdx >= 0 ? "paused" : "idle", index: nextIdx, word: -1 });
      this.scrollToCurrent();
      return;
    }
    if (i + 1 < this.units.length) void this.playIndex(i + 1);
    else {
      this.set({ status: "idle", index: -1, word: -1 });
      this.onEnd?.();
    }
  }

  private fetchTts(unit: NarrUnit): Promise<TtsData> {
    if (import.meta.env.VITE_PHONE === "1") return Promise.reject(new Error("no neural voice"));
    const key = `${this.voice}|${unit.text}`;
    let p = this.prefetchCache.get(key);
    if (!p) {
      p = (async () => {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: unit.text, voice: this.voice, rate: 1 }),
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) throw new Error(`tts ${res.status}`);
        const data = (await res.json()) as TtsData;
        if (!/^[a-f0-9]{40}$/.test(data.id) || !Array.isArray(data.words)) throw new Error("bad tts reply");
        return data;
      })();
      p.catch(() => this.prefetchCache.delete(key));
      this.prefetchCache.set(key, p);
      if (this.prefetchCache.size > 40) this.prefetchCache.delete(this.prefetchCache.keys().next().value as string);
    }
    return p;
  }

  // The unit's pre-built audio, only when its text is the text the audio was made from.
  private phoneUnit(unit: NarrUnit): Promise<{ data: TtsData; blob: Blob }> {
    const key = `${this.chapterId}|${unit.key}`;
    let p = this.phoneUnits.get(key);
    if (!p) {
      p = (async () => {
        const data = (await loadManifest(this.chapterId))?.units[unit.key];
        if (!data || data.textHash !== textHash(unit.text)) throw new Error("no audio");
        const res = await fetch(`${import.meta.env.BASE_URL}audio/${data.id}.mp3`);   // a blob, because Safari cannot play a Range answer from the service worker cache
        if (!res.ok) throw new Error(`audio ${res.status}`);
        return { data, blob: await res.blob() };
      })();
      p.catch(() => this.phoneUnits.delete(key));
      this.phoneUnits.set(key, p);
      if (this.phoneUnits.size > 4) this.phoneUnits.delete(this.phoneUnits.keys().next().value as string);
    }
    return p;
  }

  private async playPhoneAudio(unit: NarrUnit, token: number): Promise<void> {
    const { data, blob } = await this.phoneUnit(unit);
    if (token !== this.session) return;
    const url = URL.createObjectURL(blob);
    this.blobUrl = url;
    try {
      await this.playAudio(unit, data, token, url);
    } finally {
      if (this.blobUrl === url) {
        URL.revokeObjectURL(url);
        this.blobUrl = null;
      }
    }
  }

  private prefetchNext(i: number): void {
    const next = this.units[i + 1];
    if (PHONE) {
      if (next) this.phoneUnit(next).catch(() => {});
      return;
    }
    if (!next || this.state.source !== "neural" || Date.now() < this.serverDownUntil) return;
    this.fetchTts(next).catch(() => {});
  }

  private playAudio(unit: NarrUnit, data: TtsData, token: number, url?: string): Promise<void> {
    if (PHONE && !url) return Promise.reject(new Error("no neural voice"));
    const starts = alignWords(unit.tokens, data.words);
    return new Promise((resolve, reject) => {
      const audio = PHONE ? phoneAudio() : new Audio(`/api/tts/audio/${data.id}.mp3`);   // PHONE keeps the /api/ path out of the phone bundle
      if (url) audio.src = url;   // before the rate: a new src resets playbackRate
      this.audio = audio;
      audio.playbackRate = this.state.rate;
      audio.preservesPitch = true;
      let started = false;
      const tick = () => {
        if (token !== this.session) return;
        const t = audio.currentTime;
        let w = -1;
        for (let k = 0; k < starts.length; k++) {
          if (starts[k] <= t + 0.02) w = k;
          else break;
        }
        if (w !== this.state.word) this.set({ word: w });
        this.raf = requestAnimationFrame(tick);
      };
      audio.onended = () => {
        cancelAnimationFrame(this.raf);
        resolve();
      };
      audio.onerror = () => {
        cancelAnimationFrame(this.raf);
        reject(new Error("audio error"));
      };
      audio.play().then(
        () => {
          started = true;
          if (token !== this.session) return;
          if (this.state.status === "paused") audio.pause();
          else this.set({ status: "playing" });
          this.raf = requestAnimationFrame(tick);
          this.prefetchNext(this.state.index);
        },
        (e) => {
          // Autoplay blocked or decode failure: treat as unavailable only if it never started.
          if (!started) reject(e);
        },
      );
    });
  }

  private pickVoice(): SpeechSynthesisVoice | undefined {
    const voices = speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang === "en-GB" && v.localService) ??
      voices.find((v) => v.lang.replace("_", "-") === "en-GB") ??
      voices.find((v) => v.lang.startsWith("en") && v.localService) ??
      voices.find((v) => v.lang.startsWith("en"))
    );
  }

  private speak(unit: NarrUnit, token: number, fromWord: number): Promise<void> {
    return new Promise((resolve) => {
      const base = fromWord > 0 && unit.tokens[fromWord] ? unit.tokens[fromWord].start : 0;
      const u = new SpeechSynthesisUtterance(unit.text.slice(base));
      u.lang = "en-GB";
      u.rate = this.state.rate;
      const v = this.pickVoice();
      if (v) u.voice = v;
      u.onstart = () => {
        if (token === this.session) {
          if (this.state.status === "paused") speechSynthesis.pause();
          else this.set({ status: "playing" });
        }
        this.prefetchNext(this.state.index);
      };
      u.onboundary = (e) => {
        if (token !== this.session) return;
        if (e.name && e.name !== "word") return;
        const w = tokenAtChar(unit.tokens, e.charIndex + base);
        if (w !== this.state.word) this.set({ word: w });
      };
      u.onend = () => resolve();
      u.onerror = () => resolve();
      this.utter = u; // hold a reference: some engines drop events if the utterance is collected
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    });
  }
}
