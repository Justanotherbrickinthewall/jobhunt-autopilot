import { useCallback, useRef } from "react";

// Forwards a verdict to onComplete exactly once.
export function useOnce(onComplete?: (verdict: string) => void) {
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

// 1234 -> "1.2k", 2500000 -> "2.5M"
export function fmtTokens(n: number): string {
  if (n >= 1e9) return `${+(n / 1e9).toPrecision(3)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toPrecision(3)}M`;
  if (n >= 1e3) return `${+(n / 1e3).toPrecision(3)}k`;
  return String(Math.round(n));
}

export function fmtMoney(n: number): string {
  if (n >= 100) return `$${Math.round(n).toLocaleString("en-GB")}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}
