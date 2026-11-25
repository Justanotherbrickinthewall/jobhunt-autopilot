import { useCallback, useRef } from "react";

// Returns a function that forwards the verdict to onComplete exactly once.
export function useComplete(onComplete?: (verdict: string) => void) {
  const done = useRef(false);
  return useCallback(
    (verdict: string) => {
      if (done.current) return;
      done.current = true;
      onComplete?.(verdict);
    },
    [onComplete],
  );
}
