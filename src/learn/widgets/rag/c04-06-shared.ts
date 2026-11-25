import { useCallback, useRef } from "react";

// Calls onComplete at most once per mounted widget.
export function useCompleteOnce(onComplete?: (verdict: string) => void) {
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

export function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
