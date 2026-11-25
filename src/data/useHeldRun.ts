import { useEffect, useState } from 'react'
import { heldJobs, type Job } from './heldApi.ts'
import type { HoldKind } from './holds.ts'
import { isActive } from './retro.ts'

export type RunState = { jobs: ReadonlyMap<string, Job>; opened: Record<string, HoldKind[]> }
const NO_JOBS: ReadonlyMap<string, Job> = new Map()

// The server's run state for held roles, polled on mount, on window focus and every 4 seconds while a run is busy.
// Retro and the rail's count both read it, so the two numbers come from the same data.
export function useHeldRun() {
  const [run, setRun] = useState<RunState | null>(null)
  const [down, setDown] = useState(false)
  const [poll, setPoll] = useState(0)
  const refresh = () => setPoll((n) => n + 1)
  useEffect(() => {
    let gone = false
    heldJobs().then(
      (r) => { if (!gone) { setRun({ jobs: new Map(r.jobs.map((j) => [j.id, j])), opened: r.opened }); setDown(false) } },
      () => { if (!gone) setDown(true) }, // a failed poll keeps the last run state, so open cards and a typed answer stay put
    )
    return () => { gone = true }
  }, [poll])
  useEffect(() => {
    const onFocus = () => setPoll((n) => n + 1)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])
  const jobs = run?.jobs ?? NO_JOBS
  const busy = [...jobs.values()].some(isActive)
  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => setPoll((n) => n + 1), 4_000)
    return () => clearInterval(t)
  }, [busy])
  return { run, down, jobs, refresh }
}

