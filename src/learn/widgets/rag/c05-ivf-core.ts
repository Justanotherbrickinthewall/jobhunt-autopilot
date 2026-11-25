// Deterministic toy IVF index: k-means cells over random 2D points.
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

export type Pt = { id: number; x: number; y: number };
export const IW = 100;
export const IH = 70;
export const NLIST = 6;
export const N = 90;

const d = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

export function buildIvf(seed = 5) {
  const r = rng(seed);
  const pts: Pt[] = [];
  while (pts.length < N) {
    const p = { id: pts.length, x: 3 + r() * (IW - 6), y: 3 + r() * (IH - 6) };
    if (pts.every((o) => d(o, p) > 3.2)) pts.push(p);
  }
  // k-means++-ish deterministic init: farthest-point.
  const cents: { x: number; y: number }[] = [{ x: pts[0].x, y: pts[0].y }];
  while (cents.length < NLIST) {
    let best = pts[0];
    let bd = -1;
    for (const p of pts) {
      const m = Math.min(...cents.map((c) => d(c, p)));
      if (m > bd) {
        bd = m;
        best = p;
      }
    }
    cents.push({ x: best.x, y: best.y });
  }
  for (let it = 0; it < 12; it++) {
    const sums = cents.map(() => ({ x: 0, y: 0, n: 0 }));
    for (const p of pts) {
      const c = nearestCell(cents, p);
      sums[c].x += p.x;
      sums[c].y += p.y;
      sums[c].n++;
    }
    sums.forEach((s, i) => {
      if (s.n) cents[i] = { x: s.x / s.n, y: s.y / s.n };
    });
  }
  const cell = pts.map((p) => nearestCell(cents, p));
  return { pts, cents, cell };
}

export function nearestCell(cents: { x: number; y: number }[], p: { x: number; y: number }) {
  let b = 0;
  for (let i = 1; i < cents.length; i++) if (d(cents[i], p) < d(cents[b], p)) b = i;
  return b;
}

export const K = 5;

export function ivfSearch(ix: ReturnType<typeof buildIvf>, q: { x: number; y: number }, nprobe: number) {
  const order = ix.cents.map((c, i) => ({ i, dd: d(c, q) })).sort((a, b) => a.dd - b.dd).map((o) => o.i);
  const probed = new Set(order.slice(0, nprobe));
  const scanned = ix.pts.filter((p) => probed.has(ix.cell[p.id]));
  const top = [...scanned].sort((a, b) => d(a, q) - d(b, q)).slice(0, K).map((p) => p.id);
  const truth = [...ix.pts].sort((a, b) => d(a, q) - d(b, q)).slice(0, K).map((p) => p.id);
  const hits = top.filter((id) => truth.includes(id)).length;
  return { probed, scanned, top, truth, hits };
}
