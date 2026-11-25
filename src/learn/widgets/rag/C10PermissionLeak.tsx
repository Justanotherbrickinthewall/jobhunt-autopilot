import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c1012shared";
import "./C10PermissionLeak.css";

type Doc = { id: string; title: string; allowed: boolean };

// Ranked by relevance to "Is there a redundancy plan for Q3?"
const RANKED: Doc[] = [
  { id: "d1", title: "Q3 redundancy plan (HR only)", allowed: false },
  { id: "d2", title: "Severance policy draft (HR only)", allowed: false },
  { id: "d3", title: "Restructuring FAQ (managers only)", allowed: false },
  { id: "d4", title: "Sales compensation plan, Q3", allowed: true },
  { id: "d5", title: "All-hands notes, September", allowed: true },
  { id: "d6", title: "Company org chart overview", allowed: true },
  { id: "d7", title: "Expenses policy", allowed: true },
];
const K = 4;

type Place = "ui" | "output" | "prompt" | "post" | "pre";

const PLACES: { id: Place; label: string; gx: number; seen: () => Doc[]; safe: boolean; outcome: string }[] = [
  {
    id: "ui",
    label: "In the interface: hide restricted citations",
    gx: 600,
    seen: () => RANKED.slice(0, K),
    safe: false,
    outcome: "The model read the redundancy plan and wrote it into the answer. Hiding the citation list hid nothing that matters. The text was already generated.",
  },
  {
    id: "output",
    label: "After generation: scan the answer for restricted titles",
    gx: 530,
    seen: () => RANKED.slice(0, K),
    safe: false,
    outcome: "The model paraphrased, so no restricted title appears in the answer and the scanner passes it. The content still leaked.",
  },
  {
    id: "prompt",
    label: "In the system prompt: tell the model not to reveal restricted material",
    gx: 320,
    seen: () => RANKED.slice(0, K),
    safe: false,
    outcome: "The model read the restricted chunks and was asked politely to keep quiet. A polite instruction is not a control. One rephrased question can defeat it.",
  },
  {
    id: "post",
    label: "After search: drop forbidden chunks from the top four",
    gx: 250,
    seen: () => RANKED.slice(0, K).filter((d) => d.allowed),
    safe: true,
    outcome: "Safe, but starved. Three of four slots were forbidden, so the model got one chunk and the useful permitted documents at ranks five to seven were never fetched. Fetch more and filter, or filter inside the search.",
  },
  {
    id: "pre",
    label: "Inside the search: filter on the caller's groups",
    gx: 180,
    seen: () => RANKED.filter((d) => d.allowed).slice(0, K),
    safe: true,
    outcome: "Safe and complete. The index only considered permitted chunks, so the top four are the best four this user may see. The restricted documents never reached the model.",
  },
];

type Key = "text" | "scope" | "user" | "index";
const KEYS: { id: Key; label: string; safe: boolean; note: string }[] = [
  { id: "text", label: "Question text only", safe: false, note: "Leaks. Marcus's cached answer is served to Priya, who typed the same words." },
  { id: "index", label: "Question text plus index version", safe: false, note: "Leaks. The key still ignores who is asking." },
  { id: "user", label: "Question text plus user id", safe: true, note: "Safe, but nobody shares stored answers. Every user in a group misses the cache on their own." },
  { id: "scope", label: "Question text plus a hash of the caller's group set plus index version", safe: true, note: "Right. People with the same access share stored answers, and a document change moves the index version." },
];

const NODES = ["Index", "Search", "Prompt", "Model", "Reader"];

export default function C10PermissionLeak({ onComplete }: WidgetProps) {
  const reduce = useReducedMotion();
  const complete = useOnce(onComplete);
  const [place, setPlace] = useState<Place | null>(null);
  const [ran, setRan] = useState(false);
  const [key, setKey] = useState<Key | null>(null);
  const [done, setDone] = useState(false);

  const chosen = PLACES.find((p) => p.id === place) ?? null;
  const seen = ran && chosen ? chosen.seen() : [];
  const keyChoice = KEYS.find((k) => k.id === key) ?? null;

  function finish() {
    if (!chosen || !keyChoice) return;
    setDone(true);
    complete(`Check at: ${chosen.id}. Cache key: ${keyChoice.id}.`);
  }

  const allGood = chosen?.id === "pre" && keyChoice?.id === "scope";
  const anyLeak = (chosen && !chosen.safe) || (keyChoice && !keyChoice.safe);

  return (
    <div className="w-panel c10pl-root">
      <p className="c10pl-lead">
        Priya is in Sales. She asks: <em>Is there a redundancy plan for Q3?</em> The search ranks seven documents. Three are restricted to HR and managers. The system sends the top {K} to the model.
      </p>

      <ol className="c10pl-docs" aria-label="Documents ranked by relevance">
        {RANKED.map((d, i) => (
          <li key={d.id} className={"c10pl-doc " + (d.allowed ? "ok" : "no")}>
            <span className="c10pl-rank">{i + 1}</span>
            <span className="c10pl-title">{d.title}</span>
            <span className="c10pl-tag">{d.allowed ? "Priya may read" : "Priya may not read"}</span>
          </li>
        ))}
      </ol>

      <fieldset className="c10pl-fs">
        <legend>Step 1. Where does the permission check go?</legend>
        {PLACES.map((p) => (
          <label key={p.id} className={"c10pl-opt" + (place === p.id ? " is-on" : "")}>
            <input
              type="radio"
              name="c10pl-place"
              checked={place === p.id}
              disabled={ran}
              onChange={() => setPlace(p.id)}
            />
            <span>{p.label}</span>
          </label>
        ))}
      </fieldset>

      <svg viewBox="0 0 640 96" className="c10pl-svg" role="img" aria-label="Pipeline from index to reader with a permission gate at the chosen position">
        {NODES.map((n, i) => {
          const cx = 40 + i * 140;
          return (
            <g key={n}>
              {i > 0 && <line x1={cx - 140 + 32} x2={cx - 32} y1="46" y2="46" className="c10pl-edge" />}
              <rect x={cx - 32} y="28" width="64" height="36" rx="9" className="c10pl-node" />
              <text x={cx} y="51" textAnchor="middle" className="c10pl-nt">
                {n}
              </text>
            </g>
          );
        })}
        <motion.g initial={false} animate={{ x: chosen ? chosen.gx : 20, opacity: chosen ? 1 : 0.25 }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 26 }}>
          <rect x="-14" y="6" width="28" height="22" rx="6" className="c10pl-gate" />
          <text x="0" y="22" textAnchor="middle" className="c10pl-gt">
            ACL
          </text>
          <line x1="0" x2="0" y1="28" y2="86" className="c10pl-gl" />
        </motion.g>
      </svg>

      {!ran && (
        <div className="w-row">
          <button type="button" className="w-btn primary" disabled={!place} onClick={() => setRan(true)}>
            Run Priya's request
          </button>
        </div>
      )}

      {ran && chosen && (
        <div className="c10pl-out">
          <p className="c10pl-cap">What the model read:</p>
          <div className="c10pl-chips">
            {seen.map((d, i) => (
              <motion.span
                key={d.id}
                className={"c10pl-chip " + (d.allowed ? "ok" : "no")}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : i * 0.08 }}
              >
                {d.title}
              </motion.span>
            ))}
          </div>
          <p className={"w-verdict " + (chosen.safe ? "good" : "bad")} role="status">
            {chosen.outcome}
          </p>
        </div>
      )}

      {ran && (
        <>
          <fieldset className="c10pl-fs">
            <legend>Step 2. Marcus in HR asked the same words an hour ago, and the answer was cached. Pick the cache key.</legend>
            {KEYS.map((k) => (
              <label key={k.id} className={"c10pl-opt" + (key === k.id ? " is-on" : "")}>
                <input type="radio" name="c10pl-key" checked={key === k.id} disabled={done} onChange={() => setKey(k.id)} />
                <span>{k.label}</span>
              </label>
            ))}
          </fieldset>
          {!done && (
            <div className="w-row">
              <button type="button" className="w-btn primary" disabled={!key} onClick={finish}>
                Lock in my design
              </button>
            </div>
          )}
        </>
      )}

      {done && keyChoice && (
        <div className="c10pl-final">
          <p className={"w-verdict " + (keyChoice.safe ? "good" : "bad")} role="status">
            {keyChoice.note}
          </p>
          <p className={"w-verdict " + (allGood ? "good" : anyLeak ? "bad" : "good")} role="status">
            {allGood
              ? "Verdict: correct on both counts. The check lives inside the search, and the cache key carries scope and index version."
              : anyLeak
                ? "Verdict: your design leaks. The rule is the filter inside the search, plus a cache key scoped by group set and index version."
                : "Verdict: safe, though not the best. Filter inside the search so you do not starve the top four, and share stored answers by group set."}
          </p>
        </div>
      )}
    </div>
  );
}
