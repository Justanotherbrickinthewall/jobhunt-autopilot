import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C07PageCost.css";

type ModelId = "claude" | "gpt" | "gemini";
type Model = { id: ModelId; name: string; strong: boolean; inPrice: number; outPrice: number; tps: number };

// List prices in dollars per million tokens on 17 October 2026. The output speeds are illustrative assumptions, not vendor figures.
// CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/about-claude/pricing ; https://developers.openai.com/api/docs/models/gpt-5.6-terra ; https://ai.google.dev/gemini-api/docs/pricing
// CHECK: the Gemini figures here ($0.30 and $2.50 per million, 1,120 image tokens) come from the Gemini API docs; confirm them for Vertex AI at https://cloud.google.com/vertex-ai/generative-ai/pricing
const MODELS: Model[] = [
  { id: "claude", name: "Claude Sonnet 5.5", strong: true, inPrice: 2, outPrice: 10, tps: 60 },
  { id: "gpt", name: "GPT-5.6 terra", strong: true, inPrice: 2, outPrice: 12, tps: 70 },
  { id: "gemini", name: "Gemini 3.5 Flash-Lite", strong: false, inPrice: 0.3, outPrice: 2.5, tps: 120 },
];
const DPIS = [72, 100, 150, 200];
const PROMPT_TOKENS = 300;
const OUT_TOKENS = 400;
const OVERHEAD_S = 1.5;

// Image token rules for a letter page.
// CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/build-with-claude/vision-coordinates ; https://platform.openai.com/docs/guides/images-vision ; https://ai.google.dev/gemini-api/docs/media-resolution
const patches = (w: number, h: number, size: number) => Math.ceil(w / size) * Math.ceil(h / size);

// Claude: one token per 28 pixel patch, high-resolution tier of 2,576 pixels and 4,784 tokens.
function claudeTokens(width: number, height: number): number {
  const fits = (w: number, h: number) =>
    Math.ceil(w / 28) * 28 <= 2576 && Math.ceil(h / 28) * 28 <= 2576 && patches(w, h, 28) <= 4784;
  if (fits(width, height)) return patches(width, height, 28);
  const long = Math.max(width, height);
  const ratio = Math.min(width, height) / long;
  let lo = 1, hi = long; // lo always fits, hi never does
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid, Math.max(Math.round(mid * ratio), 1))) lo = mid; else hi = mid;
  }
  return patches(lo, Math.max(Math.round(lo * ratio), 1), 28);
}

// GPT-5.6, high detail: 32 pixel patches, 2,048 pixel limit, 2,500 patch budget, multiplier 1.2.
function gptTokens(width: number, height: number): number {
  const scale = Math.min(1, 2048 / Math.max(width, height));
  let w = Math.floor(width * scale), h = Math.floor(height * scale);
  if (patches(w, h, 32) > 2500) {
    const shrink = Math.sqrt((32 * 32 * 2500) / (w * h));
    const adjust = Math.min(
      Math.floor((w * shrink) / 32) / ((w * shrink) / 32),
      Math.floor((h * shrink) / 32) / ((h * shrink) / 32),
    );
    w = Math.floor(w * shrink * adjust);
    h = Math.floor(h * shrink * adjust);
  }
  return Math.ceil(patches(w, h, 32) * 1.2);
}

function imageTokens(model: ModelId, dpi: number): number {
  const w = Math.round(8.5 * dpi);
  const h = Math.round(11 * dpi);
  if (model === "claude") return claudeTokens(w, h);
  if (model === "gpt") return gptTokens(w, h);
  return 1120; // Gemini default media resolution: a flat cost per image
}

function perPage(m: Model, dpi: number) {
  const tokens = imageTokens(m.id, dpi);
  const cost = ((tokens + PROMPT_TOKENS) * m.inPrice + OUT_TOKENS * m.outPrice) / 1_000_000;
  const seconds = OVERHEAD_S + OUT_TOKENS / m.tps;
  return { tokens, cost, seconds };
}

type Job = { text: string; pages: number; budget: number; hours: number; flight: number; minDpi: number; needStrong: boolean; reveal: string };
const JOBS: Job[] = [
  {
    text: "A backlog of 60,000 supplier statement pages. Budget: $250. The run must finish within 12 hours, with 8 pages in flight. Small print needs at least 150 dots per inch. Any model reads these pages well enough.",
    pages: 60000, budget: 250, hours: 12, flight: 8, minDpi: 150, needStrong: false,
    reveal: "Only the fast tier fits. At any resolution it costs about $86 and takes about 10 hours, because Gemini charges 1,120 tokens for every image. Claude comes to about $602 and 17 hours at 150 dots per inch. GPT comes to about $624 and 15 hours.",
  },
  {
    text: "20,000 handwritten delivery note pages. Budget: $150. Finish within 6 hours, with 8 pages in flight. Legibility needs at least 100 dots per inch. Your pilot showed the fast tier misreads this handwriting, so use a mid-tier model.",
    pages: 20000, budget: 150, hours: 6, flight: 8, minDpi: 100, needStrong: true,
    reveal: "Only Claude at 100 dots per inch fits: about $142 and 5.7 hours. GPT at 100 dots per inch comes to about $153, just over budget. Claude at 150 dots per inch costs about $201, because the image tokens grow with the pixels.",
  },
];

function evalSetup(job: Job, m: Model, dpi: number) {
  const p = perPage(m, dpi);
  const total = p.cost * job.pages;
  const hours = (job.pages * p.seconds) / job.flight / 3600;
  const fails: string[] = [];
  if (total > job.budget) fails.push(`it costs about $${Math.round(total)}, over the $${job.budget} budget`);
  if (hours > job.hours) fails.push(`it takes about ${hours.toFixed(1)} hours, over the ${job.hours} hour limit`);
  if (dpi < job.minDpi) fails.push(`${dpi} dots per inch is below the ${job.minDpi} the print needs`);
  if (job.needStrong && !m.strong) fails.push("the fast tier misread this handwriting in your pilot");
  return { total, hours, fails, ok: fails.length === 0, ...p };
}

export default function C07PageCost({ onComplete }: WidgetProps) {
  const done = useComplete(onComplete);
  const [round, setRound] = useState(0);
  const [modelId, setModelId] = useState<ModelId>("claude");
  const [dpi, setDpi] = useState(150);
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<"open" | "right" | "revealed">("open");
  const [last, setLast] = useState<ReturnType<typeof evalSetup> | null>(null);
  const [score, setScore] = useState(0);

  const job = JOBS[round];
  const model = MODELS.find((m) => m.id === modelId)!;
  const live = perPage(model, dpi);
  const resolved = status !== "open";

  function check() {
    const r = evalSetup(job, model, dpi);
    setLast(r);
    const n = attempts + 1;
    setAttempts(n);
    const gain = r.ok && n === 1 ? 1 : 0;
    if (r.ok) {
      setStatus("right");
      setScore(score + gain);
    } else if (n >= 2) {
      setStatus("revealed");
    }
    if ((r.ok || n >= 2) && round + 1 === JOBS.length) {
      done(`${score + gain} of ${JOBS.length} jobs solved on the first try`);
    }
  }

  function next() {
    if (round + 1 < JOBS.length) {
      setRound(round + 1);
      setAttempts(0);
      setStatus("open");
      setLast(null);
      setModelId("claude");
      setDpi(150);
    }
  }

  return (
    <div className="w-panel docai-page-cost">
      <p className="docai-page-cost-lede">Job {round + 1} of {JOBS.length}. List prices from 17 October 2026. The output speeds are assumptions, not benchmarks. Each page uses a {PROMPT_TOKENS}-token prompt and {OUT_TOKENS} output tokens.</p>
      <p className="docai-page-cost-job">{job.text}</p>
      <div className="docai-page-cost-controls">
        <label>Model
          <select value={modelId} disabled={resolved} onChange={(e) => setModelId(e.target.value as ModelId)}>
            {MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label>Dots per inch
          <select value={dpi} disabled={resolved} onChange={(e) => setDpi(Number(e.target.value))}>
            {DPIS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
      </div>
      <div className="docai-page-cost-stats" role="status" aria-live="polite">
        <span className="w-chip">{live.tokens.toLocaleString("en-GB")} image tokens</span>
        <span className="w-chip">${live.cost.toFixed(4)} per page</span>
        <span className="w-chip">{live.seconds.toFixed(1)} seconds per page</span>
      </div>
      <p className="docai-page-cost-hint">Work the totals yourself: pages times cost, and pages times seconds, divided by pages in flight and by 3,600.</p>
      {!resolved && <button type="button" className="w-btn small" onClick={check}>Check this setup</button>}
      {last && (
        <div className={`w-verdict ${last.ok ? "good" : "bad"}`} role="status">
          {last.ok ? (
            <><b>It fits.</b> About ${Math.round(last.total)} and {last.hours.toFixed(1)} hours.</>
          ) : (
            <><b>It does not fit.</b> {last.fails.map((f, i) => (i === 0 ? f.charAt(0).toUpperCase() + f.slice(1) : f)).join("; ")}.{status === "open" ? " Change the setup and try once more." : ""}</>
          )}
          {status === "revealed" && <><br />{job.reveal}</>}
          {status === "right" &&<><br />{job.reveal}</>}
        </div>
      )}
      {resolved && round + 1 < JOBS.length && <button type="button" className="w-btn small" onClick={next}>Next job</button>}
    </div>
  );
}
