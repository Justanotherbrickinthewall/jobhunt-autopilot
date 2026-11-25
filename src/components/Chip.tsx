import type { ReactNode } from 'react'
import { CircleCheck, CircleDashed, CircleX, Plus, TriangleExclamationPoint, type LucideIcon } from 'lucide-react'
import { label, toneOf, type Tone } from './format.ts'

// The small cells every table and card shares: tags, state labels, the fit bar, avatars and tiles.
// Tone sits only in these, never as a fill on a row or a panel.

// A stable tone for a name, so a company or a person keeps one avatar colour on every screen.
function toneIndex(name: string): number {
  let h = 0
  for (const ch of name.toLowerCase()) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0
  return h % 6
}
const words = (name: string): string[] => name.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean)

// A person: a circle with two initials.
export function Avatar({ name, small }: { name: string; small?: boolean }) {
  const w = words(name)
  const text = (w.length > 1 ? `${w[0][0]}${w[w.length - 1][0]}` : (w[0] ?? '?').slice(0, 2)).toUpperCase()
  return <span className={`avatar av-${toneIndex(name)}${small ? ' small' : ''}`} aria-hidden="true">{text}</span>
}

// A company: a rounded square with one initial. `icon` replaces the initial for a row that is not a company.
export function Tile({ name, icon: Icon }: { name: string; icon?: LucideIcon }) {
  return <span className={`tile av-${toneIndex(name)}`} aria-hidden="true">{Icon ? <Icon size={14} /> : (words(name)[0]?.[0] ?? '?').toUpperCase()}</span>
}

// The plain tag: muted on sunk by default, or status text on its soft fill. A value names the tone and the words.
export function Chip({ value, tone, title, small, children }: { value?: string; tone?: Tone; title?: string; small?: boolean; children?: ReactNode }) {
  return <span className={`tag tone-${tone ?? (value ? toneOf(value) : 'gray')}${small ? ' small' : ''}`} title={title}>{children ?? label(value ?? '')}</span>
}

// The segment tag: a round pill with a dot, for a lane or a source.
export function SegTag({ tone, children, title }: { tone: Tone; children: ReactNode; title?: string }) {
  return <span className={`seg-tag tone-${tone}`} title={title}><span className="dot" aria-hidden="true" />{children}</span>
}

// One icon per board column. A ledger status outside the five falls back to the dashed circle.
const STATE_ICON: Record<string, LucideIcon> = { new: Plus, processing: CircleDashed, held: TriangleExclamationPoint, blocked: TriangleExclamationPoint, applied: CircleCheck, dropped: CircleX }

// The state label: caps in the status tone after an icon. The source text stays in sentence case; CSS sets the caps.
export function StateLabel({ value, tone, icon, title, children }: { value?: string; tone?: Tone; icon?: LucideIcon; title?: string; children?: ReactNode }) {
  const Icon = icon ?? STATE_ICON[value ?? ''] ?? CircleDashed
  return <span className={`state tone-${tone ?? toneOf(value ?? '')}`} title={title}><Icon size={13} aria-hidden="true" />{children ?? label(value ?? '')}</span>
}

// A match score: the figure, then a 48px track filled on a gradient. No score shows a dash.
export function FitBar({ value, large }: { value: number | null; large?: boolean }) {
  if (value === null) return <span className="fit none" title="Not scored">–</span>
  const v = Math.max(0, Math.min(100, value))
  return (
    <span className={`fit${large ? ' large' : ''}`} title={`Match ${value}`}>
      <b className="num">{value}</b>
      <span className="fit-track" aria-hidden="true"><i style={{ width: `${v}%` }} /></span>
    </span>
  )
}

// A count against its whole, with the whole small and faint.
export function Fraction({ n, of }: { n: number; of: number }) {
  return <span className="frac num">{n}<small>/{of}</small></span>
}

// A red dot beside a role whose files disagree. The title says why.
export function WarnMark({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null
  return <span className="warn-mark" title={warnings.join('\n')} aria-label={`${warnings.length} warning${warnings.length > 1 ? 's' : ''}`}>!</span>
}
