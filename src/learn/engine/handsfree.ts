import { useSyncExternalStore } from "react";

// Module-level so it survives the route change from one chapter to the next.
let on = false;
const subs = new Set<() => void>();
export const getHandsFree = (): boolean => on;
export function setHandsFree(v: boolean): void {
  if (on === v) return;
  on = v;
  subs.forEach((s) => s());
}
export const useHandsFree = (): boolean => useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, getHandsFree, () => false);

// iOS starts speech only inside a tap, and the chapter's own reading begins later in an effect.
export function unlockSpeech(): void {
  unlockAudio();
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance("Hands-free.");
  u.lang = "en-GB";
  speechSynthesis.speak(u);
}

// The phone plays its pre-built neural audio through this one element. iOS refuses a later play() on an element
// that never played inside a tap, so every tap that starts reading plays a silent clip on it first.
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
let shared: HTMLAudioElement | null = null;
let unlocked = false;
export const phoneAudio = (): HTMLAudioElement => (shared ??= new Audio());
export function unlockAudio(): void {
  if (import.meta.env.VITE_PHONE !== "1" || unlocked) return;
  const a = phoneAudio();
  a.src = SILENT;
  a.play().then(() => { unlocked = true; if (a.src === SILENT) a.pause(); }, () => {});
}
