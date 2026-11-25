import { useMemo, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents07TicketKey.css";

// Illustrative stream of open_ticket requests. The group letter is the ground truth: the same group means the same wish.
type Call = { id: string; thread: string; title: string; peps: number[]; body: string; group: string; note: string };

const BODY_WALRUS = "The walrus page is out of date.";
const BODY_LINK = "Each page should point to the other.";

const CALLS: Call[] = [
  { id: "call-1", thread: "t-17", title: "Fix the PEP 572 page", peps: [572], body: BODY_WALRUS, group: "A", note: "A new ticket." },
  { id: "call-2", thread: "t-17", title: "fix the pep 572  page", peps: [572], body: BODY_WALRUS, group: "A", note: "A retry, retyped in lower case with a double space." },
  { id: "call-3", thread: "t-17", title: "Fix the PEP 572 page", peps: [572], body: "The page needs an update.", group: "A", note: "A retry where the model reworded the body." },
  { id: "call-4", thread: "t-17", title: "Fix the PEP 572 page", peps: [572], body: BODY_WALRUS, group: "A", note: "An exact retry." },
  { id: "call-5", thread: "t-17", title: "Link PEP 8 and PEP 20", peps: [8, 20], body: BODY_LINK, group: "B", note: "A new ticket." },
  { id: "call-6", thread: "t-17", title: "Link PEP 8 and PEP 20", peps: [20, 8], body: BODY_LINK, group: "B", note: "A retry with the PEP numbers in another order." },
  { id: "call-7", thread: "t-17", title: "Link PEP 8 and PEP 20", peps: [20, 8, 20], body: BODY_LINK, group: "B", note: "A retry with one PEP number repeated." },
  { id: "call-8", thread: "t-18", title: "Fix the PEP 572 page", peps: [572], body: BODY_WALRUS, group: "C", note: "A new ticket. The same words, asked in another conversation." },
  { id: "call-9", thread: "t-17", title: "Add PEP 703 to the glossary", peps: [703], body: "The glossary has no entry for free threading.", group: "D", note: "A new ticket." },
  { id: "call-10", thread: "t-17", title: "Fix the PEP 572 page", peps: [572, 703], body: BODY_WALRUS, group: "E", note: "A new ticket. It names one more PEP." },
  { id: "call-11", thread: "t-17", title: "Fix PEP 572 page", peps: [572], body: BODY_WALRUS, group: "A", note: "The same wish in other words. Only meaning can match it." },
];

const norm = (s: string) => s.toLowerCase().split(/\s+/).filter(Boolean).join(" ");
const pepList = (peps: number[]) => [...new Set(peps)].sort((a, b) => a - b).join(",");

type Rule = { id: string; name: string; desc: string; key: (c: Call) => string };

const RULES: Rule[] = [
  { id: "call", name: "The tool call id", desc: "Each attempt carries its own id from the framework.", key: (c) => c.id },
  { id: "title", name: "The title, exactly as typed", desc: "Nothing else goes in.", key: (c) => c.title },
  {
    id: "nothread",
    name: "Normalised title and sorted PEPs",
    desc: "Lower case, single spaces, PEP numbers sorted with repeats removed. No thread.",
    key: (c) => `${norm(c.title)} | PEPs ${pepList(c.peps)}`,
  },
  {
    id: "askpep",
    name: "Thread, normalised title and sorted PEPs",
    desc: "The same as above, with the thread id added.",
    key: (c) => `${c.thread} | ${norm(c.title)} | PEPs ${pepList(c.peps)}`,
  },
  {
    id: "body",
    name: "Thread, normalised title, sorted PEPs and body",
    desc: "The same again, with the body text added.",
    key: (c) => `${c.thread} | ${norm(c.title)} | PEPs ${pepList(c.peps)} | ${c.body}`,
  },
];

type Outcome = "new" | "caught" | "missed" | "blocked";

function evaluate(rule: Rule) {
  const seenKeys = new Set<string>();
  const seenGroups = new Set<string>();
  const rows = CALLS.map((call) => {
    const key = rule.key(call);
    const flagged = seenKeys.has(key);
    const repeat = seenGroups.has(call.group);
    seenKeys.add(key);
    seenGroups.add(call.group);
    const outcome: Outcome = repeat ? (flagged ? "caught" : "missed") : flagged ? "blocked" : "new";
    return { call, key, outcome };
  });
  const count = (o: Outcome) => rows.filter((r) => r.outcome === o).length;
  return { rows, caught: count("caught"), missed: count("missed"), blocked: count("blocked") };
}

const TOTAL_REPEATS = CALLS.filter((x, i) => CALLS.findIndex((y) => y.group === x.group) !== i).length;
const LABEL: Record<Outcome, string> = { new: "files a ticket", caught: "repeat caught", missed: "repeat missed", blocked: "new, wrongly blocked" };
const CHIP: Record<Outcome, string> = { new: "", caught: "good", missed: "warn", blocked: "bad" };

function truth(call: Call, index: number): string {
  const first = CALLS.findIndex((c) => c.group === call.group);
  return first === index ? call.note : `Same ticket as row ${first + 1}. ${call.note}`;
}

export default function Agents07TicketKey({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [ruleId, setRuleId] = useState("call");
  const [shipped, setShipped] = useState(false);
  const [ships, setShips] = useState(0);

  const rule = RULES.find((r) => r.id === ruleId) ?? RULES[0];
  const res = useMemo(() => evaluate(rule), [rule]);
  // The best rule blocks no new ticket and, among those rules, catches the most repeats.
  const bestSafe = Math.max(...RULES.map((r) => evaluate(r)).filter((e) => e.blocked === 0).map((e) => e.caught));
  const good = res.blocked === 0 && res.caught === bestSafe;

  const ship = () => {
    setShipped(true);
    setShips((n) => n + 1);
    if (!good && ships < 1) return;
    complete(good ? "Shipped the best key" : res.blocked > 0 ? "Shipped a key that blocks new tickets" : "Shipped a key that lets duplicates through");
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel agents07-ticket-key">
        <p className="agents07-ticket-key-note">
          Eleven requests reach <span className="w-mono">open_ticket</span>. Some repeat an earlier one and some are new. Every attempt has its own tool call id. Choose what the key is built from, then read each row.
        </p>

        <fieldset className="agents07-ticket-key-rules">
          <legend className="w-label">What the key is built from</legend>
          {RULES.map((r) => (
            <label key={r.id} className={`agents07-ticket-key-rule${r.id === ruleId ? " on" : ""}`}>
              <input
                type="radio"
                name="agents07-ticket-key-rule"
                checked={r.id === ruleId}
                onChange={() => {
                  setRuleId(r.id);
                  setShipped(false);
                }}
              />
              <span>
                <strong>{r.name}</strong>
                <span className="agents07-ticket-key-desc">{r.desc}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <ol className="agents07-ticket-key-list">
          {res.rows.map((r, i) => (
            <motion.li key={`${ruleId}-${i}`} className={`agents07-ticket-key-item ${r.outcome}`} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
              <span className="agents07-ticket-key-n">{i + 1}</span>
              <span className="agents07-ticket-key-body">
                <span className="agents07-ticket-key-q">
                  <strong>{r.call.title}</strong> with PEPs {r.call.peps.join(", ")} in thread {r.call.thread}. Body: {r.call.body}
                </span>
                <span className="agents07-ticket-key-key w-mono">key from: {r.key}</span>
                <span className="agents07-ticket-key-truth">{truth(r.call, i)}</span>
              </span>
              <span className={`w-chip ${CHIP[r.outcome]}`}>{LABEL[r.outcome]}</span>
            </motion.li>
          ))}
        </ol>

        <p className="agents07-ticket-key-sum" role="status">
          Caught {res.caught} of {TOTAL_REPEATS} repeats. Missed {res.missed}. Wrongly blocked {res.blocked} new {res.blocked === 1 ? "ticket" : "tickets"}.
        </p>

        <div className="w-row">
          <button type="button" className="w-btn primary" onClick={ship} disabled={shipped}>
            Ship this key
          </button>
        </div>

        {shipped && (
          <div className={`w-verdict ${good ? "good" : "bad"}`} role="status">
            {good ? (
              <>
                <strong>The best choice here.</strong> This key catches {res.caught} repeats and blocks no new ticket. It still misses {res.missed}, because the reworded title in row 11 can only be matched by meaning. The writer&apos;s prompt tells it to file once, which covers that gap.
              </>
            ) : res.blocked > 0 ? (
              <>
                <strong>Too aggressive.</strong> It catches {res.caught} repeats, but it tells the desk a ticket already exists for {res.blocked} {res.blocked === 1 ? "request" : "requests"} that are new. A blocked ticket is never filed, and nobody sees that it was dropped.
              </>
            ) : (
              <>
                <strong>Safe but leaky.</strong> It blocks nothing wrongly, but it lets {res.missed} repeats through, and each one is a duplicate ticket. Normalise more of the request, and leave out fields the model may reword.
              </>
            )}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
