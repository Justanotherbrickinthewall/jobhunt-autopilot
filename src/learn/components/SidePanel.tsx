import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { Splitter } from "../../components/Splitter.tsx";

export type SideItem = { id: string; label: string; title: string; render: () => ReactNode };

export function SideMarker({ item, onOpen, anchor = true }: { item: SideItem; onOpen: (id: string, el?: HTMLElement) => void; anchor?: boolean }) {
  return (
    <div className="side-marker" id={anchor ? item.id : undefined}>
      <button type="button" onClick={(e) => onOpen(item.id, e.currentTarget)}>
        <i className="side-dot" aria-hidden="true" />
        <span className="side-text"><span className="side-label">{item.label}:</span> <span>{item.title}</span></span>
      </button>
    </div>
  );
}

export function SidePanel({ items, openId, onGo, onClose, scope, layout }: { items: SideItem[]; openId: string | null; onGo: (id: string) => void; onClose: () => void; scope: RefObject<HTMLElement | null>; layout: RefObject<HTMLElement | null> }) {
  const box = useRef<HTMLElement>(null);
  const at = items.findIndex((i) => i.id === openId);
  const was = useRef(false);
  const lastId = useRef("");
  const opener = useRef<HTMLElement | null>(null);
  const open = at >= 0;
  if (open) lastId.current = items[at].id;

  useEffect(() => {
    if (open && !was.current) {
      opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
      box.current?.focus();
    }
    // Back to the marker that opened it. The lab has two markers, so the id alone could jump to the wrong one; preventScroll keeps the reader's place.
    if (!open && was.current) (opener.current ?? document.getElementById(lastId.current)?.querySelector("button"))?.focus({ preventScroll: true });
    was.current = open;
  }, [open]);

  // On a wide screen the chapter grid keeps an empty .side-slot column beside the story; the panel lines its left edge up with it.
  useLayoutEffect(() => {
    if (!open) return;
    const sync = () => {
      const r = document.querySelector(".side-slot")?.getBoundingClientRect();
      if (!box.current) return;
      box.current.style.left = r?.width ? `${r.left}px` : "";
      box.current.style.width = r?.width ? "auto" : "";
    };
    sync();
    const ro = new ResizeObserver(sync);
    const slot = document.querySelector(".side-slot");
    if (slot) ro.observe(slot);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Esc inside a text field must not close the panel, or a half-typed interview answer is lost.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !(e.target instanceof HTMLElement && e.target.closest("textarea, input, [contenteditable]")) && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const item = items[at];
  return (
    <>
    <div className="side-scrim" onClick={onClose} aria-hidden="true" />
    <aside className="side-panel" role="dialog" aria-label={`Side item: ${item.label}, ${item.title}`} tabIndex={-1} ref={box}>
      {import.meta.env.VITE_PHONE !== "1" && <Splitter name="side" label="Resize the side panel" varName="--side-w" root={scope} pane={box} min={320} max={1400} grow="left" room={() => (layout.current?.clientWidth ?? window.innerWidth) - 480} />}
      <header>
        <div className="side-head">
          <div className="side-label">{item.label}</div>
          <div className="side-title">{item.title}</div>
        </div>
        <div className="side-nav">
          <span>{at + 1} of {items.length}</span>
          <button type="button" className="btn ghost small" disabled={at === 0} onClick={() => onGo(items[at - 1].id)}>Previous</button>
          <button type="button" className="btn ghost small" disabled={at === items.length - 1} onClick={() => onGo(items[at + 1].id)}>Next</button>
          <button type="button" className="btn ghost small" onClick={onClose} aria-label="Close side panel">Close</button>
        </div>
      </header>
      <div className="side-body" key={item.id}>{item.render()}</div>
    </aside>
    </>
  );
}
