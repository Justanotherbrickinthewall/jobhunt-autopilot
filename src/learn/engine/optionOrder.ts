// Display order for a quiz's options. Authors put the right answer in B most often, so the order is shuffled.
// The seed is the quiz id, so the order is the same on every visit. Callers keep the original option index.
import type { Block } from "../content/types.ts";

type Quiz = Extract<Block, { kind: "quiz" }>;

// A quiz whose text points at an option by position keeps its authored order.
const POSITIONAL = /\b(first|second|third|fourth|last)\s+(option|answer|choice)\b|\boptions?\s+[A-D]\b|\b[A-D]\)|\b(options?|answers?|choices?)\s+(above|below)\b|\b(all|none|both)\s+of\s+the\s+above\b/i;

export function optionOrder(q: Quiz): number[] {
  const order = q.options.map((_, i) => i);
  if (POSITIONAL.test([q.question, q.explain, ...q.options].join("\n"))) return order;
  let s = 2166136261;
  for (const ch of q.id) s = Math.imul(s ^ ch.charCodeAt(0), 16777619) >>> 0;
  for (let i = order.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
