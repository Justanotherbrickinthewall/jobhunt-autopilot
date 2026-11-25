import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import type { Chapter } from "../content/types.ts";
import { NarrationController, type NarrState } from "../engine/narration.ts";
import { buildUnits, parseInline, type NarrPart, type NarrUnit } from "../engine/text.ts";

const Ctx = createContext<NarrationController | null>(null);

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A" || el.isContentEditable;
}

export function NarrationProvider({ chapter, children }: { chapter: Chapter; children: ReactNode }) {
  const ref = useRef<NarrationController | null>(null);
  if (!ref.current) ref.current = new NarrationController();
  const ctrl = ref.current;
  const units = useMemo(() => buildUnits(chapter), [chapter]);

  useEffect(() => {
    ctrl.setUnits(units, chapter.id);
  }, [ctrl, units, chapter.id]);

  useEffect(() => () => ctrl.stop(), [ctrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      ctrl.toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ctrl]);

  return <Ctx.Provider value={ctrl}>{children}</Ctx.Provider>;
}

export function useNarration(): NarrationController | null {
  return useContext(Ctx);
}

const IDLE: NarrState = { status: "idle", index: -1, word: -1, total: 0, rate: 1, source: "neural", follow: true, message: null };
const noopSub = () => () => {};

export function useNarrState(): NarrState {
  const c = useContext(Ctx);
  return useSyncExternalStore(c ? c.subscribe : noopSub, c ? c.getState : () => IDLE, () => IDLE);
}

export function useActiveWord(key: string): number | null {
  const c = useContext(Ctx);
  return useSyncExternalStore(
    c ? c.subscribe : noopSub,
    () => (c ? c.activeWord(key) : null),
    () => null,
  );
}

/** One run of narrated text. Words are wrapped in spans whose index matches the unit's tokens. */
function Words({ part, unit, active }: { part: NarrPart; unit: NarrUnit; active: number | null }) {
  const segments = parseInline(part.src);
  const nodes: ReactNode[] = [];
  let pos = part.offset;
  segments.forEach((seg, si) => {
    const pieces: ReactNode[] = [];
    let i = 0;
    while (i < seg.text.length) {
      const abs = pos + i;
      const tIdx = unit.tokens.findIndex((t) => abs >= t.start && abs < t.end);
      if (tIdx === -1) {
        let j = i;
        while (j < seg.text.length && unit.tokens.findIndex((t) => pos + j >= t.start && pos + j < t.end) === -1) j++;
        pieces.push(seg.text.slice(i, j));
        i = j;
      } else {
        const tok = unit.tokens[tIdx];
        const endInSeg = Math.min(seg.text.length, tok.end - pos);
        pieces.push(
          <span key={`${si}-${i}`} className={active === tIdx ? "w is-now" : "w"} data-w={tIdx}>
            {seg.text.slice(i, endInSeg)}
          </span>,
        );
        i = endInSeg;
      }
    }
    pos += seg.text.length;
    if (seg.kind === "term") nodes.push(<strong key={si} className="lrn-term">{pieces}</strong>);
    else if (seg.kind === "code") nodes.push(<code key={si} className="inline-code">{pieces}</code>);
    else nodes.push(<span key={si}>{pieces}</span>);
  });
  return <>{nodes}</>;
}

/** Plain inline text with the two markers rendered but no karaoke. */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((s, i) =>
        s.kind === "term" ? <strong key={i} className="lrn-term">{s.text}</strong>
        : s.kind === "code" ? <code key={i} className="inline-code">{s.text}</code>
        : <span key={i}>{s.text}</span>,
      )}
    </>
  );
}

/**
 * Wraps a narrated block. Highlights the block when current, highlights words, and starts
 * reading from here when clicked. `render` receives a function that renders part n as karaoke text.
 */
export function NarratedBlock({
  unit, className = "", tone, children,
}: { unit: NarrUnit | undefined; className?: string; tone?: string; children: (part: (n: number) => ReactNode) => ReactNode }) {
  const ctrl = useNarration();
  const active = useActiveWord(unit?.key ?? "");
  if (!unit) return <div className={className} data-tone={tone}>{children(() => null)}</div>;
  const render = (n: number): ReactNode => {
    const part = unit.parts[n];
    return part ? <Words part={part} unit={unit} active={active} /> : null;
  };
  return (
    <div
      className={`narr-block ${className} ${active !== null ? "is-current" : ""}`}
      data-narr-key={unit.key}
      data-tone={tone}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button, a, input, textarea, select, summary")) return;
        if (window.getSelection()?.toString()) return;
        ctrl?.playFrom(unit.key);
      }}
    >
      {children(render)}
    </div>
  );
}
