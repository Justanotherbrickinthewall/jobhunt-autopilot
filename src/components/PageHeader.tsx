import type { ReactNode } from 'react'

// The 56px page bar every screen opens with: a cap naming the place, a hairline, a title that states what is true now,
// one faint line after it, and the screen's actions on the right. Prep passes no cap, so it stays plain.
export function PageHeader({ cap, title, sub, children }: { cap?: string; title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      {cap && <><span className="cap">{cap}</span><span className="ph-sep" aria-hidden="true" /></>}
      <h1 title={typeof title === 'string' ? title : undefined}>{title}</h1>
      {sub && <p className="ph-sub">{sub}</p>}
      {children && <div className="ph-controls">{children}</div>}
    </header>
  )
}
