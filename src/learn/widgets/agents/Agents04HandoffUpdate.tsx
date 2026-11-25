import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents04HandoffUpdate.css";

// The figures come from a scripted run of the real desk graph, with the researcher handing to the writer.
// Triage 1 call (4 in, 1 out). Researcher 2 calls (10 in, 2 out, then 12 in, 3 out). Writer 1 call (20 in, 6 out).
// The correct totals are 4 calls, 46 tokens in and 12 out. Dropping the counters gives 2, 24 and 7.
// Sending the agent's own totals gives 5, 50 and 13, because triage is counted twice.

type Counters = "none" | "totals" | "delta";
type Update = { parent: boolean; history: boolean; replies: boolean; sources: boolean; counters: Counters };
type Row = { label: string; ok: boolean; text: string };

const COUNTER_OPTIONS: { id: Counters; label: string }[] = [
  { id: "none", label: "No counters" },
  { id: "totals", label: "The agent's counters as they stand" },
  { id: "delta", label: "Only what the agent added" },
];

const COUNTER_RESULT: Record<Counters, { ok: boolean; text: string }> = {
  none: {
    ok: false,
    text: "The desk reports 2 model calls, 24 tokens in and 7 out. The researcher's two calls are missing.",
  },
  totals: {
    ok: false,
    text: "The desk reports 5 model calls, 50 tokens in and 13 out. Triage's call is counted twice, because the researcher started with triage's counters.",
  },
  delta: {
    ok: true,
    text: "The desk reports 4 model calls, 46 tokens in and 12 out. Every call is counted once.",
  },
};

function check(u: Update): Row[] {
  if (!u.parent) {
    return [
      {
        label: "Route",
        ok: false,
        text: "The writer never ran. The goto pointed at a node the researcher's own graph does not have, so the researcher carried on alone. The reply still said Transferred to writer.",
      },
      {
        label: "The rest",
        ok: false,
        text: "None of the other fields reached the desk, so there is nothing more to check until the update goes to the parent.",
      },
    ];
  }
  const rows: Row[] = [{ label: "Route", ok: true, text: "The writer ran, in the desk graph." }];
  rows.push(
    u.history
      ? { label: "History", ok: true, text: "The writer sees the question, the search, its result and the transfer call." }
      : { label: "History", ok: false, text: "The writer sees only the question. The search and its result are gone." },
  );
  if (u.replies && u.history) {
    rows.push({ label: "Reply", ok: true, text: "The call to transfer_to_writer has its reply." });
  } else if (u.replies) {
    rows.push({
      label: "Reply",
      ok: false,
      text: "The reply is there, but the call it answers was dropped with the history. The reply points at nothing.",
    });
  } else if (u.history) {
    // CHECK: that Gemini, through langchain-google-genai, rejects a conversation in which a tool call has no reply.
    rows.push({
      label: "Reply",
      ok: false,
      text: "The call to transfer_to_writer has no reply. A model API rejects that conversation. A scripted model accepts it, so an offline test can miss this.",
    });
  } else {
    rows.push({ label: "Reply", ok: true, text: "There is no call and no reply, so the conversation is consistent. It is also empty." });
  }
  rows.push(
    u.sources
      ? { label: "Sources", ok: true, text: "2 sources reach the desk, so [1] and [2] still point at passages." }
      : {
          label: "Sources",
          ok: false,
          text: "No sources reach the desk. The writer's answer cites [1], and the result carries no citation.",
        },
  );
  const c = COUNTER_RESULT[u.counters];
  rows.push({ label: "Counters", ok: c.ok, text: c.text });
  return rows;
}

export default function Agents04HandoffUpdate({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [u, setU] = useState<Update>({ parent: false, history: false, replies: false, sources: false, counters: "none" });
  const [ran, setRan] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const rows = check(u);
  const failed = rows.filter((r) => !r.ok).length;
  const right = ran && failed === 0;
  const showWhy = ran && (right || attempts >= 2);

  const flip = (k: "parent" | "history" | "replies" | "sources") => {
    if (!ran) setU((x) => ({ ...x, [k]: !x[k] }));
  };

  const run = () => {
    const n = attempts + 1;
    setAttempts(n);
    setRan(true);
    if (check(u).every((r) => r.ok)) {
      complete("Built a complete handoff update");
    } else if (n >= 2) {
      complete("Saw the explanation after two tries");
    }
  };

  return (
    <div className="w-panel agents04-handoff-update">
      <div className="agents04-handoff-update-scene">
        <span className="w-label">The run so far</span>
        <ul>
          <li>The user asked: What does PEP 572 say?</li>
          <li>Triage made 1 model call (4 tokens in, 1 out) and chose the researcher.</li>
          <li>The researcher made 2 model calls. The first searched (10 in, 2 out) and found 2 passages. The second called transfer_to_writer (12 in, 3 out).</li>
          <li>The writer will make 1 model call (20 in, 6 out).</li>
        </ul>
      </div>

      <div className="agents04-handoff-update-group" role="group" aria-label="What the handoff sends">
        <span className="w-label">Build the handoff. Turn on what it must send.</span>
        <div className="w-row">
          <button type="button" className="w-chip" aria-pressed={u.parent} disabled={ran} onClick={() => flip("parent")}>
            graph=Command.PARENT
          </button>
          <button type="button" className="w-chip" aria-pressed={u.history} disabled={ran} onClick={() => flip("history")}>
            Every message so far
          </button>
          <button type="button" className="w-chip" aria-pressed={u.replies} disabled={ran} onClick={() => flip("replies")}>
            A reply to the transfer call
          </button>
          <button type="button" className="w-chip" aria-pressed={u.sources} disabled={ran} onClick={() => flip("sources")}>
            The 2 sources
          </button>
        </div>
      </div>

      <div className="agents04-handoff-update-group" role="radiogroup" aria-label="Counters in the update">
        <span className="w-label">Counters: steps, tokens_in and tokens_out</span>
        <div className="agents04-handoff-update-opts">
          {COUNTER_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={u.counters === o.id}
              className={`agents04-handoff-update-opt${u.counters === o.id ? " on" : ""}`}
              disabled={ran}
              onClick={() => setU((x) => ({ ...x, counters: o.id }))}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-row">
        {!ran ? (
          <button type="button" className="w-btn primary" onClick={run}>
            Run the handoff
          </button>
        ) : (
          !right && (
            <button type="button" className="w-btn ghost" onClick={() => setRan(false)}>
              Change the update
            </button>
          )
        )}
      </div>

      {ran && (
        <div className="agents04-handoff-update-result">
          <ul className="agents04-handoff-update-rows">
            {rows.map((r) => (
              <li key={r.label} className={r.ok ? "ok" : "bad"}>
                <span className="agents04-handoff-update-tag">{r.ok ? "Right" : "Broken"}</span>
                <span>
                  <strong>{r.label}.</strong> {r.text}
                </span>
              </li>
            ))}
          </ul>
          <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
            {right
              ? "Correct. This is the update the desk sends. Each field protects something the writer needs, and the counters carry only what the agent added."
              : showWhy
                ? "Not quite. The update must go to the parent, carry the whole history with a reply to the call, keep the sources, and send only the counters the agent added."
                : `${failed} ${failed === 1 ? "check" : "checks"} failed. Change the update and try once more.`}
          </div>
        </div>
      )}
    </div>
  );
}
