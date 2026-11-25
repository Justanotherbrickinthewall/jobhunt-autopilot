import { readKey, writeKey } from "./storage.ts";

export type NarrationSettings = { rate: number; source: "neural" | "system"; follow: boolean; voice: string };

const NARR_KEY = "fde:narration";
export const DEFAULT_NARRATION: NarrationSettings = { rate: 1, source: "neural", follow: true, voice: "en-GB-RyanNeural" };

export function getNarrationSettings(): NarrationSettings {
  return { ...DEFAULT_NARRATION, ...readKey<Partial<NarrationSettings>>(NARR_KEY, {}) };
}

export function saveNarrationSettings(patch: Partial<NarrationSettings>): void {
  writeKey(NARR_KEY, { ...getNarrationSettings(), ...patch });
}
