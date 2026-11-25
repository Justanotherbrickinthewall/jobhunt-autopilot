import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Guardrails04ReadResponse.css";

// The four responses are trimmed copies of the shape that finding_from_response reads in the lab.
// The verdicts are what ArmorGuard.check returns for each one, as the step 4 tests check.

type Option = { id: string; label: string };
type Case = {
  title: string;
  tree: string[];
  options: Option[];
  answer: string;
  explain: string;
};

const CASES: Case[] = [
  {
    title: "Case 1: one filter says match",
    tree: [
      "sanitization_result",
      "  filter_match_state: MATCH_FOUND",
      "  invocation_result: SUCCESS",
      "  filter_results",
      "    pi_and_jailbreak",
      "      pi_and_jailbreak_filter_result",
      "        match_state: MATCH_FOUND",
      "    rai",
      "      rai_filter_result",
      "        match_state: NO_MATCH_FOUND",
    ],
    options: [
      { id: "a", label: "Blocks. The reason names pi_and_jailbreak." },
      { id: "b", label: "Blocks. The reason names pi_and_jailbreak and rai." },
      { id: "c", label: "Allows. The question looks harmless." },
    ],
    answer: "a",
    explain: "The overall state is MATCH_FOUND, and only pi_and_jailbreak holds a match of its own. The reason is model armor matched: pi_and_jailbreak.",
  },
  {
    title: "Case 2: the match sits deeper in one filter",
    tree: [
      "sanitization_result",
      "  filter_match_state: MATCH_FOUND",
      "  invocation_result: SUCCESS",
      "  filter_results",
      "    pi_and_jailbreak",
      "      pi_and_jailbreak_filter_result",
      "        match_state: NO_MATCH_FOUND",
      "    sdp",
      "      sdp_filter_result",
      "        inspect_result",
      "          match_state: MATCH_FOUND",
    ],
    options: [
      { id: "a", label: "Allows. No filter at the top level says match." },
      { id: "b", label: "Blocks. The reason names sdp." },
      { id: "c", label: "Blocks. The reason names unknown filter." },
    ],
    answer: "b",
    explain: "The sdp filter nests its state under sdp_filter_result and then inspect_result, so the search has to go down the whole result. A shallow read would find no filter and name unknown filter.",
  },
  {
    title: "Case 3: nothing matches",
    tree: [
      "sanitization_result",
      "  filter_match_state: NO_MATCH_FOUND",
      "  invocation_result: SUCCESS",
      "  filter_results",
      "    pi_and_jailbreak",
      "      pi_and_jailbreak_filter_result",
      "        match_state: NO_MATCH_FOUND",
      "    sdp",
      "      sdp_filter_result",
      "        inspect_result",
      "          match_state: NO_MATCH_FOUND",
    ],
    options: [
      { id: "a", label: "Allows, and the reason is empty." },
      { id: "b", label: "Blocks. The reason is model armor unavailable." },
      { id: "c", label: "Allows, and the score is 1.0." },
    ],
    answer: "a",
    explain: "Every filter ran and none matched. The guard allows with an empty reason and a score of 0.0.",
  },
  {
    title: "Case 4: no match, and the call failed",
    tree: [
      "sanitization_result",
      "  filter_match_state: NO_MATCH_FOUND",
      "  invocation_result: FAILURE",
      "  filter_results",
      "    pi_and_jailbreak",
      "      pi_and_jailbreak_filter_result",
      "        match_state: NO_MATCH_FOUND",
    ],
    options: [
      { id: "a", label: "Allows. No filter matched." },
      { id: "b", label: "Blocks. The reason is model armor unavailable." },
      { id: "c", label: "Blocks. The reason names pi_and_jailbreak." },
    ],
    answer: "b",
    explain: "A failed invocation means Model Armor may not have run every filter, so NO_MATCH_FOUND can't be trusted. The guard fails closed. With fail_open set it would allow.",
  },
];

export default function Guardrails04ReadResponse({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CASES[index];
  const right = pick === c.answer;

  const check = () => {
    if (pick === null) return;
    const n = attempts + 1;
    setAttempts(n);
    if (pick === c.answer || n >= 2) {
      setResolved(true);
      if (pick === c.answer && n === 1) setFirstTry((k) => k + 1);
    }
  };

  const next = () => {
    if (index + 1 < CASES.length) {
      setIndex(index + 1);
      setPick(null);
      setAttempts(0);
      setResolved(false);
    } else {
      setFinished(true);
      complete(`Read ${firstTry} of ${CASES.length} responses right on the first try`);
    }
  };

  return (
    <div className="w-panel guardrails04-read-response">
      <div className="w-row between">
        <span className="w-label">{c.title}</span>
        <span className="guardrails04-read-response-count">
          {index + 1} of {CASES.length}
        </span>
      </div>

      <pre className="guardrails04-read-response-tree w-mono" aria-label="A trimmed sanitise response">
        {c.tree.join("\n")}
      </pre>

      <div className="guardrails04-read-response-group" role="radiogroup" aria-label="Your prediction">
        <span className="w-label">Predict what ArmorGuard does with this response on the input stage.</span>
        <div className="guardrails04-read-response-opts">
          {c.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`guardrails04-read-response-opt${pick === o.id ? " on" : ""}`}
              disabled={resolved}
              onClick={() => setPick(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-row">
        {!resolved && (
          <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
            Check my prediction
          </button>
        )}
        {resolved && !finished && (
          <button type="button" className="w-btn ghost" onClick={next}>
            {index + 1 < CASES.length ? "Next response" : "Finish"}
          </button>
        )}
      </div>

      {attempts > 0 && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Look at the overall state, then at each filter, then at invocation_result.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          {c.explain}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You read {firstTry} of {CASES.length} responses right on the first try. The rule: block on a match, and block on a failed call unless you chose fail_open.
        </div>
      )}
    </div>
  );
}
