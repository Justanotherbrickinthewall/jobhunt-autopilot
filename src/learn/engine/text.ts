// Inline markers, tokenisation and narration units. Contract: setup/SPEC.md.
import type { Block, Chapter } from "../content/types.ts";

export type Segment = { kind: "text" | "term" | "code"; text: string };

const INLINE = /\*\*([^*]+?)\*\*|`([^`]+?)`/g;

/** Split a narrated string on its two markers: **term** and `code`. */
export function parseInline(src: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of src.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: "text", text: src.slice(last, at) });
    if (m[1] !== undefined) out.push({ kind: "term", text: m[1] });
    else out.push({ kind: "code", text: m[2] });
    last = at + m[0].length;
  }
  if (last < src.length) out.push({ kind: "text", text: src.slice(last) });
  return out;
}

/** The string a voice reads: markers stripped. */
export function plainText(src: string): string {
  return parseInline(src).map((s) => s.text).join("");
}

export type Token = { start: number; end: number; norm: string };

export function normalise(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/** Whitespace-delimited words with stable indices. */
export function tokenise(plain: string): Token[] {
  const tokens: Token[] = [];
  for (const m of plain.matchAll(/\S+/g)) {
    const start = m.index ?? 0;
    tokens.push({ start, end: start + m[0].length, norm: normalise(m[0]) });
  }
  return tokens;
}

export type NarrPart = { src: string; offset: number; length: number };

export type NarrUnit = {
  key: string;
  sectionId: string;
  kind: Block["kind"] | "title";
  parts: NarrPart[];
  text: string; // joined plain text, exactly what is spoken
  tokens: Token[];
  stopAfter: boolean; // a step with code: playback stops after it
};

export function buildUnit(key: string, sectionId: string, kind: NarrUnit["kind"], sources: string[], stopAfter = false): NarrUnit {
  let text = "";
  const parts: NarrPart[] = [];
  for (const src of sources) {
    const plain = plainText(src);
    if (!plain.trim()) {
      parts.push({ src, offset: text.length, length: 0 });
      continue;
    }
    if (text) text += /[.!?:;]$/.test(text) ? " " : ". ";
    parts.push({ src, offset: text.length, length: plain.length });
    text += plain;
  }
  return { key, sectionId, kind, parts, text, tokens: tokenise(text), stopAfter };
}

/** Side items open in the chapter's side panel. They are neither drawn in the story nor read aloud. */
export const isSideItem = (b: Block): boolean => b.kind === "widget" || b.kind === "fold" || b.kind === "quiz" || (b.kind === "callout" && b.tone === "interview");

/** One sentence per table row, built from the headers, so the read-along can speak a table. */
export const compareRowText = (columns: string[], row: string[]): string =>
  `${row[0]}: ${row.slice(1).map((c, j) => `${columns[j + 1]}${columns[j + 1].endsWith("?") ? "" : ","} ${c}`).join("; ")}.`;

export function narratedSources(b: Block): string[] | null {
  if (isSideItem(b)) return null;
  switch (b.kind) {
    case "p": return [b.text];
    case "list": return b.items;
    case "callout": return [b.title, b.text];
    case "code": return b.caption ? [b.caption] : null;
    case "step": return [b.title, b.text];
    case "compare": return [...(b.caption ? [b.caption] : []), ...b.rows.map((r) => compareRowText(b.columns, r))];
    default: return null;
  }
}

export const blockKey = (sectionId: string, index: number) => `${sectionId}:${index}`;
export const titleKey = (sectionId: string) => `${sectionId}:title`;
export const goalKey = (sectionId: string) => `${sectionId}:goal`;
export const HEAD_KEY = "head:title";
export const OBJECTIVES_KEY = "head:objectives";
export const RECAP_KEY = "recap:list";

export function buildUnits(chapter: Chapter): NarrUnit[] {
  const units: NarrUnit[] = [
    buildUnit(HEAD_KEY, "head", "title", [chapter.title, chapter.tagline]),
    buildUnit(OBJECTIVES_KEY, "head", "list", ["By the end you can", ...chapter.objectives]),
  ];
  for (const s of chapter.sections) {
    units.push(buildUnit(titleKey(s.id), s.id, "title", [s.title]));
    if (s.goal) units.push(buildUnit(goalKey(s.id), s.id, "p", [s.goal]));
    s.blocks.forEach((b, i) => {
      const src = narratedSources(b);
      if (!src) return;
      const unit = buildUnit(blockKey(s.id, i), s.id, b.kind, src, b.kind === "step" && !!b.code);
      if (unit.text.trim()) units.push(unit);
    });
  }
  if (chapter.recap.length) units.push(buildUnit(RECAP_KEY, "recap", "list", ["Recap", ...chapter.recap]));
  return units;
}

/** Token index that contains a character offset, or the next token after it. */
export function tokenAtChar(tokens: Token[], ch: number): number {
  for (let i = 0; i < tokens.length; i++) if (ch < tokens[i].end) return i;
  return Math.max(0, tokens.length - 1);
}

export type TimedWord = { text: string; start: number; end: number };

/**
 * Align server word timings to client tokens by normalised text, with a forward cursor.
 * Returns the start time (seconds) for every client token. Unmatched tokens are interpolated.
 */
export function alignWords(tokens: Token[], words: TimedWord[]): number[] {
  const starts: (number | null)[] = tokens.map(() => null);
  const consumed = tokens.map(() => 0);
  let cursor = 0;
  const WINDOW = 8;
  for (const w of words) {
    const nw = normalise(w.text);
    if (!nw) continue;
    let found = -1;
    for (let j = cursor; j < Math.min(tokens.length, cursor + WINDOW); j++) {
      const nt = tokens[j].norm;
      if (!nt) continue;
      if (nt === nw || nt.startsWith(nw) || nw.startsWith(nt)) {
        found = j;
        break;
      }
    }
    if (found === -1) continue;
    if (starts[found] === null) starts[found] = w.start;
    consumed[found] += nw.length;
    cursor = consumed[found] >= tokens[found].norm.length ? found + 1 : found;
  }
  // Fill gaps by linear interpolation between known neighbours.
  const out: number[] = new Array(tokens.length).fill(0);
  const endT = words.length ? words[words.length - 1].end : 0;
  let prevIdx = -1;
  let prevT = 0;
  for (let i = 0; i <= tokens.length; i++) {
    const known = i < tokens.length ? starts[i] : endT;
    if (known === null) continue;
    for (let k = prevIdx + 1; k < i; k++) {
      out[k] = prevT + ((known - prevT) * (k - prevIdx)) / (i - prevIdx);
    }
    if (i < tokens.length) out[i] = known;
    prevIdx = i;
    prevT = known;
  }
  return out;
}

/** Short FNV-1a hash of a unit's text. The phone's pre-built audio carries it, so audio for changed text is never played. */
export function textHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}
