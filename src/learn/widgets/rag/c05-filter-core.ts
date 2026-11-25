function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Doc = { id: number; x: number; y: number; u: number };
export const FW = 100;
export const FH = 70;
export const FN = 120;
export const FK = 5;

export function buildDocs(seed = 9): Doc[] {
  const r = rng(seed);
  const out: Doc[] = [];
  while (out.length < FN) {
    const p = { id: out.length, x: 3 + r() * (FW - 6), y: 3 + r() * (FH - 6), u: r() };
    if (out.every((o) => Math.hypot(o.x - p.x, o.y - p.y) > 3.5)) out.push(p);
  }
  return out;
}

export type Mode = "post" | "pre" | "during";

export function filteredSearch(docs: Doc[], q: { x: number; y: number }, selectivity: number, mode: Mode, candidates: number) {
  const match = (d: Doc) => d.u < selectivity;
  const byDist = [...docs].sort((a, b) => Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b.x - q.x, b.y - q.y));
  if (mode === "post") {
    const pool = byDist.slice(0, candidates);
    return { results: pool.filter(match).slice(0, FK), visited: pool };
  }
  if (mode === "pre") {
    const all = byDist.filter(match);
    return { results: all.slice(0, FK), visited: all };
  }
  const visited: Doc[] = [];
  const results: Doc[] = [];
  for (const d of byDist) {
    visited.push(d);
    if (match(d)) results.push(d);
    if (results.length >= FK) break;
  }
  return { results, visited };
}
