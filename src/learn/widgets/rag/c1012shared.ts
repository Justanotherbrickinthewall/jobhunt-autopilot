import { useCallback, useRef } from "react";

// Calls onComplete exactly once, however many times the learner re-submits.
export function useOnce(cb?: (verdict: string) => void) {
  const done = useRef(false);
  const cbRef = useRef(cb);
  cbRef.current = cb;
  return useCallback((verdict: string) => {
    if (done.current) return;
    done.current = true;
    cbRef.current?.(verdict);
  }, []);
}
