import type { Link } from '../data/links.ts'

// One plain line of links, such as "Go deeper: A, B". They open in a new tab, so they are real anchors and no handler touches them.
export function WikiLine({ label, links, className = 'wiki-line' }: { label: string; links: Link[]; className?: string }) {
  if (links.length === 0) return null
  return (
    <p className={className}>
      {label}:{' '}
      {links.map((l, i) => (
        <span key={l.href}>{i > 0 && ', '}<a href={l.href} target="_blank" rel="noopener">{l.label}</a></span>
      ))}
    </p>
  )
}
