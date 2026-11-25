import { useEffect, useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C07FollowupDrill.css";

// Illustrative drill. Harbour Supplies is fictional and every figure is made up for practice.
type Opt = { t: string; ok: boolean; why: string };
type Case = { ask: string; opts: Opt[] };
type Design = { id: string; label: string; cases: Case[] };

const SECONDS = 60;

const DESIGNS: Design[] = [
  {
    id: "design-02",
    label: "Chapter two: document intake",
    cases: [
      {
        ask: "Ten times the load: 500,000 documents a day instead of 50,000.",
        opts: [
          { t: "Add workers and raise the provider quota. The rest of the design stays as drawn.", ok: false, why: "Workers and quota are the quick parts. This misses the human review queue, which is the slowest to scale, and it names nothing to measure." },
          { t: "The review queue breaks first: 5 percent of 500,000 is 25,000 reviews, about 167 reviewers. Workers and quota scale in days. The queue and ledger design stay. I would watch queue age, with an alert at half a working day.", ok: true, why: "It names the first break with a worked number, says what stays, and gives a measure." },
          { t: "Move to a faster model so documents clear sooner.", ok: false, why: "Model speed is not the constraint here. Reviewers are, and the answer has no number and nothing to measure." },
        ],
      },
      {
        ask: "The review queue is backing up and its one-day target is at risk. What do you do?",
        opts: [
          { t: "Auto-approve everything above 0.5 confidence to empty the queue.", ok: false, why: "It empties the queue by removing the control. Errors reach the ledger and nothing measures them." },
          { t: "Tell the customer the turnaround is now eight hours.", ok: false, why: "It may be the last resort, but it offers no mitigation and no measure." },
          { t: "Let more documents skip review, but only in document classes with proven precision. Check field precision on a daily sample. The queue design stays. I measure precision and queue age together.", ok: true, why: "It relieves the queue where risk is lowest, keeps the control elsewhere, and pairs the change with a quality measure." },
        ],
      },
      {
        ask: "How would you know intake is in trouble before the customer does?",
        opts: [
          { t: "Three alerts: review queue age over half a working day, field precision on the daily sample under 98 percent, and any document retried more than three times. Each has an action.", ok: true, why: "One signal each on lag, quality and the failure mode, with thresholds and actions." },
          { t: "A dashboard of documents processed per hour.", ok: false, why: "Throughput can look healthy while the review queue ages. A dashboard without thresholds alerts nobody." },
          { t: "Wait for the finance team to report missing invoices.", ok: false, why: "That is the customer finding out first, which is the situation the question asks you to avoid." },
        ],
      },
    ],
  },
  {
    id: "design-03",
    label: "Chapter three: an agent with approvals",
    cases: [
      {
        ask: "The model behind the agent is retired in 90 days.",
        opts: [
          { t: "Swap it and ship. The prompts are portable.", ok: false, why: "A new model can change tool-call behaviour. Shipping without evals or a staged rollout is a gamble." },
          { t: "Rewrite the agent from scratch for the new model.", ok: false, why: "The gates, policy and audit log do not depend on the model. A rewrite throws them away and resets the evals." },
          { t: "Swap the model behind the tool layer. Policy, approval gates and the audit log stay. Re-run the trajectory evals against the baseline, roll out by permission tier with read-only first, and track attack success rate as well as task success.", ok: true, why: "It separates what changes from what stays, uses the evals as the gate, and rolls out by risk." },
        ],
      },
      {
        ask: "What breaks first at ten times the load?",
        opts: [
          { t: "The model API, so I would buy more throughput.", ok: false, why: "Model capacity scales on request. It is rarely the first thing to break." },
          { t: "The audit log, because it grows ten times.", ok: false, why: "Storage is cheap and scales without a decision. It is not the first break." },
          { t: "The approval queue. Approvers are a fixed number and approvals time out. I would add a second tier for low-value actions and measure the share of approvals that expire unread.", ok: true, why: "The human gate is the slowest part to scale, and the answer ends in a measure." },
        ],
      },
      {
        ask: "How would you know a prompt injection is working on your agent?",
        opts: [
          { t: "Read the logs each Friday.", ok: false, why: "It has no threshold, no owner and a week of delay. An injection can finish a payment in a minute." },
          { t: "Three signals: attack success rate on a weekly injection suite, any write call with no matching approval id with a threshold of zero, and approvals expiring unread above 5 percent.", ok: true, why: "It combines a quality measure, a zero-tolerance control check and a load signal." },
          { t: "Rely on the model to refuse bad instructions.", ok: false, why: "The policy layer has to catch it. A model refusal is a hope, not a control." },
        ],
      },
    ],
  },
  {
    id: "design-04",
    label: "Chapter four: an enterprise copilot",
    cases: [
      {
        ask: "A customer outside the Harbour group joins and shares the system.",
        opts: [
          { t: "Add a tenant id to each record and ask the model in the prompt to answer only from the right tenant.", ok: false, why: "A prompt instruction is advice, not enforcement. One failure leaks one company's documents into another's answers." },
          { t: "Decide isolation first. A separate index per tenant removes cross-tenant bleed by design, at the cost of storage and sync times the tenant count. Permissions stay trimmed at query time inside each tenant. I would run a cross-tenant leakage test and alert on any cited source the asker cannot open.", ok: true, why: "It makes the isolation choice, states what it costs, and keeps a zero-tolerance check." },
          { t: "Share the index and trust the permission trimming, since users are already limited.", ok: false, why: "A tenant boundary is separate from a user permission. A single trimming bug would expose every tenant." },
        ],
      },
      {
        ask: "What breaks first at ten times the queries?",
        opts: [
          { t: "Change sync against source throttling. Graph and ServiceNow limit requests, so the index falls behind. I would widen the staleness budget for low-risk sources, cap retrieval depth, and watch the oldest unsynced item against its source's budget, such as 30 minutes for SharePoint.", ok: true, why: "The first break is in a system you do not own, and the answer gives a lever and a measure." },
          { t: "The vector index, so I would split it across more machines.", ok: false, why: "Search scales with hardware you control. The sources are the limit." },
          { t: "The model's context window.", ok: false, why: "More queries do not change the size of any one prompt." },
        ],
      },
      {
        ask: "How would you know the copilot is going wrong?",
        opts: [
          { t: "Track the average answer rating from users.", ok: false, why: "It lags, and users cannot see a leak or a missing source. A rating cannot catch a permission failure." },
          { t: "Monitor API uptime.", ok: false, why: "The copilot can serve wrong or leaked answers while fully up." },
          { t: "Oldest unsynced item beyond its source's budget, such as 30 minutes for SharePoint, tokens per query at the 95th percentile over twice baseline, and any answer citing a source the asker cannot open with a threshold of zero.", ok: true, why: "It watches lag, cost and the one failure that must never happen." },
        ],
      },
    ],
  },
  {
    id: "design-05",
    label: "Chapter five: questions over data",
    cases: [
      {
        ask: "A new residency rule says all rows must stay in one region.",
        opts: [
          { t: "Move the warehouse into the region. The model call is a separate matter.", ok: false, why: "Result rows go into the summary prompt. If the model endpoint is outside the region, the rows leave with it." },
          { t: "Strip the column names and keep sending the rows.", ok: false, why: "The rows are the data. Hiding column names does not keep them in the region." },
          { t: "Ask whether the rule covers the prompt. Rows and schema go to the model, so the endpoint must be in region, or the summary step must see only aggregates. The validator, read-only role and row limits stay. I would log the endpoint region per call to prove it.", ok: true, why: "It finds the data path the rule touches, keeps the controls, and ends in evidence." },
        ],
      },
      {
        ask: "What breaks first at ten times the users?",
        opts: [
          { t: "The model, so I would add replicas.", ok: false, why: "Model capacity is the easy part to scale, and the replicas would not touch the warehouse." },
          { t: "Warehouse scans. More users mean more wide queries on shared compute. I would cap rows scanned, require date filters, set a query time-out on the role, and watch the share of queries that hit it.", ok: true, why: "It names the shared resource and gives four controls and a measure." },
          { t: "The schema linker's memory use.", ok: false, why: "It is a small in-process step and does not grow with the warehouse load." },
        ],
      },
      {
        ask: "How would you know the answers are drifting?",
        opts: [
          { t: "Execution accuracy on a fixed question set under 80 percent, validator rejections above 10 percent in an hour, and queries past the 10-second time-out above 2 percent.", ok: true, why: "It checks answers by running them, and watches both the validator and the cost of queries." },
          { t: "String match against the expected SQL.", ok: false, why: "Two different queries can return the same correct rows. Compare results, not text." },
          { t: "Wait for users to report wrong numbers.", ok: false, why: "A wrong join looks right, so users may act on it before anyone reports it." },
        ],
      },
    ],
  },
  {
    id: "design-06",
    label: "Chapter six: a million-record batch job",
    cases: [
      {
        ask: "Half the cost: the million-record job must cost half as much.",
        opts: [
          { t: "Drop the QA sample, which is pure overhead.", ok: false, why: "The sample is the only measure of error. Cutting it hides the quality cost of the saving." },
          { t: "Batch is already half. Trim the prompt and schema from 200 tokens to 100 and send the easy 40 percent to a cheaper model. That reaches about 1,627.50 pounds against a 1,237.50 target, so I name the gap and the next lever.", ok: true, why: "The arithmetic is worked, the gap is admitted and the next lever is named." },
          { t: "Switch every record to the cheapest model.", ok: false, why: "Quality is unmeasured and the answer has no number. It claims the target without showing it." },
        ],
      },
      {
        ask: "The job dies at record 600,000 and restarts. What breaks first?",
        opts: [
          { t: "Nothing. The batch provider resumes the run.", ok: false, why: "The provider does not know which of your writes already landed. Duplicates are the risk." },
          { t: "Start again from record one. It is only a day.", ok: false, why: "It repeats the spend, and it posts 600,000 records twice unless the writes are idempotent." },
          { t: "Duplicates. Without idempotency keys, records already written post twice. Key on record id plus extraction version, resume from the checkpoint, and alert on any duplicate write after a restart at a threshold of zero.", ok: true, why: "It names the real failure, the fix, and a zero-tolerance alert." },
        ],
      },
      {
        ask: "How would you know the run is going wrong while it is still running?",
        opts: [
          { t: "Watch total spend.", ok: false, why: "Spend stays on plan while quality drifts. It is the wrong signal for this failure." },
          { t: "Check the results once the job finishes.", ok: false, why: "By then the whole budget is spent." },
          { t: "Chunks behind plan by more than one hour, sampled error rate above the agreed ceiling, and dead letters above 1 percent. Duplicate writes stay at zero.", ok: true, why: "Lag, quality and the failure mode, each readable mid-run." },
        ],
      },
    ],
  },
];

export default function C07FollowupDrill({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [designId, setDesignId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [over, setOver] = useState(0);
  const [secs, setSecs] = useState(SECONDS);
  const [finished, setFinished] = useState(false);

  const design = DESIGNS.find((d) => d.id === designId) ?? null;
  const total = design ? design.cases.length : 0;
  const current = design ? design.cases[idx] : null;
  const caseDone = solved || wrong.length >= 2;

  useEffect(() => {
    if (!design || caseDone || finished) return;
    const t = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [design, idx, caseDone, finished]);

  function start(id: string) {
    setDesignId(id);
    setIdx(0);
    setWrong([]);
    setSolved(false);
    setFirstTry(0);
    setOver(0);
    setSecs(SECONDS);
    setFinished(false);
  }

  function pick(i: number) {
    if (!current || !design || caseDone || wrong.includes(i)) return;
    const ok = current.opts[i].ok;
    const isLate = secs === 0;
    const nextWrong = ok ? wrong : [...wrong, i];
    const done = ok || nextWrong.length >= 2;
    const firstOk = ok && wrong.length === 0;
    if (ok) setSolved(true);
    else setWrong(nextWrong);
    if (done) {
      const ft = firstTry + (firstOk ? 1 : 0);
      const ov = over + (isLate ? 1 : 0);
      setFirstTry(ft);
      setOver(ov);
      if (idx === total - 1) {
        setFinished(true);
        complete(`${ft} of ${total} follow-ups right first time on ${design.id}; ${ov} over the minute`);
      }
    }
  }

  function next() {
    setIdx((n) => n + 1);
    setWrong([]);
    setSolved(false);
    setSecs(SECONDS);
  }

  if (!design || !current) {
    return (
      <div className="w-panel design-followup-drill">
        <p className="design-followup-drill-lede">
          The interviewer has your drawing and changes one fact. Choose the design to defend. You get three follow-ups and a minute for each.
        </p>
        <div className="design-followup-drill-designs" role="group" aria-label="Choose a design">
          {DESIGNS.map((d) => (
            <button key={d.id} type="button" className="w-btn ghost design-followup-drill-design" onClick={() => start(d.id)}>
              {d.label}
            </button>
          ))}
        </div>
        <p className="design-followup-drill-foot">Illustrative figures. Harbour Supplies is a fictional customer.</p>
      </div>
    );
  }

  return (
    <div className="w-panel design-followup-drill">
      <div className="w-row design-followup-drill-bar">
        <span className="w-label">{design.id}, follow-up {idx + 1} of {total}</span>
        <span className={`w-mono design-followup-drill-clock${secs === 0 ? " is-late" : ""}`} role="timer" aria-live="off">
          {secs === 0 ? "Over time" : `0:${String(secs).padStart(2, "0")}`}
        </span>
      </div>
      <p className="design-followup-drill-ask">{current.ask}</p>
      <p className="design-followup-drill-lede">Pick the answer you would say aloud. The best one says what changes, what stays and what you would measure.</p>
      <div className="design-followup-drill-options">
        {current.opts.map((o, i) => {
          const tried = wrong.includes(i);
          const reveal = caseDone && o.ok;
          const cls = tried ? " is-wrong" : reveal ? " is-right" : "";
          return (
            <div key={o.t}>
              <button
                type="button"
                className={`w-btn ghost design-followup-drill-opt${cls}`}
                onClick={() => pick(i)}
                disabled={caseDone || tried}
              >
                {o.t}
              </button>
              {(tried || reveal) && <p className={`design-followup-drill-why ${o.ok ? "ok" : "miss"}`}>{o.why}</p>}
            </div>
          );
        })}
      </div>
      {wrong.length === 1 && !caseDone && (
        <div className="w-verdict bad" role="status">
          That answer misses. Read why, then try once more. A second miss shows the best answer.
        </div>
      )}
      {caseDone && !finished && (
        <button type="button" className="w-btn" onClick={next}>
          Next follow-up
        </button>
      )}
      {finished && (
        <>
          <div className={`w-verdict ${firstTry === total ? "good" : "bad"}`} role="status">
            <strong>{firstTry} of {total} right first time.</strong> {over > 0 ? `${over} went over the minute. ` : "Every answer fit in the minute. "}
            {firstTry === total ? "Each answer named what changes, what stays and what to measure." : "Reread the answers marked in rose. The pattern is the same every time: the part that breaks first, the number, the measure."}
          </div>
          <button type="button" className="w-btn ghost" onClick={() => setDesignId(null)}>
            Try another design
          </button>
        </>
      )}
    </div>
  );
}
