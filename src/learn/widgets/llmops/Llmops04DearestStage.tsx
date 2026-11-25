import { useMemo, useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops04DearestStage.css";

// Two worked-example datasets: 16 desk requests and 16 /ask requests. The numbers come from a seeded run
// (seed 5) and were priced with the capstone's own stage_costs before they were copied here.
// Each request holds the milliseconds of each stage and, for model stages, [calls, tokens in, tokens out].
// Every price is a placeholder. CHECK: replace the placeholder prices with the provider's current prices.

type Req = { ms: Record<string, number>; use: Record<string, [number, number, number]> };
type Price = { input: number; output: number };
type Dataset = "desk" | "ask";
type SortKey = "cost" | "p95";

const DESK: Req[] = [
  { ms: { triage: 506, researcher: 5527, "tool.search_peps": 754, "tool.read_pep_section": 126, writer: 7643, "tool.open_ticket": 586 }, use: { triage: [1, 680, 27], researcher: [2, 5166, 474], writer: [1, 5994, 760] } },
  { ms: { triage: 573, researcher: 3841, "tool.search_peps": 651 }, use: { triage: [1, 739, 29], researcher: [2, 5098, 344] } },
  { ms: { triage: 482, researcher: 4114, "tool.search_peps": 1202 }, use: { triage: [1, 693, 30], researcher: [2, 5033, 440] } },
  { ms: { triage: 800, researcher: 6579, "tool.search_peps": 1074, "tool.read_pep_section": 194, writer: 7018, "tool.open_ticket": 608 }, use: { triage: [1, 692, 29], researcher: [3, 10198, 291], writer: [1, 4080, 683] } },
  { ms: { triage: 898, researcher: 6353, "tool.search_peps": 1142 }, use: { triage: [1, 640, 43], researcher: [3, 10114, 461] } },
  { ms: { triage: 574, researcher: 8171, "tool.search_peps": 1016, code_advisor: 3713, "tool.python_feature_version": 113 }, use: { triage: [1, 763, 39], researcher: [3, 10000, 291], code_advisor: [2, 2637, 440] } },
  { ms: { triage: 667, researcher: 5854, "tool.search_peps": 851, "tool.read_pep_section": 245 }, use: { triage: [1, 736, 42], researcher: [2, 5054, 372] } },
  { ms: { triage: 899, researcher: 5542, "tool.search_peps": 1253, writer: 6723, "tool.open_ticket": 337 }, use: { triage: [1, 758, 35], researcher: [3, 10327, 516], writer: [1, 4504, 1090] } },
  { ms: { triage: 701, researcher: 4692, "tool.search_peps": 932, code_advisor: 2739, "tool.python_feature_version": 147 }, use: { triage: [1, 663, 30], researcher: [2, 5247, 355], code_advisor: [2, 3716, 323] } },
  { ms: { triage: 642, researcher: 3961, "tool.search_peps": 1387, "tool.read_pep_section": 393 }, use: { triage: [1, 718, 29], researcher: [2, 5034, 527] } },
  { ms: { triage: 687, researcher: 5696, "tool.search_peps": 707, writer: 8343, "tool.open_ticket": 642 }, use: { triage: [1, 648, 31], researcher: [3, 10287, 495], writer: [1, 5614, 666] } },
  { ms: { triage: 586, researcher: 5079, "tool.search_peps": 1031, "tool.read_pep_section": 335, code_advisor: 3028, "tool.python_feature_version": 139 }, use: { triage: [1, 673, 42], researcher: [2, 5065, 366], code_advisor: [2, 3203, 336] } },
  { ms: { triage: 566, researcher: 4492, "tool.search_peps": 1131, "tool.read_pep_section": 195, code_advisor: 3783, "tool.python_feature_version": 128, writer: 8390, "tool.open_ticket": 646 }, use: { triage: [1, 773, 38], researcher: [2, 5207, 420], code_advisor: [2, 2830, 396], writer: [1, 3734, 971] } },
  { ms: { triage: 572, researcher: 4779, "tool.search_peps": 714, writer: 9112, "tool.open_ticket": 335 }, use: { triage: [1, 662, 39], researcher: [2, 5343, 537], writer: [1, 6173, 832] } },
  { ms: { triage: 868, researcher: 6492, "tool.search_peps": 1315, "tool.read_pep_section": 125, code_advisor: 3684, "tool.python_feature_version": 92 }, use: { triage: [1, 718, 35], researcher: [3, 10276, 430], code_advisor: [2, 3571, 440] } },
  { ms: { triage: 646, researcher: 4421, "tool.search_peps": 1309, "tool.read_pep_section": 329 }, use: { triage: [1, 710, 38], researcher: [2, 5238, 458] } },
];

const ASK: Req[] = [
  { ms: { embed: 229, dense: 39, sparse: 41, fuse: 3, rerank: 470, generate: 4192 }, use: { generate: [1, 2984, 242] } },
  { ms: { embed: 275, dense: 38, sparse: 20, fuse: 2, rerank: 484, generate: 3858 }, use: { generate: [1, 2461, 383] } },
  { ms: { embed: 183, dense: 67, sparse: 38, fuse: 3, rerank: 504, generate: 4423 }, use: { generate: [1, 2919, 308] } },
  { ms: { embed: 147, dense: 40, sparse: 19, fuse: 3, rerank: 465, generate: 5256 }, use: { generate: [1, 3631, 262] } },
  { ms: { embed: 196, dense: 71, sparse: 19, fuse: 3, rerank: 261, generate: 4631 }, use: { generate: [1, 2763, 254] } },
  { ms: { embed: 153, dense: 36, sparse: 17, fuse: 2, rerank: 332, generate: 4676 }, use: { generate: [1, 2696, 188] } },
  { ms: { embed: 246, dense: 57, sparse: 25, fuse: 2, rerank: 276, generate: 5117 }, use: { generate: [1, 2718, 291] } },
  { ms: { embed: 235, dense: 28, sparse: 25, fuse: 2, rerank: 382, generate: 4379 }, use: { generate: [1, 2535, 361] } },
  { ms: { embed: 149, dense: 63, sparse: 33, fuse: 2, rerank: 288, generate: 3909 }, use: { generate: [1, 3416, 343] } },
  { ms: { embed: 215, dense: 50, sparse: 40, fuse: 1, rerank: 454, generate: 4376 }, use: { generate: [1, 3454, 359] } },
  { ms: { embed: 259, dense: 37, sparse: 19, fuse: 3, rerank: 435, generate: 5009 }, use: { generate: [1, 3276, 271] } },
  { ms: { embed: 174, dense: 66, sparse: 16, fuse: 2, rerank: 240, generate: 4264 }, use: { generate: [1, 2521, 336] } },
  { ms: { embed: 278, dense: 37, sparse: 24, fuse: 3, rerank: 432, generate: 4458 }, use: { generate: [1, 3184, 285] } },
  { ms: { embed: 266, dense: 46, sparse: 29, fuse: 3, rerank: 434, generate: 4272 }, use: { generate: [1, 2625, 303] } },
  { ms: { embed: 217, dense: 59, sparse: 22, fuse: 2, rerank: 250, generate: 4007 }, use: { generate: [1, 2929, 421] } },
  { ms: { embed: 213, dense: 37, sparse: 29, fuse: 1, rerank: 302, generate: 5246 }, use: { generate: [1, 3208, 295] } },
];

// Dollars per million tokens. Placeholders. The desk agents all use the Gemini id, and /ask generates with Claude.
const DESK_PRICE: Price = { input: 0.5, output: 3.0 };
const ASK_PRICE: Price = { input: 3.0, output: 15.0 };

const AGENTS = ["triage", "researcher", "code_advisor", "writer"];

type Stage = {
  stage: string;
  ran: number;
  calls: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  share: number;
  p95: number;
};

// The same rule as the capstone's percentile: linear interpolation between the two nearest ranks.
function percentile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const pos = ((ordered.length - 1) * q) / 100;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return ordered[lo] + (ordered[hi] - ordered[lo]) * (pos - lo);
}

function account(reqs: Req[], price: Price, sort: SortKey): Stage[] {
  const names = new Set<string>();
  reqs.forEach((r) => {
    Object.keys(r.ms).forEach((n) => names.add(n));
    Object.keys(r.use).forEach((n) => names.add(n));
  });
  const rows = [...names].map((stage) => {
    let calls = 0;
    let tokensIn = 0;
    let tokensOut = 0;
    const times: number[] = [];
    reqs.forEach((r) => {
      const u = r.use[stage];
      if (u) {
        calls += u[0];
        tokensIn += u[1];
        tokensOut += u[2];
      }
      if (stage in r.ms) times.push(r.ms[stage]);
    });
    const cost = (tokensIn * price.input + tokensOut * price.output) / 1_000_000;
    return { stage, ran: times.length, calls, tokensIn, tokensOut, cost, share: 0, p95: percentile(times, 95) };
  });
  const total = rows.reduce((s, r) => s + r.cost, 0);
  rows.forEach((r) => {
    r.share = total > 0 ? r.cost / total : 0;
  });
  rows.sort((a, b) =>
    sort === "cost"
      ? b.cost - a.cost || b.p95 - a.p95 || a.stage.localeCompare(b.stage)
      : b.p95 - a.p95 || b.cost - a.cost || a.stage.localeCompare(b.stage),
  );
  return rows;
}

function requestP95(reqs: Req[]): number {
  return percentile(
    reqs.map((r) => Object.values(r.ms).reduce((s, v) => s + v, 0)),
    95,
  );
}

const n0 = (v: number) => Math.round(v).toLocaleString("en-GB");
const usd = (v: number) => v.toFixed(4);
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

type Question = { title: string; ask: string; answer: string; hint: string };

export default function Llmops04DearestStage({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [phase, setPhase] = useState<0 | 1>(0);
  const [pick, setPick] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [dataset, setDataset] = useState<Dataset>("desk");
  const [sort, setSort] = useState<SortKey>("cost");

  const deskByCost = useMemo(() => account(DESK, DESK_PRICE, "cost"), []);
  const byName = (s: string) => deskByCost.find((r) => r.stage === s)!;
  const researcher = byName("researcher");
  const writer = byName("writer");
  const deskByP95 = useMemo(() => account(DESK, DESK_PRICE, "p95"), []);

  const questions: Question[] = [
    {
      title: "Predict the dearest stage",
      ask: "Which stage will cost the most? Every agent runs gemini-3.8-flash, at the placeholder prices of 0.5 dollars per million tokens in and 3.0 per million out.",
      answer: deskByCost[0].stage,
      hint: "Not quite. Cost is tokens times price, so add the tokens in and the tokens out for the whole run of 16 requests, not for one call.",
    },
    {
      title: "Predict the slowest tail",
      ask: "Which stage will have the highest p95 time? Look at the tokens out for each call. A model writes its output one token at a time.",
      answer: deskByP95[0].stage,
      hint: "Not quite. Input is read in one pass, and output is written one token at a time. Look for the stage that writes the most in a single call.",
    },
  ];
  const q = questions[phase];
  const right = pick === q.answer;

  const check = () => {
    if (pick === null) return;
    const k = attempts + 1;
    setAttempts(k);
    if (pick === q.answer || k >= 2) {
      setResolved(true);
      if (pick === q.answer && k === 1) setFirstTry((f) => f + 1);
      if (phase === 1) {
        const first = firstTry + (pick === q.answer && k === 1 ? 1 : 0);
        complete(`Predicted ${first} of 2 on the first try`);
      }
    }
  };

  const next = () => {
    setPhase(1);
    setPick(null);
    setAttempts(0);
    setResolved(false);
  };

  const showCost = phase === 1 || (phase === 0 && resolved);
  const full = phase === 1 && resolved;

  const reqs = dataset === "desk" ? DESK : ASK;
  const price = dataset === "desk" ? DESK_PRICE : ASK_PRICE;
  const table = useMemo(() => account(reqs, price, sort), [reqs, price, sort]);
  const sumP95 = table.reduce((s, r) => s + r.p95, 0);
  const totalP95 = requestP95(reqs);

  // Before the full table, the learner sees only the four desk agents, in pipeline order, then by cost.
  const guided = AGENTS.map((a) => byName(a)).sort((a, b) =>
    showCost ? b.cost - a.cost : AGENTS.indexOf(a.stage) - AGENTS.indexOf(b.stage),
  );
  const shown = full ? table : guided;

  const verdict =
    phase === 0
      ? `The ${researcher.stage} costs the most, ${pct(researcher.share)} of the desk's spend. It calls the model two or three times per question, and each call re-reads the history so far. That is ${n0(researcher.tokensIn)} tokens in, against ${n0(writer.tokensIn)} for the ${writer.stage}. Input tokens are cheap one by one, and a stage that re-reads them across calls adds them up.`
      : `The ${deskByP95[0].stage} has the highest p95, ${n0(deskByP95[0].p95)} ms, against ${n0(researcher.p95)} ms for the ${researcher.stage}. It writes about ${n0(writer.tokensOut / writer.calls)} tokens per call, and the ${researcher.stage} about ${n0(researcher.tokensOut / researcher.calls)}. Output is written one token at a time, so a long output sets the tail. The dearest stage and the slowest stage are different stages.`;

  const note =
    dataset === "desk"
      ? `The tool stages have no model call, so they show 0.0000 and a time. The writer ran in ${writer.ran} of the 16 requests, so its p95 comes from ${writer.ran} times.`
      : "The generate stage is priced as claude-sonnet-5-5, at 3.0 and 15.0 dollars per million. The embed and rerank stages are Voyage calls. They show 0.0000 because no trace prices them. That means unpriced, and it does not mean free.";

  return (
    <div className="w-panel llmops04-dearest-stage">
      <div className="w-row between">
        <span className="w-label">{full ? "Stage accounts" : q.title}</span>
        <span className="llmops04-dearest-stage-count">Illustrative figures</span>
      </div>

      {!full && (
        <p className="llmops04-dearest-stage-lead">
          {dataset === "desk" ? "16 desk requests." : "16 /ask requests."} {q.ask}
        </p>
      )}

      <div className="llmops04-dearest-stage-scroll" role="region" aria-label="Stage account table" tabIndex={0}>
        <table className="llmops04-dearest-stage-table">
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">Ran in</th>
              <th scope="col">Calls</th>
              <th scope="col">Tokens in</th>
              <th scope="col">Tokens out</th>
              {!full && <th scope="col">Out per call</th>}
              {showCost && <th scope="col">Cost usd</th>}
              {showCost && <th scope="col">Share</th>}
              {full && <th scope="col">p95 ms</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.stage}>
                <th scope="row" className="w-mono">
                  {r.stage}
                </th>
                <td>{r.ran}</td>
                <td>{r.calls}</td>
                <td>{n0(r.tokensIn)}</td>
                <td>{n0(r.tokensOut)}</td>
                {!full && <td>{r.calls > 0 ? n0(r.tokensOut / r.calls) : "0"}</td>}
                {showCost && <td>{usd(r.cost)}</td>}
                {showCost && <td>{pct(r.share)}</td>}
                {full && <td>{n0(r.p95)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!resolved && (
        <>
          <div className="llmops04-dearest-stage-group" role="radiogroup" aria-label="Your prediction">
            <span className="w-label">{phase === 0 ? "Predict: the dearest stage" : "Predict: the highest p95"}</span>
            <div className="llmops04-dearest-stage-opts">
              {AGENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={pick === a}
                  className={`llmops04-dearest-stage-opt w-mono${pick === a ? " on" : ""}`}
                  onClick={() => setPick(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
              Check my prediction
            </button>
          </div>
          {attempts > 0 && (
            <div className="w-verdict bad" role="status">
              {q.hint}
            </div>
          )}
        </>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          {verdict}
        </div>
      )}

      {resolved && phase === 0 && (
        <div className="w-row">
          <button type="button" className="w-btn ghost" onClick={next}>
            Next prediction
          </button>
        </div>
      )}

      {full && (
        <div className="llmops04-dearest-stage-explore">
          <div className="w-row">
            <span className="w-label">Traffic</span>
            <button type="button" className="w-chip" aria-pressed={dataset === "desk"} onClick={() => setDataset("desk")}>
              Desk requests
            </button>
            <button type="button" className="w-chip" aria-pressed={dataset === "ask"} onClick={() => setDataset("ask")}>
              /ask requests
            </button>
          </div>
          <div className="w-row">
            <span className="w-label">Sort by</span>
            <button type="button" className="w-chip" aria-pressed={sort === "cost"} onClick={() => setSort("cost")}>
              Cost
            </button>
            <button type="button" className="w-chip" aria-pressed={sort === "p95"} onClick={() => setSort("p95")}>
              p95
            </button>
          </div>
          <div className="llmops04-dearest-stage-readouts">
            <div className="w-inset">
              <span className="w-label">Sum of the stage p95s</span>
              <div className="llmops04-dearest-stage-big w-mono">{n0(sumP95)} ms</div>
            </div>
            <div className="w-inset">
              <span className="w-label">p95 of the request totals</span>
              <div className="llmops04-dearest-stage-big w-mono">{n0(totalP95)} ms</div>
            </div>
          </div>
          <p className="llmops04-dearest-stage-note">
            The two figures differ because p95s do not add. A request is rarely in the slowest 5 percent of every stage at once. {note}
          </p>
        </div>
      )}
    </div>
  );
}
