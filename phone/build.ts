// Builds the static phone copy into my-phone/dist and runs the scan. Prep's content is public: it is parsed,
// cleaned of pay and written in plain text as prep.json beside index.html.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { SYNC_VERSION, syncKind } from '../src/data/progress-sync.ts'
import { ICONS, renderIcon } from './icons.ts'
import { DIST, walk } from './lib.ts'
import { preparedPrep } from './prep.ts'
import { buildAudio } from './audio.ts'
import { runScan } from './scan.ts'

const SW = `const V = '__VERSION__'
// Every file is fetched at install, so a course never opened online still opens offline. One failed file does not stop the rest.
self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => Promise.allSettled(__FILES__.map((f) => c.add(f))))))
// Clips are named by their content, so the 'audio' cache outlives a publish.
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && k !== 'audio').map((k) => caches.delete(k)))).then(() => self.clients.claim())))
self.addEventListener('fetch', (e) => {
  const r = e.request
  const url = new URL(r.url)
  if (r.method !== 'GET' || url.origin !== location.origin) return
  e.respondWith(url.pathname.includes('/assets/') || url.pathname.endsWith('.mp3') ? cacheFirst(r) : networkFirst(r))
})
async function cacheFirst(r) {
  const hit = await caches.match(r)
  if (hit) return hit
  const res = await fetch(r)
  if (res.ok) (await caches.open(r.url.endsWith('.mp3') ? 'audio' : V)).put(r, res.clone())
  return res
}
async function networkFirst(r) {
  try {
    const res = await fetch(r, { cache: 'no-cache' })
    if (res.ok) (await caches.open(V)).put(r, res.clone())
    return res
  } catch {
    return (await caches.match(r)) ?? (r.mode === 'navigate' ? await caches.match(self.registration.scope) : undefined) ?? Response.error()
  }
}
`

async function main(): Promise<number> {
  const content = preparedPrep()

  await build({ configFile: join(fileURLToPath(new URL('.', import.meta.url)), 'vite.config.ts'), logLevel: 'warn' })

  rmSync(join(DIST, 'prep.enc'), { force: true })
  writeFileSync(join(DIST, 'prep.json'), JSON.stringify(content))
  for (const i of ICONS) writeFileSync(join(DIST, i.name), renderIcon(i.size))
  const icon = (size: number, purpose: string) => ({ src: `icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose })
  writeFileSync(join(DIST, 'manifest.webmanifest'), JSON.stringify({
    name: 'Night reading', short_name: 'Night reading', start_url: './', scope: './', display: 'standalone',
    background_color: '#121513', theme_color: '#121513', icons: [icon(192, 'any'), icon(512, 'any'), icon(512, 'maskable')],
  }))
  // 404.html is a copy of index.html, so a deep link gets the same head tags and the same base path.
  copyFileSync(join(DIST, 'index.html'), join(DIST, '404.html'))
  writeFileSync(join(DIST, '.nojekyll'), '')
  // The laptop's progress, limited to the synced keys, so the phone picks it up on load. The mirror stores each value as JSON text.
  const mirror = join(fileURLToPath(new URL('..', import.meta.url)), 'my-notebook', 'progress.json')
  if (existsSync(mirror)) {
    const all = (JSON.parse(readFileSync(mirror, 'utf8')) as { keys?: Record<string, string> }).keys ?? {}
    const keys: Record<string, unknown> = {}
    // The phone build renames the hunt-board key prefix (vite.config.ts), so the published keys use the phone's name.
    for (const [k, v] of Object.entries(all)) if (syncKind(k)) { try { keys[k.replace('hunt-board', 'night-reading')] = JSON.parse(v) } catch { /* unreadable value left out */ } }
    writeFileSync(join(DIST, 'progress.json'), JSON.stringify({ v: SYNC_VERSION, at: new Date().toISOString(), keys }))
    console.log(`Progress: wrote ${Object.keys(keys).length} keys to progress.json.`)
  } else console.log('Progress: my-notebook/progress.json not found, nothing published.')
  await buildAudio(content)
  // The service worker opens the app offline. HTML and prep.json come from the network when online, hashed assets from the cache.
  // The cache name is the hash of the built index.html, so a publish retires every older cache.
  const version = createHash('sha256').update(readFileSync(join(DIST, 'index.html'))).digest('hex').slice(0, 12)
  const files = ['./', ...walk(DIST).map((f) => relative(DIST, f)).filter((f) => f !== 'sw.js' && f !== '404.html' && !f.endsWith('.mp3'))]   // mp3s are cached when first played
  writeFileSync(join(DIST, 'sw.js'), SW.replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files)))

  return runScan()
}

process.exitCode = await main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); return 1 })
