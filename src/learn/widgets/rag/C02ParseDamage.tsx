import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c01-03-shared";
import "./C02ParseDamage.css";

type Seg = { id: string; t: string; d?: string };

// A simulated PDF text extraction of a page about line length. The content is paraphrased from PEP 8
// and PEP 572. The damage is the kind a real extractor produces.
const LINES: Seg[][] = [
  [{ id: "x1", t: "Introduction" }],
  [{ id: "a1", t: "Keep every line of code to at most 79 " }, { id: "a2", t: "charac-", d: "hyph" }],
  [{ id: "a3", t: "ters. For long blocks of text such as docstrings or " }, { id: "a4", t: "com-", d: "hyph" }],
  [{ id: "hd", t: "Python Style Guide - page 4 of 12", d: "header" }],
  [{ id: "a5", t: "ments, the limit drops to 72 characters." }],
  [{ id: "b1", t: "The " }, { id: "b2", t: "ﬁrst", d: "lig" }, { id: "b3", t: " reason is that a narrow limit keeps " }, { id: "b4", t: "side-by-side" }, { id: "b5", t: " review possible." }],
  [{ id: "c1", t: "Prefer parentheses for     The target of := is bound", d: "cols" }],
  [{ id: "c2", t: "wrapping long lines.       in the enclosing scope.", d: "cols" }],
  [{ id: "t1", t: "Limit  Characters  Code  79  Docstrings and comments  72", d: "table" }],
  [{ id: "w1", t: "A " }, { id: "w2", t: "well-known" }, { id: "w3", t: " case is the standard library, which stays at 79." }],
];

const DEFECTS: Record<string, { label: string; why: string }> = {
  hyph: { label: "Line-end hyphenation", why: "The extractor kept the hyphen and the line break. The words charac-ters and com-ments never match a search for characters or comments. Repair by joining a hyphenated line end to the next line." },
  header: { label: "Running page header", why: "Every page repeats the header, and here it splits a sentence in half. Strip text that repeats at the same position on every page." },
  lig: { label: "Ligature glyph", why: "The single character fi, in the PDF's encoding, is not the letters f and i. Keyword search for first fails. Normalise the text, for example with Unicode NFKC." },
  cols: { label: "Merged columns", why: "Two columns were read straight across. The sentences are now interleaved nonsense, and an embedding of that text points nowhere. You need a layout-aware parser to get reading order right." },
  table: { label: "Flattened table", why: "The grid became one line. A reader cannot tell which number belongs to code and which to docstrings. Keep tables as structured rows, or render them as text with headers on every row." },
};
const GROUPS = Object.keys(DEFECTS);

export default function C02ParseDamage({ onComplete }: WidgetProps) {
  const complete = useOnce(onComplete);
  const reduce = !!useReducedMotion();
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState(false);

  const all = LINES.flat();
  const found = GROUPS.filter((g) => all.some((s) => s.d === g && flags.has(s.id)));
  const falsePos = all.filter((s) => !s.d && flags.has(s.id));

  function toggle(id: string) {
    if (checked) return;
    setFlags((f) => {
      const n = new Set(f);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function check() {
    setChecked(true);
    complete(`found ${found.length} of ${GROUPS.length} defects, ${falsePos.length} false alarms`);
  }
  const good = found.length >= 4 && falsePos.length <= 1;

  function cls(s: Seg) {
    const base = "c02-parse-damage-seg";
    const on = flags.has(s.id);
    if (!checked) return on ? `${base} is-flag` : base;
    if (s.d) return `${base} ${on ? "is-hit" : "is-miss"}`;
    return on ? `${base} is-false` : base;
  }

  return (
    <div className="w-panel c02-parse-damage">
      <p className="c02-parse-damage-lede">This is what a PDF extractor handed to the chunker. Click every span that is damaged. Hyphens that belong to real words are decoys.</p>
      <motion.div className="c02-parse-damage-page" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
        {LINES.map((line, i) => (
          <span className="c02-parse-damage-line" key={i}>
            {line.map((s) => (
              <button key={s.id} type="button" className={cls(s)} aria-pressed={flags.has(s.id)} onClick={() => toggle(s.id)}>{s.t}</button>
            ))}
          </span>
        ))}
      </motion.div>
      <div className="c02-parse-damage-bar">
        <span>{flags.size} flagged</span>
        {!checked && <button type="button" className="w-btn primary" disabled={flags.size === 0} onClick={check}>Check my flags</button>}
        {!checked && flags.size > 0 && <button type="button" className="w-btn ghost" onClick={() => setFlags(new Set())}>Clear</button>}
      </div>
      {checked && (
        <>
          <div className={`w-verdict ${good ? "good" : "bad"}`} role="status">
            You found {found.length} of {GROUPS.length} kinds of damage with {falsePos.length} false {falsePos.length === 1 ? "alarm" : "alarms"}. {good ? "You read extractor output the way a sceptic should." : "Extractor output looks plausible, which is why it fools people. Read the list below."}
          </div>
          <ul className="c02-parse-damage-list">
            {GROUPS.map((g) => (
              <li key={g} className={found.includes(g) ? "is-hit" : "is-miss"}>
                <b>{DEFECTS[g].label}{found.includes(g) ? ": spotted. " : ": missed. "}</b>{DEFECTS[g].why}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
