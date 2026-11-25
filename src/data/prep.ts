// Loads the interview-prep JSON for the Prep tab. Files are read as raw text and parsed here, so a broken file
// becomes an entry in `problems` and the rest of the dashboard still renders. The merge itself is in prepParse.ts.
import { buildSources, type PrepSource } from './prepParse.ts'

export * from './prepParse.ts'
export * from './prepPractised.ts'

const files = import.meta.glob<string>('/my-profile/interview-prep/*.json', { eager: true, query: '?raw', import: 'default' })

const PATH = /^\/my-profile\/interview-prep\/([^/]+)\.json$/u

// File stem -> parsed JSON for my-profile/interview-prep/. The example folder is outside the glob.
function load(): { docs: Map<string, unknown>; problems: string[] } {
  const out = { docs: new Map<string, unknown>(), problems: [] as string[] }
  for (const [path, raw] of Object.entries(files)) {
    const m = PATH.exec(path)
    if (!m) continue
    try { out.docs.set(m[1], JSON.parse(raw)) } catch (e) { out.problems.push(`${m[1]}.json: ${e instanceof Error ? e.message : String(e)}`) }
  }
  return out
}

// Computed once when the module loads, so leaving and re-entering the tab costs nothing.
const SOURCES: PrepSource[] = ((): PrepSource[] => { const { docs, problems } = load(); return buildSources(docs, problems) })()
export const loadPrepSources = (): PrepSource[] => SOURCES
