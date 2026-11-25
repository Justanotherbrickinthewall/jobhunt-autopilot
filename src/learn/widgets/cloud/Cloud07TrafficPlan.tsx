import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud07TrafficPlan.css";

const SHARES = [0, 10, 25, 50, 75, 90, 100];

type Row = {
  id: string;
  revision: string;
  role: string;
  tag?: string; // the tag the revision carries now, if any
  share: number; // the right share
  keep: boolean; // whether the right list keeps the tag
};

type Scenario = { id: string; title: string; text: string; rows: Row[]; why: string };

const STABLE = "askpep-00040-zpx";
const CANARY = "askpep-00042-mfr";
const OLDER = "askpep-00041-kdq";

const SCENARIOS: Scenario[] = [
  {
    id: "t1",
    title: "The first step",
    text: "The stable revision serves everyone. The canary has the tag `sha-3c4d5e6` and no share. The loop takes the first step, 10 per cent.",
    rows: [
      { id: "stable", revision: STABLE, role: "stable", share: 90, keep: false },
      { id: "canary", revision: CANARY, role: "canary", tag: "sha-3c4d5e6", share: 10, keep: true },
    ],
    why: "The stable revision gets the other 90. The canary gets 10 and keeps its tag, because the list says where the tag points. Both entries are in the list.",
  },
  {
    id: "t2",
    title: "A rollback from 50",
    text: "The canary holds 50 per cent and the judge says rollback. The loop sends everything back to the stable revision.",
    rows: [
      { id: "stable", revision: STABLE, role: "stable", share: 100, keep: false },
      { id: "canary", revision: CANARY, role: "canary", tag: "sha-3c4d5e6", share: 0, keep: true },
    ],
    why: "The stable revision gets 100. The canary stays in the list at 0 with its tag, so its URL still works for a look at what went wrong. A canary with no share and no tag would be dropped.",
  },
  {
    id: "t3",
    title: "The last step",
    text: "The canary holds 50 per cent and the judge says promote. The loop takes the last step, 100 per cent.",
    rows: [
      { id: "stable", revision: STABLE, role: "stable", share: 0, keep: false },
      { id: "canary", revision: CANARY, role: "canary", tag: "sha-3c4d5e6", share: 100, keep: true },
    ],
    why: "The canary gets 100 and the stable revision gets 0. The list still names the stable revision. Cloud Run then drops it from `trafficStatuses`, which is why the loop saved its name at the start.",
  },
  {
    id: "t4",
    title: "A second tag",
    text: "An older revision from a deploy nobody rolled out holds the tag `sha-9f8e7d6` at 0 per cent. The loop now takes the first step for the canary.",
    rows: [
      { id: "stable", revision: STABLE, role: "stable", share: 90, keep: false },
      { id: "canary", revision: CANARY, role: "canary", tag: "sha-3c4d5e6", share: 10, keep: true },
      { id: "older", revision: OLDER, role: "older tagged revision", tag: "sha-9f8e7d6", share: 0, keep: true },
    ],
    why: "The older revision stays at 0 with its tag. A patch replaces the whole list, so an entry you leave out loses its tag, and its URL stops working.",
  },
];

type CardState = { shares: Record<string, number>; keeps: Record<string, boolean>; tries: number; done: boolean; first: boolean; miss: boolean };

const fresh = (s: Scenario): CardState => ({
  shares: Object.fromEntries(s.rows.map((r) => [r.id, 0])),
  keeps: Object.fromEntries(s.rows.map((r) => [r.id, false])),
  tries: 0,
  done: false,
  first: false,
  miss: false,
});

function ticks(text: string) {
  return text.split("`").map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : <span key={i}>{part}</span>));
}

function answerOf(s: Scenario) {
  return s.rows.map((r) => `${r.revision} at ${r.share}${r.tag && r.keep ? ` with ${r.tag}` : ""}`).join(", ");
}

function isRight(s: Scenario, c: CardState) {
  return s.rows.every((r) => c.shares[r.id] === r.share && (!r.tag || c.keeps[r.id] === r.keep));
}

export default function Cloud07TrafficPlan({ onComplete }: WidgetProps) {
  const [cards, setCards] = useState<Record<string, CardState>>(() => Object.fromEntries(SCENARIOS.map((s) => [s.id, fresh(s)])));
  const complete = useComplete(onComplete);

  const update = (id: string, patch: (c: CardState) => CardState) => setCards((all) => ({ ...all, [id]: patch(all[id]) }));

  const check = (s: Scenario) => {
    const c = cards[s.id];
    const right = isRight(s, c);
    const next: CardState = right
      ? { ...c, tries: c.tries + 1, done: true, first: c.tries === 0, miss: false }
      : c.tries === 0
        ? { ...c, tries: 1, miss: true }
        : { ...c, tries: c.tries + 1, done: true, first: false, miss: false };
    const all = { ...cards, [s.id]: next };
    setCards(all);
    if (SCENARIOS.every((x) => all[x.id].done)) {
      const firsts = SCENARIOS.filter((x) => all[x.id].first).length;
      complete(`${firsts} of ${SCENARIOS.length} right at the first try`);
    }
  };

  const reset = () => setCards(Object.fromEntries(SCENARIOS.map((s) => [s.id, fresh(s)])));

  const finished = SCENARIOS.every((s) => cards[s.id].done);
  const firsts = SCENARIOS.filter((s) => cards[s.id].first).length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel cloud07-traffic-plan">
        <p className="cloud07-traffic-plan-note">Set the whole traffic list for each situation. Revision names are invented.</p>
        <div className="w-stack">
          {SCENARIOS.map((s, i) => {
            const c = cards[s.id];
            const total = s.rows.reduce((sum, r) => sum + c.shares[r.id], 0);
            const right = c.done && isRight(s, c);
            const wrong = c.done && !right;
            return (
              <fieldset key={s.id} className={`cloud07-traffic-plan-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
                <legend className="cloud07-traffic-plan-legend">
                  Situation {i + 1}: {s.title}
                </legend>
                <p className="cloud07-traffic-plan-text">{ticks(s.text)}</p>
                <div className="cloud07-traffic-plan-rows">
                  {s.rows.map((r) => (
                    <div key={r.id} className="cloud07-traffic-plan-row">
                      <div className="cloud07-traffic-plan-who">
                        <code>{r.revision}</code>
                        <span className="cloud07-traffic-plan-role">
                          {r.role}
                          {r.tag ? `, tag ${r.tag}` : ""}
                        </span>
                      </div>
                      <label className="cloud07-traffic-plan-share">
                        <span>Share</span>
                        <select
                          value={c.shares[r.id]}
                          disabled={c.done}
                          onChange={(e) => update(s.id, (x) => ({ ...x, miss: false, shares: { ...x.shares, [r.id]: Number(e.target.value) } }))}
                        >
                          {SHARES.map((n) => (
                            <option key={n} value={n}>
                              {n} per cent
                            </option>
                          ))}
                        </select>
                      </label>
                      {r.tag ? (
                        <label className="cloud07-traffic-plan-keep">
                          <input
                            type="checkbox"
                            checked={c.keeps[r.id]}
                            disabled={c.done}
                            onChange={(e) => update(s.id, (x) => ({ ...x, miss: false, keeps: { ...x.keeps, [r.id]: e.target.checked } }))}
                          />
                          <span>Keep the tag</span>
                        </label>
                      ) : (
                        <span className="cloud07-traffic-plan-none">No tag</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="w-row cloud07-traffic-plan-foot">
                  <span className={`cloud07-traffic-plan-total${total === 100 ? " ok" : ""}`} aria-live="polite">
                    Total {total} of 100
                  </span>
                  {!c.done && (
                    <button type="button" className="w-btn primary small" disabled={total !== 100} onClick={() => check(s)}>
                      Check this list
                    </button>
                  )}
                </div>
                {c.miss && !c.done && (
                  <p className="cloud07-traffic-plan-why" role="status">
                    That list is not right. Look at the shares and at which tags stay, then try once more.
                  </p>
                )}
                {c.done && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="cloud07-traffic-plan-why" role="status">
                    {right ? (c.first ? "Right first time. " : "Right on the second try. ") : `The list is ${answerOf(s)}. `}
                    {ticks(s.why)}
                  </motion.p>
                )}
              </fieldset>
            );
          })}
        </div>
        {finished && (
          <>
            <div className={`w-verdict ${firsts >= 3 ? "good" : "bad"}`} role="status">
              You got {firsts} of {SCENARIOS.length} right at the first try. Every list names both revisions, keeps every tag at least at 0, and adds up to 100.
            </div>
            <div className="w-row">
              <button type="button" className="w-btn ghost" onClick={reset}>
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
