// The build for the static phone copy. It has its own entry (src/phone/main.tsx), so nothing that reads local data
// through import.meta.glob is pulled in by App.tsx. Three plugins keep private data out of the bundle:
// the stand-ins replace the two shared modules that reach it, the lab stripper removes local paths from chapter
// content, and the guard fails the build if anything under a private folder is loaded anyway.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import ts from 'typescript'
import { defineConfig, type Plugin } from 'vite'
import { scopeLearnCss } from '../vite.config.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PRIVATE = ['my-profile', 'my-sessions', 'my-applications', 'my-interviews', 'my-notebook', 'my-learn']
const IN_PRIVATE = new RegExp(`(?:^|/)(?:${PRIVATE.join('|')})(?:/|$)`, 'u')
const NAMES = new RegExp(`${PRIVATE.join('|')}|fde-roadmap`, 'u')
const GLOB_AT_PRIVATE = new RegExp(`import\\.meta\\.glob\\s*(?:<[^>]*>)?\\s*\\([^)]*(?:${PRIVATE.join('|')})`, 'u')

const guard: Plugin = {
  name: 'phone-guard',
  enforce: 'pre',
  resolveId(source) {
    if (IN_PRIVATE.test(source.split('?')[0])) throw new Error(`Phone build: an import reaches a private folder (${source.split('?')[0]}).`)
    return null
  },
  load(id) {
    if (IN_PRIVATE.test(id.split('?')[0])) throw new Error(`Phone build: a module under a private folder was loaded (${id.split('?')[0]}).`)
    return null
  },
  transform(code, id) {
    // A glob rooted at a private folder would match nothing from this root, and the app would build empty without a word.
    if (GLOB_AT_PRIVATE.test(code)) throw new Error(`Phone build: ${id.split('?')[0]} globs a private folder.`)
    return null
  },
  generateBundle(_o, bundle) {
    for (const f of Object.values(bundle)) {
      if (f.type === 'chunk' && f.moduleIds.some((m) => IN_PRIVATE.test(m))) throw new Error(`Phone build: chunk ${f.fileName} holds a private module.`)
      if (f.type === 'asset') {
        if ((f.originalFileNames ?? []).some((n) => IN_PRIVATE.test(n))) throw new Error(`Phone build: asset ${f.fileName} came from a private folder.`)
        if (typeof f.source === 'string' && NAMES.test(f.source)) throw new Error(`Phone build: asset ${f.fileName} names a private folder.`)
      }
    }
  },
}

// Shared modules that read local data get a stand-in here, by path, whoever imports them.
const STAND_INS = new Map([
  [`${ROOT}/src/data/prep.ts`, `${ROOT}/src/phone/standins/prep.ts`],
  [`${ROOT}/src/data/links.ts`, `${ROOT}/src/phone/standins/links.ts`],
  [`${ROOT}/src/components/Rail.tsx`, `${ROOT}/src/phone/standins/rail.tsx`],
])
const standIns: Plugin = {
  name: 'phone-standins',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (!importer || !/\/(?:prep|links|Rail)(?:\.tsx?)?$/u.test(source)) return null
    const r = await this.resolve(source, importer, { ...options, skipSelf: true })
    return r ? STAND_INS.get(r.id) ?? null : null
  },
}

// Chapter content carries a `lab` field and some lab prose, both with local folder paths. The phone hides labs, so the
// field is cut from the source, then any content block that still names a private folder is cut whole.
// A string that names one outside a block stops the build, so nothing is left to the scan to find.
const CHAPTER = /\/src\/learn\/content\/[^/]+\/ch[^/]*\.ts$/u
const INTERVIEW = /\/src\/learn\/content\/interview\/[^/]+\.ts$/u
const parse = (code: string, id: string) => ts.createSourceFile(id, code, ts.ScriptTarget.ESNext, true)
const cutOut = (code: string, cuts: [number, number][]) => cuts.sort((x, y) => y[0] - x[0]).reduce((out, [a, b]) => out.slice(0, a) + out.slice(b), code)
const withComma = (code: string, end: number) => (code[end] === ',' ? end + 1 : end)

// Captured output in Learn carries the author's local time zone offset. It is rewritten to the same instant in UTC.
const STAMP = /(\d{4})-(\d\d)-(\d\d)([T ])(\d\d):(\d\d):(\d\d)(\.\d+)?(\s?)([+-])(0\d|1[0-4])(:?)([0-5]\d)(?!\d)/gu
const two = (n: number) => String(n).padStart(2, '0')
const utc = (code: string): string => code.replace(STAMP, (all, y, mo, d, sep, h, mi, sec, frac, sp, sign, oh, colon, om) => {
  const offset = (sign === '-' ? -1 : 1) * (Number(oh) * 60 + Number(om))
  if (offset === 0) return all
  const t = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(sec)) - offset * 60_000)
  return `${t.getUTCFullYear()}-${two(t.getUTCMonth() + 1)}-${two(t.getUTCDate())}${sep}${two(t.getUTCHours())}:${two(t.getUTCMinutes())}:${two(t.getUTCSeconds())}${frac ?? ''}${sp}+00${colon}00`
})
// date_trunc('day', ...) prints midnight in the server's zone. A UTC server prints midnight at zero offset, so those rows
// keep their date and lose the offset. A row after one that is not midnight stops the build.
const DAY_ROWS = /date_trunc\('day'[\s\S]*?(?="kind"|$)/gu
const midnight = (code: string, id: string): string => code.replace(DAY_ROWS, (seg) => seg.replace(STAMP, (_all, y, mo, d, sep, h, mi, sec, frac, sp, _s, _oh, colon) => {
  if (h !== '00' || mi !== '00' || sec !== '00') throw new Error(`Phone build: ${id} has a date_trunc('day') row that is not midnight.`)
  return `${y}-${mo}-${d}${sep}00:00:00${frac ?? ''}${sp}+00${colon}00`
}))
const timeZone: Plugin = {
  name: 'phone-utc',
  enforce: 'pre',
  transform(code, id) {
    const p = id.split('?')[0]
    if (!p.startsWith(`${ROOT}/src/learn/`) || !/\.tsx?$/u.test(p)) return null
    const out = utc(midnight(code, p))
    return out === code ? null : { code: out, map: null }
  },
}

// The dashboard's prefix for browser keys says what the dashboard is, so the phone build swaps it in every module.
const neutralKeys: Plugin = {
  name: 'phone-keys',
  enforce: 'pre',
  transform(code, id) {
    const p = id.split('?')[0]
    return p.startsWith(`${ROOT}/src/`) && code.includes('hunt-board') ? { code: code.replaceAll('hunt-board', 'night-reading'), map: null } : null
  },
}

// Rules of src/styles.css for screens the phone does not have. A class counts as live when a word in a reachable
// source file is that class, or a prefix of it that a template string completes. Reachable means the
// import graph from the phone entry, plus all of Learn, the reading layer and the phone shell.
function reachableWords(): Set<string> {
  const files = new Set<string>()
  const walkDir = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = resolve(d, e.name); if (e.isDirectory()) walkDir(p); else if (/\.tsx?$/u.test(e.name)) files.add(p) } }
  for (const d of ['learn', 'reading', 'phone']) walkDir(resolve(ROOT, 'src', d))
  const queue = [resolve(ROOT, 'src/phone/main.tsx'), ...files]
  const done = new Set<string>()
  while (queue.length > 0) {
    const f = queue.pop() as string
    const real = STAND_INS.get(f) ?? f
    if (done.has(real)) continue
    done.add(real)
    for (const m of readFileSync(real, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/gu)) {
      const base = resolve(dirname(real), m[1])
      const hit = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'].map((x) => base + x).find((x) => /\.tsx?$/u.test(x) && existsSync(x) && statSync(x).isFile())
      if (hit) queue.push(hit)
    }
  }
  const words = new Set<string>()
  // Only components name classes. Course text and route tables are prose that would keep a class named like a word alive.
  for (const f of done) {
    const src = readFileSync(f, 'utf8')
    if (f.endsWith('.tsx')) for (const w of src.matchAll(/[\w-]+/gu)) words.add(w[0])
    // A .ts file also names classes, but only in these calls. Its other words are routes and labels, such as "retro".
    else if (!f.includes('/src/learn/content/')) for (const c of src.matchAll(/(?:classList\.(?:add|remove|toggle)|className\s*\+?=)\s*\(?\s*(['"`])([^'"`]+)\1/gu)) for (const w of c[2].split(/\s+/u)) words.add(w)
  }
  return words
}

const deadCss = {
  postcssPlugin: 'phone-dead-css',
  Once(root: any) {
    if (!String(root.source?.input?.file ?? '').endsWith('/src/styles.css')) return
    const words = reachableWords()
    const prefixes = [...words].filter((w) => /^[a-z][\w-]*-$/u.test(w))   // `tone-${x}` leaves the word "tone-"
    const live = (c: string) => words.has(c) || prefixes.some((w) => c.startsWith(w))
    root.walkRules((rule: any) => {
      const keep: string[] = rule.selectors.filter((sel: string) => [...sel.replace(/:not\([^)]*\)/gu, '').matchAll(/\.(-?[A-Za-z_][\w-]*)/gu)].every((m) => live(m[1])))
      if (keep.length === 0) rule.remove()
      else if (keep.length < rule.selectors.length) rule.selectors = keep
    })
    root.walkAtRules((a: any) => { if (Array.isArray(a.nodes) && a.nodes.length === 0 && !/font-face|layer/u.test(a.name)) a.remove() })
  },
}

const stripLabs: Plugin = {
  name: 'phone-strip-labs',
  enforce: 'pre',
  transform(code, id) {
    const path = id.split('?')[0]
    if (INTERVIEW.test(path)) {
      // `source: "asked"` puts a chip and a filter in the question bank that say the question came from a real interview.
      const cuts: [number, number][] = []
      const find = (n: ts.Node) => {
        if (ts.isPropertyAssignment(n) && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) && n.name.text === 'source' && ts.isStringLiteral(n.initializer)) { cuts.push([n.getFullStart(), withComma(code, n.getEnd())]); return }
        ts.forEachChild(n, find)
      }
      find(parse(code, id))
      return cuts.length > 0 ? { code: cutOut(code, cuts), map: null } : null
    }
    if (!CHAPTER.test(path)) return null
    const labs: [number, number][] = []
    const findLabs = (n: ts.Node) => {
      // `reinforcement` is a note to paste into an assistant's memory file, and it opens with a career sentence.
      if (ts.isPropertyAssignment(n) && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) && (n.name.text === 'lab' || n.name.text === 'reinforcement')) { labs.push([n.getFullStart(), withComma(code, n.getEnd())]); return }
      ts.forEachChild(n, findLabs)
    }
    findLabs(parse(code, id))
    const noLabs = cutOut(code, labs)
    const blocks = new Map<number, [number, number]>()
    const findNames = (n: ts.Node) => {
      if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) && NAMES.test(n.text)) {
        let up: ts.Node | undefined = n
        while (up && !(ts.isObjectLiteralExpression(up) && up.parent && ts.isArrayLiteralExpression(up.parent) && up.parent.elements.length > 0)) up = up.parent
        if (!up) throw new Error(`Phone build: ${id.split('?')[0]} names a private folder outside a content block.`)
        blocks.set(up.getFullStart(), [up.getFullStart(), withComma(noLabs, up.getEnd())])
        return
      }
      ts.forEachChild(n, findNames)
    }
    findNames(parse(noLabs, id))
    const cutBlocks = cutOut(noLabs, [...blocks.values()])
    return cutBlocks === code ? null : { code: cutBlocks, map: null }
  },
}

// Learn files whose markup depends on fields the build strips. The reinforcement block cannot render without its field,
// and the question bank's "real interview" wording has no question left to show. Each edit must find its text.
const LEARN_EDITS: [string, RegExp, string][] = [
  [`${ROOT}/src/learn/pages/Chapter.tsx`, /<div className="reinforce">[\s\S]*?label="Copy paragraph" \/>\s*<\/div>/u, ''],
  [`${ROOT}/src/learn/Bank.tsx`, /Asked in a real interview/gu, 'Marked'],
  [`${ROOT}/src/learn/components/interview/PhonePractice.tsx`, /Asked in a real interview/gu, 'Marked'],
  [`${ROOT}/src/learn/components/interview/Practice.tsx`, /Asked in a real interview/gu, 'Marked'],
]
const learnSource: Plugin = {
  name: 'phone-learn-source',
  enforce: 'pre',
  transform(code, id) {
    const edit = LEARN_EDITS.filter(([f]) => f === id.split('?')[0])
    if (edit.length === 0) return null
    let out = code
    for (const [f, re, to] of edit) {
      const next = out.replace(re, to)
      if (next === out) throw new Error(`Phone build: ${f.replace(`${ROOT}/`, '')} no longer holds the text the phone edit expects.`)
      out = next
    }
    return { code: out, map: null }
  },
}

export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  base: process.env.PHONE_BASE ?? '/night-reading/',
  publicDir: false,
  plugins: [guard, standIns, neutralKeys, timeZone, stripLabs, learnSource, react()],
  css: { postcss: { plugins: [...(scopeLearnCss as { plugins: unknown[] }).plugins, deadCss] } as never },
  define: { 'import.meta.env.VITE_PHONE': JSON.stringify('1') },
  esbuild: { legalComments: 'none' },
  build: {
    outDir: resolve(ROOT, 'my-phone/dist'),
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 4000,
    rollupOptions: { output: { manualChunks: (id: string) => (/node_modules\/(?:react|react-dom|scheduler)\//u.test(id) ? 'vendor' : undefined) } },
  },
})
