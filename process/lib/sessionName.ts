// Session folder names, shared by constants.ts and the dashboard.
// Both forms parse: 13Oct2026-1155-hunt, and the older 2026-10-12-1408-hunt. The time is optional
// (12Oct2026-restructure, 2026-10-12-restructure), and so is the serial.
const PARTS =
  '(?:(?<d1>\\d{2})(?<mon>[A-Z][a-z]{2})(?<y1>\\d{4})|(?<y2>\\d{4})-(?<m2>\\d{2})-(?<d2>\\d{2}))' +
  '(?:-(?<hm>\\d{4}))?(?:-(?<serial>\\d{1,2}))?-(?<kind>[a-z]+)'
// Python's $ also matches before one trailing newline.
export const SESSION_PARTS = new RegExp('^' + PARTS + '\\n?(?![\\s\\S])', 'u')

export interface SessionStamp { date: string; time: string; kind: string }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// '12Oct2026-1408-hunt' and '2026-10-13-1155-hunt' -> { date: '2026-10-13', time: '11:55', kind: 'hunt' }
export function sessionStamp(name: string): SessionStamp | null {
  const m = SESSION_PARTS.exec(name)
  if (!m?.groups?.hm) return null
  const g = m.groups
  const date = g.y1
    ? `${g.y1}-${String(MONTHS.indexOf(g.mon) + 1).padStart(2, '0')}-${g.d1}`
    : `${g.y2}-${g.m2}-${g.d2}`
  return { date, time: `${g.hm.slice(0, 2)}:${g.hm.slice(2)}`, kind: g.kind ?? '' }
}
