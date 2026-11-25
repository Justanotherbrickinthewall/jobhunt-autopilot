import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture08FailureWalk.css";

// Five failures of the capstone as it runs today. Each answer is read from the code in capstone/src/askpep:
// routing.py (FallbackChatModel.invoke), api.py (run_job, input_blocked, jobs_agent, agent_status), agents/graph.py (desk_status),
// cache.py and fakes.py (InlineQueue). Nothing here was run against a live service.
// CHECK: Cloud Tasks retries a task whose call does not answer 2xx, under the queue's own retry settings. Source: the Cloud Tasks retry documentation, not read for this chapter.
// CHECKED 22 Oct 2026: https://docs.cloud.google.com/tasks/docs/dual-overview says Cloud Tasks delivers a task at least once.

type Case = {
  title: string;
  setup: string;
  question: string;
  options: string[];
  answer: number;
  caller: string;
  operator: string;
  recovers: string;
  extra?: string;
};

const CASES: Case[] = [
  {
    title: "A provider answers 429",
    setup:
      "Routing is on, and ROUTES sends the researcher role to a Gemini model. Gemini answers one desk call with a 429, which means too many requests.",
    question: "What does the capstone do with that call?",
    options: [
      "The desk run fails, and the caller gets an error event.",
      "FallbackChatModel logs a model_fallback warning and asks Claude with the same input.",
      "The call retries on the same Gemini model until it succeeds.",
      "ROUTES sends the role to the next cheapest model in the eval scores.",
    ],
    answer: 1,
    caller: "A slower answer. The call is made twice, once to Gemini and once to Claude.",
    operator: "A model_fallback warning in the log, and a higher cost for that call, which is priced as Claude's.",
    recovers:
      "Nothing has to be done. Each call tries Gemini first, so calls return to it when it answers again. A 400 or a 401 does not fall back, because the same request would fail again on Claude.",
  },
  {
    title: "The queue delivers a job twice",
    setup:
      "ASYNC_MODE is cloud_tasks. Cloud Tasks delivers a task at least once, and the first run of this job has finished. The same task arrives at the handler again.",
    question: "What does the handler do with the second delivery?",
    options: [
      "It runs the desk again, and the caller gets a second answer.",
      "It reads the thread's checkpoint, finds a finished run and returns its status without running anything.",
      "It answers 409, and the queue stops sending the task.",
      "It cancels the first run and starts a new one.",
    ],
    answer: 1,
    caller: "Nothing changes. Polling GET /agent/{thread_id} shows the one answer.",
    operator: "Two calls to /internal/tasks/agent for one thread. The second returns the finished status and adds no model cost.",
    recovers: "Nothing has to be done. The check works on a finished thread.",
    extra:
      "A thread with unfinished steps reads as stopped, whether it crashed or is still running. So run_job takes a Postgres advisory lock on the thread before it reads the status. A duplicate that arrives mid-run finds the lock held, runs nothing and gets a 503, and the queue retries it later. The lock holds one pool connection for the whole run, and the pool holds 10. Nobody ran that race here, so the connection cost goes into section 8 as a question.",
  },
  {
    title: "A guard blocks a queued job",
    setup:
      "A caller sends POST /jobs/agent with a question that an input guard blocks. The job runs, the guard blocks it, and the caller polls GET /agent/{thread_id}.",
    question: "What does the poll return?",
    options: [
      "A 200 with the status blocked and the reason guard_blocked.",
      "A 404 with the detail Unknown thread.",
      "A 202 until the job times out.",
      "A 409 because the thread already has a run.",
    ],
    answer: 1,
    caller: "A 404, the same answer as for a thread id that never existed. The caller cannot tell a blocked question from a typo.",
    operator: "The input guard's audit event, which carries the thread id, and a trace row with no stages.",
    recovers:
      "Nothing, by design. A blocked run leaves no checkpoint, so the thread is unknown. A repeat POST /jobs/agent with the same thread id answers 409, because the route reads the guard's audit row. A reviewer may ask for a distinct answer for a block on the poll.",
  },
  {
    title: "A new instance starts with an empty cache",
    setup: "The cache is on. A deploy or a scale-up starts a new Cloud Run instance, and /ask traffic reaches it.",
    question: "What does the new instance's cache hold?",
    options: [
      "The entries of the other instances, shared through the database.",
      "Nothing. The cache lives in one process's memory, so each instance has its own and a restart empties it.",
      "The entries from the last hour, reloaded from the traces table.",
      "Nothing, and /ask answers 503 until the cache is warm.",
    ],
    answer: 1,
    caller: "Questions that were hits on another instance are misses here. They take a full model call, so they are slower.",
    operator:
      "GET /admin/cache on that instance shows its own counters, starting at zero. A hit rate measured on one instance does not describe the service.",
    recovers:
      "Time. Entries return as questions repeat, up to CACHE_MAX_ENTRIES, and each lasts CACHE_TTL_SECONDS. The defaults are 1,000 entries and 3,600 seconds. A cache shared by the instances would remove the problem, and the capstone has none.",
  },
  {
    title: "The process restarts under the inline queue",
    setup: "ASYNC_MODE is inline, the default. A job is running on a background thread when the process restarts.",
    question: "What happens to the job?",
    options: [
      "The queue redelivers it after the restart.",
      "It is lost. Nothing redelivers it, and the poll shows an unknown or a stopped thread.",
      "Cloud Tasks takes it over.",
      "The checkpoint finishes the run when the process starts again.",
    ],
    answer: 1,
    caller:
      "A 404 if the run had no checkpoint yet, or a stopped status if it had one. In the second case POST /jobs/agent with the same thread id answers 409, so the caller must choose a new thread id.",
    operator: "Nothing. The inline queue lives in the process that died, so no record of the job survives.",
    recovers:
      "A new thread id. Or ASYNC_MODE=cloud_tasks, where the queue retries a call that does not answer 2xx and the handler continues a stopped thread from its checkpoint.",
  },
];

export default function Architecture08FailureWalk({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CASES[index];
  const lastPick = picks[picks.length - 1];
  const gotIt = resolved && lastPick === c.answer;

  const choose = (i: number) => {
    if (resolved) return;
    const next = [...picks, i];
    const ok = i === c.answer;
    setPicks(next);
    if (ok || next.length >= 2) {
      const first = firstTry + (ok && next.length === 1 ? 1 : 0);
      setResolved(true);
      setFirstTry(first);
      if (index + 1 >= CASES.length) {
        setFinished(true);
        complete(`${first} of ${CASES.length} failures right on the first pick`);
      }
    }
  };

  const advance = () => {
    setIndex(index + 1);
    setPicks([]);
    setResolved(false);
  };

  return (
    <div className="w-panel architecture08-walk">
      <p className="architecture08-walk-hint">
        Five failures of the capstone as it runs today. Pick what happens in each one. Every answer comes from reading the code, and none was run
        against a live service.
      </p>

      <div className="architecture08-walk-head">
        <span className="w-label">
          Failure {index + 1} of {CASES.length}
        </span>
        <h4 className="architecture08-walk-title">{c.title}</h4>
      </div>
      <p className="architecture08-walk-setup">{c.setup}</p>

      <fieldset className="architecture08-walk-ask" disabled={finished}>
        <legend>{c.question}</legend>
        <div className="architecture08-walk-options" role="radiogroup" aria-label={c.question}>
          {c.options.map((o, i) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={lastPick === i}
              disabled={resolved}
              className={`w-chip architecture08-walk-option${lastPick === i ? " on" : ""}${resolved && i === c.answer ? " right" : ""}`}
              onClick={() => choose(i)}
            >
              {o}
            </button>
          ))}
        </div>
      </fieldset>

      {picks.length === 1 && !resolved && (
        <p className="architecture08-walk-note miss" role="status">
          Not that one. Read the setup again and pick once more.
        </p>
      )}

      {resolved && (
        <div className="architecture08-walk-reveal" role="status">
          <p className={`architecture08-walk-note ${gotIt ? "ok" : "miss"}`}>
            <strong>{gotIt ? "Correct. " : "The marked answer is what the code does. "}</strong>
          </p>
          <dl className="architecture08-walk-facts">
            <div>
              <dt>The caller sees</dt>
              <dd>{c.caller}</dd>
            </div>
            <div>
              <dt>The operator sees</dt>
              <dd>{c.operator}</dd>
            </div>
            <div>
              <dt>What recovers it</dt>
              <dd>{c.recovers}</dd>
            </div>
          </dl>
          {c.extra && <p className="architecture08-walk-extra">{c.extra}</p>}
          {!finished && (
            <button type="button" className="w-btn small" onClick={advance}>
              Next failure
            </button>
          )}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          The code absorbs two of these failures, the provider outage and the finished duplicate. It leaves three to a person: a block that polls as a
          404, a cold instance, and a job lost with an inline restart. Each of those is a line for section 8.
        </div>
      )}
    </div>
  );
}
