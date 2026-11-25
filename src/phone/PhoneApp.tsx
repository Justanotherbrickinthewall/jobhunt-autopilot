import { lazy, Suspense, useEffect, useState } from 'react'
import { ReadAlongPill } from '../reading/ReadAlong.tsx'
import { LEARN_BASE } from '../learn/engine/base.ts'
import { useTrail } from '../components/crumbs.ts'
import { DisplayMenu } from './standins/rail.tsx'
import { PrepGate } from './PrepGate.tsx'

const Learn = lazy(() => import('../learn/Learn.tsx'))
const Bank = lazy(() => import('../learn/Bank.tsx'))

const BASE = import.meta.env.BASE_URL
type Where = { area: 'prep' | 'learn' | 'bank'; q?: string }

// The address decides the area. A chapter's interview link pushes <base>learn/interview?q=<id> and fires popstate, which opens the bank here.
function read(): Where {
  const path = location.pathname.replace(/\/+$/u, '')
  if (path === `${LEARN_BASE}/interview`) return { area: 'bank', q: new URLSearchParams(location.search).get('q') ?? undefined }
  if (path === LEARN_BASE || path.startsWith(`${LEARN_BASE}/`)) return { area: 'learn' }
  return { area: 'prep' }
}

const Loading = ({ what }: { what: string }) => <div className="scroll"><div className="empty small"><p>Loading {what}.</p></div></div>

export function PhoneApp() {
  const [at, setAt] = useState(read)
  useEffect(() => {
    const sync = () => setAt(read())
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  // iOS fires these when the app leaves the screen. main.tsx reads the key on the next cold launch.
  useEffect(() => {
    const save = () => { try { localStorage.setItem('night-reading:last-screen', location.pathname + location.search) } catch { /* storage unavailable */ } }
    const hidden = () => { if (document.visibilityState === 'hidden') save() }
    document.addEventListener('visibilitychange', hidden)
    window.addEventListener('pagehide', save)
    return () => { document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', save) }
  }, [])
  const go = (to: string) => { history.pushState(null, '', to); setAt(read()); window.scrollTo(0, 0) }
  const learn = at.area === 'learn'
  const trail = useTrail()
  // The last crumb is the page itself. The first is Learn's home, which this app calls All courses.
  const crumbs = learn ? trail.slice(0, -1) : []

  return (
    <div className={`app phone${crumbs.length ? ' crumbed' : ''}`}>
      <header className="rail">
        <div className="seg" role="group" aria-label="Area">
          <button type="button" aria-pressed={!learn} onClick={() => { if (learn) go(BASE) }}>Interview prep</button>
          <button type="button" aria-pressed={learn} onClick={() => { if (!learn) go(LEARN_BASE); else trail[0]?.go?.() }}>Learn</button>
        </div>
        <DisplayMenu />
        {crumbs.length > 0 && (
          <nav className="crumbs" aria-label="Where you are">
            {crumbs.map((c, i) => <button key={i} type="button" onClick={c.go}>{i === 0 ? 'All courses' : c.label}</button>)}
          </nav>
        )}
      </header>
      <main className="main">
        {at.area === 'learn' && <Suspense fallback={<Loading what="Learn" />}><Learn /></Suspense>}
        {at.area === 'bank' && (
          <div className="bank-host">
            <div className="back-row"><button className="back-link" onClick={() => go(BASE)}>Back to the prep room</button></div>
            <Suspense fallback={<Loading what="the question bank" />}><Bank key={at.q ?? ''} initialQ={at.q} /></Suspense>
          </div>
        )}
        {at.area === 'prep' && <PrepGate />}
        <div id="rd-slot" className="rd-slot" />
        <ReadAlongPill inDrawer={false} />
      </main>
    </div>
  )
}
