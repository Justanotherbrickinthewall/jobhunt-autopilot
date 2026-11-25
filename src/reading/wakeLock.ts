import { useEffect } from 'react'

/** Keeps the screen awake while `active`, so a hands-free read-along isn't cut off by the phone's sleep timer. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let done = false
    const take = () => {
      if (document.visibilityState !== 'visible') return
      navigator.wakeLock.request('screen')
        .then((l) => { if (done) void l.release(); else lock = l })
        .catch(() => { /* refused, for example in low power mode: the screen sleeps as before */ })
    }
    // The browser drops the lock whenever the page is hidden, so take it again on return.
    const onVisible = () => { if (!lock || lock.released) take() }
    take()
    document.addEventListener('visibilitychange', onVisible)
    return () => { done = true; document.removeEventListener('visibilitychange', onVisible); void lock?.release() }
  }, [active])
}
