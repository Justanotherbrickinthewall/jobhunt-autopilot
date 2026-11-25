// Merges a progress block copied from the phone into the running dashboard. Usage: npm run phone:merge -- <file>, or pipe the text in.
// It only posts to the server, which is the one writer of my-notebook/.
import { readFileSync } from 'node:fs'

const file = process.argv[2]
const text = readFileSync(file ?? 0, 'utf8')
const json = text.split('\n').find((l) => l.startsWith('{'))
if (!json) { console.error('No progress data found. The block should have a line that starts with {.'); process.exit(1) }

const port = Number(process.env.HUNT_SERVER_PORT) || 7003
let res: Response
try {
  res = await fetch(`http://127.0.0.1:${port}/api/progress/merge`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: json })
} catch {
  console.error('The dashboard server is not running. Start it with `npm run dev`, then run this again.')
  process.exit(1)
}
const out = (await res.json().catch(() => ({}))) as { changed?: number; ignored?: number; error?: string }
if (!res.ok) { console.error(`Not merged: ${out.error ?? res.statusText}`); process.exit(1) }
console.log(`Merged. ${out.changed} keys changed, ${out.ignored} ignored.`)
