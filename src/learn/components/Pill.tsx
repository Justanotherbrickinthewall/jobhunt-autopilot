import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNarrState, useNarration } from "./Narration.tsx";
import { useWakeLock } from "../../reading/wakeLock.ts";
import { setHandsFree } from "../engine/handsfree.ts";

const I = {
  play: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>,
  pause: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>,
  prev: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>,
  next: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5l11 7L4 19z" /></svg>,
};

// The same key and default as the Prep strip, so both Listen controls share one setting.
const COLLAPSE_KEY = "hunt-board:listen-collapsed";
const readCollapsed = () => {
  try { return localStorage.getItem(COLLAPSE_KEY) !== "0"; } catch { return true; }
};

export function Pill() {
  const ctrl = useNarration();
  const s = useNarrState();
  useWakeLock(s.status === "playing" || s.status === "loading");
  const [stored, setStored] = useState(readCollapsed);
  // The rail's dock holds the player while the rail is full width (the shell collapses it at 1060px). The phone build has no dock.
  const [dock, setDock] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1061px)");
    const sync = () => setDock(mq.matches ? document.getElementById("rail-dock") : null);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  if (!ctrl || s.total === 0) return null;
  // The phone shows no player. A tap on the text starts reading, and this one button ends it.
  if (import.meta.env.VITE_PHONE === "1") {
    if (s.status === "idle") return null;
    const close = <div className="learn" style={{ display: "contents" }}><button type="button" className="rd-mini" onClick={() => { setHandsFree(false); ctrl.stop(); }}>Close read-along</button></div>;
    const phoneSlot = document.getElementById("rd-slot");
    return phoneSlot ? createPortal(close, phoneSlot) : close;
  }
  const busy = s.status === "playing" || s.status === "loading";
  const setCollapsed = (v: boolean) => {
    setStored(v);
    try { localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0"); } catch { /* storage unavailable */ }
  };
  // Playback opens the strip without changing the stored choice.
  const collapsed = stored && !busy && !dock;
  const bar = collapsed ? (
    <button type="button" className="rd-mini" onClick={() => setCollapsed(false)} aria-label="Show the listen controls">{I.play}Listen</button>
  ) : (
    <div className={dock ? "nar-pill is-docked" : "nar-pill"} role="toolbar" aria-label="Narration controls">
      <div className="np-row">
      <button type="button" onClick={() => ctrl.prev()} aria-label="Previous block" title="Previous block">{I.prev}</button>
      <button type="button" className="pill-main" onClick={() => ctrl.toggle()} aria-label={busy ? "Pause" : "Play"} title="Play or pause (Space)">
        {s.status === "loading" ? <span className="spinner" style={{ borderTopColor: "currentColor", borderColor: "transparent" }} /> : busy ? I.pause : I.play}
      </button>
      <button type="button" onClick={() => ctrl.next()} aria-label="Next block" title="Next block">{I.next}</button>
      <span className="status" aria-live="polite">{s.index >= 0 ? `${s.index + 1} / ${s.total}` : "Listen"}</span>
      </div>
      <span className="sep" />
      <div className="np-row">
      <label className="speed">
        <span className="sr-only">Speed</span>
        <input type="range" min={0.8} max={1.6} step={0.1} value={s.rate} onChange={(e) => ctrl.setRate(Number(e.target.value))} aria-label="Speed" />
        <output>{s.rate.toFixed(1)}x</output>
      </label>
      </div>
      <span className="sep" />
      <div className="np-row">
      <button type="button" onClick={() => ctrl.setSource(s.source === "neural" ? "system" : "neural")} title="Voice source">
        {s.source === "neural" ? "Neural" : "System"}
      </button>
      <button type="button" className={s.follow ? "is-on" : ""} onClick={() => ctrl.setFollow(!s.follow)} aria-pressed={s.follow} title="Follow along">
        Follow
      </button>
      </div>
      {!busy && !dock && <button type="button" onClick={() => setCollapsed(true)}>Hide</button>}
      {s.message && <span className="err" role="status">{s.message}</span>}
    </div>
  );
  // The strip docks in #rd-slot, outside .learn, so it brings its own .learn scope. display: contents keeps the root's layout rules off it.
  const slot = document.getElementById("rd-slot");
  const scoped = <div className="learn" style={{ display: "contents" }}>{bar}</div>;
  if (dock) return createPortal(scoped, dock);
  return slot ? createPortal(scoped, slot) : bar;
}
