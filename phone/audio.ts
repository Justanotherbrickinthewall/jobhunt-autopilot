// Neural read-aloud audio for the phone copy. `node phone/audio.ts --warm` only fills my-notebook/tts-cache and is safe to stop and rerun.
// `--dry` only counts, `--limit N` keeps the first N Prep questions and the trial chapter (a smoke test). The build calls buildAudio, which
// reads the cache (fast when warm), copies the mp3s into dist/audio and writes the manifests. Units come from the phone's own Vite pipeline.
import { copyFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { ttsFor } from '../server/tts.ts'
import type { PrepContent, PrepQuestion } from '../src/data/prepTypes.ts'
import { DIST, walk } from './lib.ts'
import { preparedPrep } from './prep.ts'

const TRIAL = 'learn-01-mental-models'
const AUDIO_COURSES = [1, 2, 8, 3, 4, 5]   // by `order` in src/learn/content/courses.ts; recorded in this order
const VOICE = 'en-GB-RyanNeural'
const AT_ONCE = 5
const MAX_TEXT = 5000             // server/tts.ts
const KB_PER_WORD = 2.3
const DIST_LIMIT_MB = 900         // GitHub Pages allows 1 GB
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CACHE = join(ROOT, 'my-notebook/tts-cache')

type Unit = { key: string; text: string }
type Course = { id: string; title: string; order: number }
type Chapter = { id: string; course: string }
type Group = { label: string; order: number; id: string; title: string; chapters: { id: string; units: Unit[] }[] }
type Result = { id: string; words: unknown }
type Plan = { groups: Group[]; prep: { questions: number; texts: Map<string, string>; tooLong: number; words: number }; texts: Set<string> }

const wordCount = (s: string) => s.split(/\s+/u).filter(Boolean).length
const mb = (bytes: number) => (bytes / 1e6).toFixed(1)

async function makePlan(prep: PrepContent, limit: number): Promise<{ plan: Plan; hash: (s: string) => string; close: () => Promise<void> }> {
  const vite = await createServer({ configFile: join(ROOT, 'phone/vite.config.ts'), server: { middlewareMode: true, watch: null }, appType: 'custom', logLevel: 'error' })
  const load = <T>(p: string) => vite.ssrLoadModule(join(ROOT, p)) as Promise<T>
  const { buildUnits, textHash } = await load<{ buildUnits: (c: unknown) => Unit[]; textHash: (s: string) => string }>('src/learn/engine/text.ts')
  const { courses, chapters, getChapter } = await load<{ courses: Course[]; chapters: Chapter[]; getChapter: (id: string) => unknown }>('src/learn/content/courses.ts')
  const { prepScript, HANDS_FREE_INTRO, HANDS_FREE_END } = await load<{ prepScript: (q: PrepQuestion) => string[]; HANDS_FREE_INTRO: string; HANDS_FREE_END: string }>('src/reading/handsFree.ts')
  const { drillable } = await load<{ drillable: (t: unknown) => PrepQuestion[] }>('src/data/prepRecall.ts')

  const ids = [TRIAL]
  if (!limit) for (const order of AUDIO_COURSES) { const c = courses.find((x) => x.order === order); if (c) ids.push(...chapters.filter((ch) => ch.course === c.id).map((ch) => ch.id)) }
  const groups: Group[] = []
  const texts = new Set<string>()
  for (const id of [...new Set(ids)]) {
    const chapter = getChapter(id) as Chapter | undefined
    if (!chapter) { console.log(`Audio: chapter ${id} not found, skipped.`); continue }
    const course = courses.find((c) => c.id === chapter.course)!
    let g = groups.find((x) => x.id === course.id)
    if (!g) groups.push(g = { label: `course ${course.order}`, order: course.order, id: course.id, title: course.title, chapters: [] })
    const units = buildUnits(chapter).filter((u) => u.text.trim())
    g.chapters.push({ id, units })
    for (const u of units) texts.add(u.text)
  }

  // Prep: the same content as dist/prep.json, one clip per distinct string.
  const questions = prep.tabs.flatMap((t) => drillable(t)).slice(0, limit || Infinity)
  const all = [HANDS_FREE_INTRO, HANDS_FREE_END, ...questions.flatMap(prepScript)]
  const ptexts = new Map<string, string>()
  let tooLong = 0, words = 0
  for (const t of new Set(all)) {
    if (t.length > MAX_TEXT) { tooLong++; continue }
    ptexts.set(t, textHash(t)); words += wordCount(t); texts.add(t)
  }
  return { plan: { groups, prep: { questions: questions.length, texts: ptexts, tooLong, words }, texts }, hash: textHash, close: () => vite.close() }
}

// Cached clips come back at once. A clip that still fails after three retries is counted, not fatal.
async function synthesise(texts: Set<string>, log: boolean): Promise<{ done: Map<string, Result>; failed: number }> {
  const queue = [...texts]
  const done = new Map<string, Result>()
  let failed = 0, n = 0
  const start = Date.now()
  const worker = async () => {
    for (let t = queue.shift(); t !== undefined; t = queue.shift()) {
      for (let attempt = 0; ; attempt++) {
        try { const r = await ttsFor(t, VOICE); done.set(t, r); break } catch (e) {
          if (attempt >= 3) { failed++; if (log) console.log(`  failed: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`); break }
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
        }
      }
      if (log && ++n % 100 === 0) console.log(`  ${n} / ${texts.size} done, ${failed} failed, ${Math.round((Date.now() - start) / 1000)} s`)
    }
  }
  await Promise.all(Array.from({ length: AT_ONCE }, worker))
  return { done, failed }
}

const sizeOf = (id: string) => statSync(join(CACHE, `${id}.mp3`)).size

function summary(plan: Plan, done: Map<string, Result> | null, failed: number): number {
  const rows: string[][] = [['', 'id', 'title', 'chapters', 'units', 'words', 'MB']]
  let total = 0
  const size = (texts: Iterable<string>, words: number) => {
    if (!done) return words * KB_PER_WORD * 1000
    const seen = new Set<string>()
    let b = 0
    for (const t of texts) { const r = done.get(t); if (r && !seen.has(r.id)) { seen.add(r.id); b += sizeOf(r.id) } }
    return b
  }
  for (const g of plan.groups.sort((a, b) => a.order - b.order)) {
    const units = g.chapters.flatMap((c) => c.units)
    const words = units.reduce((n, u) => n + wordCount(u.text), 0)
    const b = size(units.map((u) => u.text), words)
    total += b
    rows.push([g.label, g.id, g.title.slice(0, 40), String(g.chapters.length), String(units.length), String(words), mb(b)])
  }
  const pb = size(plan.prep.texts.keys(), plan.prep.words)
  total += pb
  rows.push(['prep', `${plan.prep.questions} questions`, `${plan.prep.tooLong} too long`, '', `${plan.prep.texts.size} clips`, String(plan.prep.words), mb(pb)])
  const w = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)))
  for (const r of rows) console.log(r.map((c, i) => c.padEnd(w[i])).join('  '))
  console.log(`Total ${mb(total)} MB${done ? '' : ' (estimate)'}, ${plan.texts.size} clips, ${failed} failed.`)
  return failed
}

/** Build step: reads the cache (synthesises what is missing), copies the mp3s into dist/audio and writes the manifests. */
export async function buildAudio(prep: PrepContent): Promise<void> {
  const { plan, hash, close } = await makePlan(prep, 0)
  try {
    const { done, failed } = await synthesise(plan.texts, false)
    const out = join(DIST, 'audio')
    mkdirSync(out, { recursive: true })
    const copied = new Set<string>()
    const copy = (id: string) => { if (!copied.has(id)) { copied.add(id); copyFileSync(join(CACHE, `${id}.mp3`), join(out, `${id}.mp3`)) } }
    for (const g of plan.groups) for (const c of g.chapters) {
      const units: Record<string, { id: string; words: unknown; textHash: string }> = {}
      for (const u of c.units) { const r = done.get(u.text); if (r) { copy(r.id); units[u.key] = { id: r.id, words: r.words, textHash: hash(u.text) } } }
      writeFileSync(join(out, `${c.id}.json`), JSON.stringify({ voice: VOICE, units }))
    }
    // Two different strings with the same 32-bit hash would play each other's clip, so neither gets one.
    const clips: Record<string, { id: string }> = {}
    const clash = new Set<string>()
    for (const [t, h] of plan.prep.texts) { const r = done.get(t); if (!r) continue; if (h in clips) clash.add(h); else { clips[h] = { id: r.id }; copy(r.id) } }
    for (const h of clash) delete clips[h]
    writeFileSync(join(out, 'prep.json'), JSON.stringify({ voice: VOICE, clips }))
    const bytes = walk(out).reduce((n, f) => n + statSync(f).size, 0)
    const distBytes = walk(DIST).reduce((n, f) => n + statSync(f).size, 0)
    console.log(`Audio: ${copied.size} clips, ${mb(bytes)} MB in dist/audio; ${failed} clips could not be made and ${clash.size} Prep hashes clash, so the phone reads those with the system voice. dist is ${mb(distBytes)} MB.`)
    if (distBytes > DIST_LIMIT_MB * 1e6) throw new Error(`The phone copy is ${mb(distBytes)} MB, over the ${DIST_LIMIT_MB} MB limit (GitHub Pages allows 1 GB). Cut AUDIO_COURSES in phone/audio.ts.`)
  } finally {
    await close()
  }
}

async function cli(): Promise<number> {
  const args = process.argv.slice(2)
  const dry = args.includes('--dry')
  const limit = Number(args[args.indexOf('--limit') + 1]) || 0
  if (!dry && !args.includes('--warm')) { console.log('Usage: node phone/audio.ts --warm | --dry [--limit N]'); return 2 }
  const { plan, close } = await makePlan(preparedPrep(), limit)
  try {
    if (dry) return summary(plan, null, 0) && 1
    console.log(`Recording ${plan.texts.size} clips, ${AT_ONCE} at a time. Cached clips are skipped.`)
    const { done, failed } = await synthesise(plan.texts, true)
    return summary(plan, done, failed) > 0 ? 1 : 0
  } finally {
    await close()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = await cli().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); return 1 })
