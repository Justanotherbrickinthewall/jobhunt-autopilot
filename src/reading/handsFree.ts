import { phoneAudio } from '../learn/engine/handsfree.ts'
import { textHash } from '../learn/engine/text.ts'
import type { PrepQuestion } from '../data/prepTypes.ts'
import { pickVoice } from './narration.ts'
import { lexInline, plain as plainTokens } from './render.tsx'

const PHONE = import.meta.env.VITE_PHONE === '1'
let current: SpeechSynthesisUtterance | null = null   // some engines drop events if the utterance is collected
let epoch = 0                                         // bumped by stopSpeech, so a clip still loading is dropped
let release: (() => void) | null = null               // ends the clip now playing

type Clips = { clips: Record<string, { id: string }> } | null
let manifest: Promise<Clips> | undefined              // a miss is remembered too

/** Plays the pre-built clip for this exact text. False means there is none, so the caller uses the system voice. */
async function playClip(text: string, rate: number): Promise<boolean> {
  const mine = epoch
  try {
    manifest ??= fetch(`${import.meta.env.BASE_URL}audio/prep.json`).then((r) => (r.ok ? (r.json() as Promise<Clips>) : null), () => null)
    const clip = (await manifest)?.clips[textHash(text)]
    if (!clip) return false
    const res = await fetch(`${import.meta.env.BASE_URL}audio/${clip.id}.mp3`)   // a blob, because Safari cannot play a Range answer from the service worker cache
    if (!res.ok) return false
    const blob = await res.blob()
    if (mine !== epoch) return true
    const url = URL.createObjectURL(blob)
    const a = phoneAudio()
    return await new Promise<boolean>((resolve) => {
      const done = (ok: boolean) => {
        a.removeEventListener('ended', end); a.removeEventListener('error', fail)
        release = null
        URL.revokeObjectURL(url)
        resolve(ok)
      }
      const end = () => done(true)
      const fail = () => done(false)
      a.addEventListener('ended', end); a.addEventListener('error', fail)
      release = end
      a.src = url
      a.playbackRate = rate   // after src, which resets it
      a.play().catch(fail)
    })
  } catch { return false }
}

/** Stops whatever hands-free is saying, clip or system voice, and settles the pending say(). */
export function stopSpeech(): void {
  epoch++
  if (PHONE) phoneAudio().pause()
  release?.()
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

/** Speaks one utterance and resolves when it ends or fails. It never cancels. */
export function say(text: string, rate: number): Promise<void> {
  const mine = epoch
  // One at a time, so the tap's intro clip cannot overlap the first line. A call made before a stop is dropped.
  return (tail = tail.then(() => (mine === epoch ? speak(text, rate) : undefined)))
}

let tail: Promise<void> = Promise.resolve()

async function speak(text: string, rate: number): Promise<void> {
  if (PHONE && (await playClip(text, rate))) return
  if (typeof speechSynthesis === 'undefined') return
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-GB'
    u.rate = rate
    const v = pickVoice()
    if (v) u.voice = v
    u.onend = () => resolve()
    u.onerror = () => resolve()
    current = u
    speechSynthesis.speak(u)
  })
}

/** Markdown to speakable text. */
export const plain = (md: string): string =>
  plainTokens(lexInline(md)).replace(/^\s*(#+|[-*+>]|\d+\.)\s+/gmu, '').replace(/\s+/gu, ' ').trim()

/** Fixed lines hands-free speaks outside a question's script. They get clips of their own. */
export const HANDS_FREE_INTRO = 'Hands-free.'   // the tap says only this, so it needs no title and one clip serves every section
export const HANDS_FREE_END = 'That is the end of this section.'

/** The strings hands-free speaks for one question, in order. The phone and the build both call this, so the text matches byte for byte. */
export function prepScript(q: PrepQuestion): string[] {
  const out: string[] = ['Next question.', q.question]
  if (q.simple) out.push(q.simple)
  if (q.kind === 'scenario') out.push('What they are testing.', q.testing)
  out.push('The answer.')
  for (const a of q.answer) out.push(a.label, a.text)
  const tip = 'deliveryTip' in q ? q.deliveryTip : undefined
  const focus = [q.remember, q.steer, q.trap && `The trap. ${q.trap}`, tip].filter((x): x is string => !!x)
  if (focus.length) out.push('What to focus on.', ...focus)
  return out.map(plain).filter(Boolean)
}
