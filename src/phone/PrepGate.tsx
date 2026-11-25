import { useEffect, useState } from 'react'
import type { PrepContent } from '../data/prepTypes.ts'
import { Prep } from '../components/Prep.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { go } from '../components/nav.ts'
import { loadPrepSources, setPrepContent } from './standins/prep.ts'

export function PrepGate() {
  const [open, setOpen] = useState(() => loadPrepSources().length > 0)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // The phone keeps the Prep screen in memory, so leaving for Learn and coming back opens the room.
  useEffect(() => () => go('/'), [])

  useEffect(() => {
    if (open) return
    const ctl = new AbortController()
    setFailed(false)
    fetch(`${import.meta.env.BASE_URL}prep.json`, { signal: ctl.signal })
      .then((r) => { if (!r.ok) throw new Error('missing'); return r.json() as Promise<PrepContent> })
      .then((c) => { setPrepContent(c); setOpen(true) })
      .catch(() => { if (!ctl.signal.aborted) setFailed(true) })
    return () => ctl.abort()
  }, [open, attempt])

  if (open) return <Prep target={null} />
  return (
    <div className="scroll">
      <PageHeader title="Interview prep" sub="" />
      {failed && (
        <>
          <p role="alert">Interview prep could not be loaded. Check the connection and try again.</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
        </>
      )}
    </div>
  )
}
