// Which questions the candidate has marked practised. Browser storage only, so it also serves the phone build.
import { writeKey } from '../reading/storage.ts'

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// Versioned so a later change of shape starts clean instead of misreading old data.
const KEY = 'hunt-board:prep-practised:v2'
const OLD_PREFIX = 'hunt-board:prep-practised:v1:'

// v1 was keyed by profile folder name. If v2 is absent, take the value of any one v1 key.
function readRaw(): string | null {
  try {
    const own = localStorage.getItem(KEY)
    if (own !== null) return own
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(OLD_PREFIX)) return localStorage.getItem(k)
    }
  } catch { /* storage unavailable */ }
  return null
}

export function loadPractised(): ReadonlySet<string> {
  try {
    const raw: unknown = JSON.parse(readRaw() ?? '{}')
    return new Set(isObj(raw) ? Object.keys(raw).filter((k) => raw[k] === true) : [])
  } catch { return new Set() }
}

// Written through the mirrored store, so the ticks also land in my-notebook/progress.json.
export function savePractised(ids: ReadonlySet<string>): void {
  writeKey(KEY, Object.fromEntries([...ids].map((i) => [i, true])))
}
