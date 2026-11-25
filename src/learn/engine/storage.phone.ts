// The phone build's storage: localStorage and change subscription, with no server mirror.
// Same API as reading/storage.ts, which would pull its /api/progress calls into the phone bundle.
import { useSyncExternalStore } from "react";

let version = 0;
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function emit(): void {
  version++;
  listeners.forEach((l) => l());
}

window.addEventListener("storage", (e) => {
  if (e.key) cache.delete(e.key);
  emit();
});

export function readKey<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try { raw = localStorage.getItem(key); } catch { return fallback; }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: unknown = fallback;
  if (raw !== null) {
    try { value = JSON.parse(raw); } catch { value = fallback; }
  }
  cache.set(key, { raw, value });
  return value as T;
}

export function writeKey<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* full or blocked: the session still works */ }
  cache.delete(key);
  emit();
}

export function removeKey(key: string): void {
  try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
  cache.delete(key);
  emit();
}

const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};

export function useStored<T>(key: string, fallback: T): T {
  return useSyncExternalStore(subscribe, () => readKey(key, fallback), () => fallback);
}

export function useStorageVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}
