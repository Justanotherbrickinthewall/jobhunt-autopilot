import { useMemo, useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops07ChangePoint.css";

// Illustrative figures. The total latency in milliseconds of the 240 rows that
// `askpep incident seed --kind slow_rerank` writes. The seed is fixed, so a learner's file holds the same
// values. Rows 0 to 119 are healthy. The regression starts at row 120.
const SLOW_RERANK: number[] = [
  2573.6, 3316.9, 2774.5, 3742.0, 2445.3, 2728.5, 3057.5, 2228.0, 2744.7, 2985.5, 2641.1, 3397.2,
  2592.4, 2521.4, 2434.2, 2277.1, 3033.9, 2754.8, 2453.1, 2453.9, 2032.8, 2762.3, 2907.2, 2509.4,
  2836.9, 2603.5, 2083.1, 3008.4, 263.4, 2132.3, 3071.7, 2257.7, 2828.1, 3319.2, 2506.1, 2483.2,
  299.1, 2449.4, 2201.5, 3020.3, 2681.2, 2892.4, 2917.4, 1888.2, 3574.8, 2704.9, 2804.8, 3345.0,
  3715.1, 2834.3, 2305.0, 3060.8, 2430.4, 1911.6, 3659.0, 2196.0, 3411.0, 3697.5, 2877.8, 2950.5,
  1706.1, 2473.3, 2899.0, 2105.7, 2530.5, 3350.3, 1979.1, 2486.5, 2968.9, 3267.9, 2764.1, 2862.9,
  2352.4, 3122.2, 2640.0, 2155.0, 2492.0, 3412.5, 2484.6, 2209.0, 2768.8, 3011.6, 2580.1, 2659.5,
  2416.0, 2765.1, 3024.9, 3712.5, 2761.7, 2233.9, 2074.6, 2637.6, 3141.2, 2312.9, 2778.6, 3082.5,
  2359.4, 2928.6, 3243.8, 2679.3, 2800.6, 2722.2, 2046.8, 3528.8, 2482.1, 2895.7, 2645.9, 2787.0,
  3673.8, 2471.1, 3140.2, 2265.9, 2105.5, 2986.6, 2922.1, 3132.3, 1768.6, 2818.3, 3081.1, 3211.2,
  4242.6, 3445.8, 4158.6, 4200.1, 3318.7, 3515.2, 3162.6, 3402.0, 3411.6, 3162.8, 2905.1, 3815.6,
  3263.5, 3995.8, 4187.7, 3084.1, 3820.4, 3638.6, 3285.9, 3759.7, 2952.3, 4106.6, 3887.3, 2274.5,
  3524.7, 3363.9, 3276.4, 4090.0, 3627.0, 3839.4, 3387.0, 3464.9, 3497.6, 3443.2, 3871.0, 3716.7,
  2982.8, 1247.0, 4615.4, 3246.5, 3760.8, 3550.0, 2935.1, 3813.8, 3580.1, 3622.4, 3173.2, 3707.7,
  3902.2, 3503.6, 4130.6, 4540.2, 3507.6, 4746.0, 3477.6, 3698.4, 3736.2, 3817.2, 3414.0, 3308.9,
  3674.3, 3012.6, 3746.6, 4170.8, 3742.5, 4300.5, 3238.4, 4073.3, 3268.2, 3877.9, 3669.5, 3549.3,
  3955.6, 4267.9, 3947.4, 4303.1, 3633.2, 4000.4, 3733.7, 3734.1, 3227.0, 3735.6, 4457.0, 3301.9,
  3266.0, 4051.3, 2809.3, 3844.5, 3479.0, 3211.9, 4104.5, 3770.8, 3786.8, 3715.3, 3492.7, 4585.6,
  4167.9, 3920.6, 3676.9, 3426.6, 4412.1, 3306.3, 3435.1, 3632.9, 3598.1, 4083.5, 3936.7, 3466.4,
  3259.3, 4119.4, 2832.1, 4026.1, 4019.7, 4138.7, 3473.7, 3645.6, 4217.8, 3183.3, 3404.9, 4033.5,
];
const TRUE_ONSET = 120;
const SECONDS_PER_ROW = 30;
// The same numbers as change_point in askpep/telemetry/incident.py.
const MIN_SIDE = 3;
const MIN_ROWS = 8;
const MIN_GAP = 0.25;

type Split = { at: number; before: number; after: number; score: number; gap: number };
type Analysis = { splits: Split[]; best: Split; found: number | null };

function analyse(values: number[]): Analysis {
  const n = values.length;
  const prefix = [0];
  for (const v of values) prefix.push(prefix[prefix.length - 1] + v);
  const splits: Split[] = [];
  for (let at = MIN_SIDE; at <= n - MIN_SIDE; at++) {
    const before = prefix[at] / at;
    const after = (prefix[n] - prefix[at]) / (n - at);
    const score = Math.abs(after - before) * Math.sqrt((at * (n - at)) / n);
    splits.push({ at, before, after, score, gap: Math.abs(after - before) / Math.abs(before) });
  }
  let best = splits[0];
  for (const s of splits) if (s.score > best.score) best = s;
  const found = n >= MIN_ROWS && best.gap >= MIN_GAP ? best.at : null;
  return { splits, best, found };
}

type Question = { prompt: string; options: string[]; answer: number; why: (a: Analysis, split: Split) => string };
type Run = { id: string; title: string; intro: string; values: number[]; truth: number | null; question: Question };

const RUNS: Run[] = [
  {
    id: "shifted",
    title: "Run one: rerank goes nine times slower at row 120",
    intro: "This is the total latency of every request in a slow_rerank file. Find the row where the level changes.",
    values: SLOW_RERANK,
    truth: TRUE_ONSET,
    question: {
      prompt: `Lock your split and read the result. The seeder broke the system at row ${TRUE_ONSET}, as a deploy log would say. Which row goes in the postmortem timeline?`,
      options: [
        `Row ${TRUE_ONSET} from the deploy log, passed to incident diagnose with --at.`,
        "The row change_point picked, because it was computed from the data.",
        "The row halfway between the two, so the error is split.",
      ],
      answer: 0,
      why: (a) =>
        `change_point picked row ${a.found}. The deploy log says row ${TRUE_ONSET}. A record beats an estimate, and --at makes the diagnosis use the recorded time. The difference here is ${Math.abs(TRUE_ONSET - (a.found ?? TRUE_ONSET)) * SECONDS_PER_ROW} seconds.`,
    },
  },
  {
    id: "steady",
    title: "Run two: only the healthy hour, with nothing broken",
    intro: "These are the first 120 rows of the same file, before the regression. Nothing changed in them.",
    values: SLOW_RERANK.slice(0, TRUE_ONSET),
    truth: null,
    question: {
      prompt: "Every run has a best split. What does change_point return for this run?",
      options: [
        "A time, because the best split always scores something.",
        "None, because the means of the best split differ by less than 25 percent.",
      ],
      answer: 1,
      why: (a) =>
        `The best split is at row ${a.best.at}, with a score of ${a.best.score.toFixed(0)}. Its two means differ by ${(a.best.gap * 100).toFixed(1)} percent, which is under the 25 percent limit. So change_point returns None.`,
    },
  },
];

type RunState = { split: number; locked: boolean; picks: number[]; done: boolean; right: boolean };
const fresh = (): RunState => ({ split: 40, locked: false, picks: [], done: false, right: false });

const W = 600;
const PAD = 10;

function ChartRow({ run, a, state }: { run: Run; a: Analysis; state: RunState }) {
  const values = run.values;
  const n = values.length;
  const top = 5000;
  const x = (i: number) => PAD + ((W - 2 * PAD) * i) / (n - 1);
  const y = (v: number) => 8 + 164 * (1 - v / top);
  const line = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const cur = a.splits.find((s) => s.at === state.split) ?? a.splits[0];
  const gate = (i: number) => x(i - 0.5);
  const reveal = state.locked || state.done;
  return (
    <svg className="llmops07-cp-chart" viewBox={`0 0 ${W} 180`} role="img" aria-label={`Latency of ${n} requests in order, with your split at row ${state.split}`}>
      <line x1={PAD} y1={y(0)} x2={W - PAD} y2={y(0)} className="llmops07-cp-axis" />
      <polyline points={line} className="llmops07-cp-series" />
      <line x1={x(0)} y1={y(cur.before)} x2={gate(cur.at)} y2={y(cur.before)} className="llmops07-cp-mean" />
      <line x1={gate(cur.at)} y1={y(cur.after)} x2={x(n - 1)} y2={y(cur.after)} className="llmops07-cp-mean" />
      <line x1={gate(cur.at)} y1={6} x2={gate(cur.at)} y2={174} className="llmops07-cp-you" />
      {reveal && a.found !== null && <line x1={gate(a.found)} y1={6} x2={gate(a.found)} y2={174} className="llmops07-cp-tool" />}
      {reveal && run.truth !== null && <line x1={gate(run.truth)} y1={6} x2={gate(run.truth)} y2={174} className="llmops07-cp-truth" />}
      <text x={PAD} y={176} className="llmops07-cp-tick">row 0</text>
      <text x={W - PAD} y={176} textAnchor="end" className="llmops07-cp-tick">row {n - 1}</text>
    </svg>
  );
}

function ScoreRow({ a, state, shown }: { a: Analysis; state: RunState; shown: boolean }) {
  const n = a.splits.length + 2 * MIN_SIDE;
  const maxScore = Math.max(...a.splits.map((s) => s.score));
  const x = (at: number) => PAD + ((W - 2 * PAD) * at) / (n - 1);
  const y = (s: number) => 6 + 50 * (1 - s / maxScore);
  const line = a.splits.map((s) => `${x(s.at).toFixed(1)},${y(s.score).toFixed(1)}`).join(" ");
  return (
    <svg className="llmops07-cp-chart llmops07-cp-scores" viewBox={`0 0 ${W} 66`} role="img" aria-label="The score of every split. A higher point is a better split.">
      <polyline points={line} className="llmops07-cp-scoreline" />
      <line x1={x(state.split)} y1={4} x2={x(state.split)} y2={58} className="llmops07-cp-you" />
      {shown && <circle cx={x(a.best.at)} cy={y(a.best.score)} r={4} className="llmops07-cp-peak" />}
    </svg>
  );
}

function RunCard({ run, state, onChange }: { run: Run; state: RunState; onChange: (next: RunState) => void }) {
  const a = useMemo(() => analyse(run.values), [run]);
  const n = run.values.length;
  const cur = a.splits.find((s) => s.at === state.split) ?? a.splits[0];
  const q = run.question;
  const isShifted = run.truth !== null;
  const askNow = isShifted ? state.locked : true;
  const lastPick = state.picks[state.picks.length - 1];

  const pick = (i: number) => {
    if (state.done) return;
    const picks = [...state.picks, i];
    const right = i === q.answer;
    onChange({ ...state, picks, done: right || picks.length >= 2, right });
  };

  return (
    <section className="llmops07-cp-card" aria-label={run.title}>
      <h4 className="llmops07-cp-title">{run.title}</h4>
      <p className="llmops07-cp-note">{run.intro}</p>
      <ChartRow run={run} a={a} state={state} />
      <ScoreRow a={a} state={state} shown={state.locked || state.done} />
      <div className="llmops07-cp-slide">
        <label htmlFor={`llmops07-cp-${run.id}`} className="w-label">The later level starts at row {state.split}</label>
        <input
          id={`llmops07-cp-${run.id}`}
          type="range"
          min={MIN_SIDE}
          max={n - MIN_SIDE}
          value={state.split}
          disabled={state.locked || state.done}
          onChange={(e) => onChange({ ...state, split: Number(e.target.value) })}
        />
      </div>
      <dl className="llmops07-cp-stats">
        <div><dt>Rows before and after</dt><dd className="w-mono">{cur.at} and {n - cur.at}</dd></div>
        <div><dt>Mean before</dt><dd className="w-mono">{cur.before.toFixed(0)} ms</dd></div>
        <div><dt>Mean after</dt><dd className="w-mono">{cur.after.toFixed(0)} ms</dd></div>
        <div><dt>Gap</dt><dd className="w-mono">{(cur.gap * 100).toFixed(1)} percent</dd></div>
        <div><dt>Score</dt><dd className="w-mono">{cur.score.toFixed(0)}</dd></div>
      </dl>
      {isShifted && !state.locked && (
        <div className="w-row">
          <button type="button" className="w-btn" onClick={() => onChange({ ...state, locked: true })}>Lock my split</button>
        </div>
      )}
      {askNow && (
        <fieldset className="llmops07-cp-ask">
          <legend>{q.prompt}</legend>
          <div className="llmops07-cp-options" role="radiogroup" aria-label="Your answer">
            {q.options.map((o, i) => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={lastPick === i}
                disabled={state.done}
                className={`w-chip llmops07-cp-option${lastPick === i ? " on" : ""}${state.done && i === q.answer ? " right" : ""}`}
                onClick={() => pick(i)}
              >
                {o}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {state.picks.length === 1 && !state.done && (
        <p className="llmops07-cp-why miss" role="status">Not that one. Read the stats again, then try once more.</p>
      )}
      {state.done && (
        <p className={`llmops07-cp-why ${state.right ? "ok" : "miss"}`} role="status">
          <strong>{state.right ? "Correct. " : "The better answer is the one marked. "}</strong>
          {q.why(a, cur)}
          {isShifted && a.found !== null && ` Your split was row ${state.split}. The tool's pick is the teal line, and the row the seeder changed is the amber line.`}
        </p>
      )}
    </section>
  );
}

export default function Llmops07ChangePoint({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [runs, setRuns] = useState<RunState[]>(RUNS.map(fresh));
  const active = runs.findIndex((r) => !r.done);
  const shown = active === -1 ? RUNS.length : active + 1;

  const update = (i: number, next: RunState) => {
    const all = runs.map((r, j) => (j === i ? next : r));
    setRuns(all);
    if (all.every((r) => r.done)) {
      complete(`${all.filter((r) => r.right).length} of ${RUNS.length} change point judgements right`);
    }
  };

  return (
    <div className="w-panel llmops07-cp">
      <p className="llmops07-cp-hint">
        Illustrative figures: the total latency of each request in a seeded file, one row for every 30 seconds. The grey line is the latency. The dashed line is your split, and the two heavy bars are the means on each side.
      </p>
      {RUNS.slice(0, shown).map((run, i) => (
        <RunCard key={run.id} run={run} state={runs[i]} onChange={(next) => update(i, next)} />
      ))}
      {active === -1 && (
        <div className="w-verdict good" role="status">
          A change point is an estimate. It was one row early on the first run. On the second run it correctly said nothing, because the 25 percent guard held. When a deploy log gives the time, pass it with <span className="w-mono">--at</span>.
        </div>
      )}
    </div>
  );
}
