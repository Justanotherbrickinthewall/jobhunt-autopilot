import { useId, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture02MonthProjection.css";

// The rows come from `askpep incident seed --kind slow_rerank`, which writes 240 /ask-shaped trace rows with one
// `generate` stage on claude-sonnet-5-5. The totals below are summed over those 240 rows, so the widget gives the
// same figures as `askpep cost-model --file` does at 1000 requests a day for 30 days. The prices are placeholders.
// CHECK: replace the placeholder prices with the provider's current prices before you trust a cost figure.

const ROWS = 240;
const TOKENS_IN = 520263;
const TOKENS_OUT = 83470;
const REFUSED = 3;
const DAYS = 30;
const MEASURED_SUCCESS = (ROWS - REFUSED) / ROWS;

type Price = { input: number; output: number };
type Target = { id: string; label: string; price: Price };

const NOW: Target = { id: "now", label: "claude-sonnet-5-5, as measured", price: { input: 3.0, output: 15.0 } };
const TARGETS: Target[] = [
  NOW,
  { id: "flash38", label: "gemini-3.8-flash", price: { input: 0.5, output: 3.0 } },
  { id: "flash35", label: "gemini-3.5-flash", price: { input: 0.3, output: 2.5 } },
];

type Option = { id: string; label: string; hint: string };

const OPTIONS: Option[] = [
  { id: "a", label: "About 30 percent. Only the cache saves money.", hint: "The reroute saves money too. It cuts the price of every call that does reach a model." },
  { id: "b", label: "About 82 percent. Only the cheaper model saves money.", hint: "The cache saves money too. A hit never reaches a model, so it costs nothing." },
  { id: "c", label: "About 87 percent. The two savings multiply.", hint: "" },
  { id: "d", label: "About 112 percent. The two savings add.", hint: "A saving cannot exceed the whole bill. The cache removes 30 percent of the calls, and the reroute cuts the price of the other 70 percent." },
];
const ANSWER = "c";

const usd = (n: number) => `${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
const usd4 = (n: number) => `${n.toFixed(4)} USD`;

const perRequest = (p: Price) => ((TOKENS_IN * p.input + TOKENS_OUT * p.output) / 1_000_000) / ROWS;

function projection(perReq: number, perDay: number, hit: number, success: number) {
  const volume = perDay * DAYS * (1 - hit);
  const divisor = hit + (1 - hit) * success;
  return { monthly: perReq * volume, perTask: divisor > 0 ? ((1 - hit) * perReq) / divisor : null, volume };
}

export default function Architecture02MonthProjection({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const dayId = useId();
  const hitId = useId();
  const successId = useId();
  const [pick, setPick] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [perDay, setPerDay] = useState(1000);
  const [hitPct, setHitPct] = useState(30);
  const [target, setTarget] = useState("flash38");
  const [afterPct, setAfterPct] = useState(MEASURED_SUCCESS * 100);

  const right = pick === ANSWER;
  const picked = OPTIONS.find((o) => o.id === pick);

  const check = () => {
    if (pick === null) return;
    const k = attempts + 1;
    setAttempts(k);
    if (pick === ANSWER || k >= 2) {
      setResolved(true);
      complete(
        pick === ANSWER && k === 1
          ? "Saw that the cache and the reroute multiply, on the first try"
          : pick === ANSWER
            ? "Saw that the cache and the reroute multiply, on the second try"
            : "Needed the explanation for how the two savings combine",
      );
    }
  };

  const chosen = TARGETS.find((t) => t.id === target) ?? NOW;
  const before = projection(perRequest(NOW.price), perDay, 0, MEASURED_SUCCESS);
  const after = projection(perRequest(chosen.price), perDay, hitPct / 100, afterPct / 100);
  const beforeTask = before.perTask ?? 0;
  const fall = before.monthly > 0 ? 1 - after.monthly / before.monthly : 0;
  const changed = Math.abs(afterPct / 100 - MEASURED_SUCCESS) > 0.0005;
  const taskFalls = after.perTask !== null && after.perTask < beforeTask;

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel architecture02-month-projection">
        <div className="w-row between">
          <span className="w-label">A month of /ask traffic</span>
          <span className="architecture02-month-projection-count">Illustrative figures</span>
        </div>
        <p className="architecture02-month-projection-note">
          {ROWS} seeded trace rows, one generate stage on claude-sonnet-5-5, {REFUSED} of them refusals. At 1000 requests a day for {DAYS} days and placeholder prices, the month costs{" "}
          {usd(projection(perRequest(NOW.price), 1000, 0, MEASURED_SUCCESS).monthly)}.
        </p>

        {!resolved && (
          <>
            <div className="architecture02-month-projection-group" role="radiogroup" aria-label="Your prediction">
              <span className="w-label">Predict: the two changes together</span>
              <p className="architecture02-month-projection-ask">
                You send the generate stage to gemini-3.8-flash and set a cache hit rate of 0.3. How far does the month fall?
              </p>
              <div className="architecture02-month-projection-opts">
                {OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={pick === o.id}
                    className={`architecture02-month-projection-opt${pick === o.id ? " on" : ""}`}
                    onClick={() => setPick(o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-row">
              <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
                Check my prediction
              </button>
            </div>
            {attempts > 0 && picked && (
              <div className="w-verdict bad" role="status">
                Not quite. {picked.hint} Work out what share of the old bill each change leaves, then combine the shares.
              </div>
            )}
          </>
        )}

        {resolved && (
          <>
            <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
              <strong>{right ? "Correct. " : "Not quite. "}</strong>
              The month falls by about 87 percent. The cache leaves 70 percent of the calls, and the reroute leaves about 18 percent of each call&apos;s price. Multiply 0.70 by 0.18 and about 13 percent of the bill
              remains. Now change the inputs.
            </div>

            <div className="architecture02-month-projection-controls">
              <div>
                <label htmlFor={dayId} className="w-label">
                  Requests a day: {perDay.toLocaleString("en-GB")}
                </label>
                <input id={dayId} type="range" min={100} max={5000} step={100} value={perDay} onChange={(e) => setPerDay(Number(e.target.value))} />
              </div>
              <div>
                <label htmlFor={hitId} className="w-label">
                  Cache hit rate: {(hitPct / 100).toFixed(2)}
                </label>
                <input id={hitId} type="range" min={0} max={60} step={5} value={hitPct} onChange={(e) => setHitPct(Number(e.target.value))} />
              </div>
              <div role="radiogroup" aria-label="Model for the generate stage" className="architecture02-month-projection-targets">
                <span className="w-label">Model for the generate stage</span>
                {TARGETS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={target === t.id}
                    className={`w-chip${target === t.id ? " is-on" : ""}`}
                    onClick={() => setTarget(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div>
                <label htmlFor={successId} className="w-label">
                  Success rate after the change: {afterPct.toFixed(2)} percent
                </label>
                <input id={successId} type="range" min={50} max={100} step={0.25} value={afterPct} onChange={(e) => setAfterPct(Number(e.target.value))} />
                <p className="architecture02-month-projection-fine">
                  The command holds the measured rate fixed at {(MEASURED_SUCCESS * 100).toFixed(2)} percent and cannot see a fall. This slider is the widget&apos;s addition, to show what the command assumes away.
                </p>
              </div>
            </div>

            <div className="architecture02-month-projection-bars" aria-hidden="true">
              <div className="architecture02-month-projection-track">
                <motion.span
                  className="architecture02-month-projection-fill after"
                  initial={false}
                  animate={{ width: `${before.monthly > 0 ? Math.min(100, (after.monthly / before.monthly) * 100) : 0}%` }}
                />
              </div>
            </div>

            <div className="architecture02-month-projection-readouts">
              <div className="w-inset">
                <span className="w-label">Month, now</span>
                <div className="architecture02-month-projection-big w-mono">{usd(before.monthly)}</div>
              </div>
              <div className="w-inset">
                <span className="w-label">Month, with the changes</span>
                <div className="architecture02-month-projection-big w-mono">{usd(after.monthly)}</div>
              </div>
              <div className="w-inset">
                <span className="w-label">Cost per successful task</span>
                <div className="architecture02-month-projection-big w-mono">
                  {after.perTask === null ? "none" : usd4(after.perTask)}
                </div>
              </div>
            </div>

            <div className="w-row" role="group" aria-label="Checks">
              <span className="w-chip good">The month falls {(fall * 100).toFixed(0)} percent</span>
              <span className={`w-chip ${taskFalls ? "good" : "bad"}`}>{taskFalls ? "Cost per successful task falls" : "Cost per successful task does not fall"}</span>
              <span className={`w-chip ${changed ? "warn" : "good"}`}>{changed ? "Success rate moved, so run the eval" : "Success rate held, as the command assumes"}</span>
            </div>
            <div className={`w-verdict ${changed ? "bad" : "good"}`} role="status">
              {changed
                ? "The cost model has no way to know this fall. Only the eval gate can measure it, so a cheaper model is a hypothesis until the slice scores say it holds."
                : "The projection holds the success rate at the measured value. That is the one assumption to check with the eval before you believe the saving."}
            </div>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
