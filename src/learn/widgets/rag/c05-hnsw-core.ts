// A tiny, deterministic, simplified HNSW for teaching. Not a production build:
// real HNSW inserts points one at a time and picks neighbours with a diversity heuristic.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type P = { id: number; x: number; y: number; level: number };
export type Graph = { points: P[]; layers: Map<number, Set<number>>[]; entry: number; top: number };

export const N_POINTS = 44;
export const W = 100;
export const H = 70;

export function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function buildGraph(seed = 11, m = 3, m0 = 5): Graph {
  const rnd = mulberry32(seed);
  const pts: P[] = [];
  while (pts.length < N_POINTS) {
    const c = { x: 4 + rnd() * (W - 8), y: 4 + rnd() * (H - 8) };
    if (pts.every((p) => dist(p, c) > 6)) pts.push({ id: pts.length, x: c.x, y: c.y, level: 0 });
  }
  // Level by shuffled rank: 3 points reach layer 2, 11 reach layer 1, the rest stay on layer 0.
  const order = pts.map((p) => p.id).sort(() => rnd() - 0.5);
  order.slice(0, 3).forEach((id) => (pts[id].level = 2));
  order.slice(3, 11).forEach((id) => (pts[id].level = 1));
  const layers: Map<number, Set<number>>[] = [new Map(), new Map(), new Map()];
  for (let l = 0; l <= 2; l++) {
    const ids = pts.filter((p) => p.level >= l).map((p) => p.id);
    const want = l === 0 ? m0 : m;
    for (const id of ids) layers[l].set(id, new Set());
    for (const id of ids) {
      const near = ids
        .filter((o) => o !== id)
        .sort((a, b) => dist(pts[id], pts[a]) - dist(pts[id], pts[b]))
        .slice(0, Math.max(1, l === 0 ? Math.ceil(want / 2) : Math.ceil(want / 2)));
      for (const o of near) {
        layers[l].get(id)!.add(o);
        layers[l].get(o)!.add(id);
      }
    }
  }
  const top = 2;
  return { points: pts, layers, entry: order[0], top };
}

export type Step = {
  layer: number;
  node: number; // the node being expanded
  from: number | null; // the node we came from (for drawing the hop)
  checked: number[]; // neighbours whose distance was computed at this step
};

export type SearchResult = { steps: Step[]; found: number; computed: number };

export function search(g: Graph, q: { x: number; y: number }, ef: number): SearchResult {
  const steps: Step[] = [];
  const seen = new Set<number>();
  const d = (id: number) => dist(g.points[id], q);
  let cur = g.entry;
  seen.add(cur);
  for (let l = g.top; l >= 1; l--) {
    steps.push({ layer: l, node: cur, from: null, checked: [] });
    let improved = true;
    while (improved) {
      improved = false;
      const checked: number[] = [];
      let best = cur;
      for (const nb of g.layers[l].get(cur) ?? []) {
        seen.add(nb);
        checked.push(nb);
        if (d(nb) < d(best)) best = nb;
      }
      if (best !== cur) {
        steps.push({ layer: l, node: best, from: cur, checked });
        cur = best;
        improved = true;
      } else if (checked.length) {
        steps[steps.length - 1].checked = [...new Set([...steps[steps.length - 1].checked, ...checked])];
      }
    }
  }
  // Layer 0: beam search with width ef.
  const visited = new Set<number>([cur]);
  const cand: number[] = [cur];
  const res: number[] = [cur];
  steps.push({ layer: 0, node: cur, from: null, checked: [] });
  while (cand.length) {
    cand.sort((a, b) => d(a) - d(b));
    const c = cand.shift()!;
    res.sort((a, b) => d(a) - d(b));
    if (res.length >= ef && d(c) > d(res[Math.min(ef, res.length) - 1])) break;
    const checked: number[] = [];
    for (const nb of g.layers[0].get(c) ?? []) {
      if (visited.has(nb)) continue;
      visited.add(nb);
      seen.add(nb);
      checked.push(nb);
      const worst = res.length >= ef ? d(res[Math.min(ef, res.length) - 1]) : Infinity;
      if (d(nb) < worst || res.length < ef) {
        cand.push(nb);
        res.push(nb);
        res.sort((a, b) => d(a) - d(b));
        if (res.length > ef) res.pop();
      }
    }
    if (c !== cur || checked.length) steps.push({ layer: 0, node: c, from: c === cur ? null : cur, checked });
  }
  res.sort((a, b) => d(a) - d(b));
  return { steps, found: res[0], computed: seen.size };
}

export function trueNearest(g: Graph, q: { x: number; y: number }) {
  let best = 0;
  for (const p of g.points) if (dist(p, q) < dist(g.points[best], q)) best = p.id;
  return best;
}
