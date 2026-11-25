import { useState } from "react";
import { useComplete } from "../learn/useComplete";
import type { WidgetProps } from "../types";
import "./Guardrails08Questionnaire.css";

// CHECK: a cloud provider's SOC 2 or ISO 27001 coverage applies to the provider's own services, and a customer's
// application on top of them still needs its own evidence (the shared responsibility model). Confirm against the
// provider's compliance pages before you rely on option 2 of item 6.

const FACTS = [
  "Audit: every guard verdict, authorisation, approval and tool run writes a row to the audit table. The application only inserts and reads. The database role is not yet limited.",
  "Redaction: the sink redacts emails, phone numbers, card numbers and secrets before it stores a row. It misses names and addresses. A guard row holds the length of the text, never the text. Every row holds a principal id.",
  "Oversight: one tool changes anything, which is open_ticket. Each ticket pauses for a person's approval, and the decision is a row in the audit table.",
  "Kill switch: the actions value stops open_ticket. The all value answers 503 on every route except the health check. A change takes a restart.",
  "Injection testing: 25 attacks in set v1. The guarded success rate is 0.0 and the unguarded rate is about 0.92. Both are in-sample, measured on the card date.",
  "Certificates: the project holds no SOC 2 report and no ISO 27001 certificate.",
  "Legal: no one has reviewed the EU AI Act tier or a DPIA yet.",
];

type Item = { q: string; options: { text: string; note: string }[]; answer: number };

const ITEMS: Item[] = [
  {
    q: "1. How do you test for prompt injection?",
    options: [
      {
        text: "The model is trained to refuse injected instructions.",
        note: "Training is a claim about the model. It is not a test of your system.",
      },
      {
        text: "We run 25 attacks against the guards. The guarded success rate was 0.0 and the unguarded rate was about 0.92. Both figures are in-sample, so a held-out set is a gap.",
        note: "True, with a set, two numbers and the limit.",
      },
      {
        text: "We tested before launch and it passed.",
        note: "One test with no set, rate or date is not evidence for next month.",
      },
    ],
    answer: 1,
  },
  {
    q: "2. Do you keep an audit trail of what the agent does?",
    options: [
      {
        text: "Yes. Every guard verdict, authorisation, approval and tool run writes a row with who, what, which run and why. We can show you the newest rows.",
        note: "True, and checkable with the audit list command.",
      },
      {
        text: "Yes, our application logs are available on request.",
        note: "Application logs are free text. They are not an audit record of decisions.",
      },
      {
        text: "Yes, the model provider keeps full logs for us.",
        note: "The provider's logs are not yours, and they don't record your guards.",
      },
    ],
    answer: 0,
  },
  {
    q: "3. How fast can you switch the agent off?",
    options: [
      {
        text: "Immediately, with no restart.",
        note: "The service reads the setting once, when it starts. A change takes a restart.",
      },
      {
        text: "Within seconds, from an admin page.",
        note: "There is no admin page for the switch. This invents a feature.",
      },
      {
        text: "With one setting. The actions value stops the ticket tool and the all value answers 503 everywhere but the health check. A change takes a restart.",
        note: "True. It names both values and states the limit.",
      },
    ],
    answer: 2,
  },
  {
    q: "4. Is personal data kept in your logs?",
    options: [
      {
        text: "No. The logs hold no personal data.",
        note: "Every row holds a principal id, and redaction misses names and addresses. This over-claims.",
      },
      {
        text: "A guard row holds the length of the text, never the text. We redact emails, phone numbers, card numbers and secrets before storing a row. We miss names and addresses, and every row holds a principal id.",
        note: "True, with what is covered and what is not.",
      },
      {
        text: "Yes, everything, so we can replay any run.",
        note: "The trail holds decisions and not the text. This says more than is true.",
      },
    ],
    answer: 1,
  },
  {
    q: "5. Is there human oversight of actions the agent takes?",
    options: [
      {
        text: "The model asks for review when its confidence is low.",
        note: "Confidence alone doesn't gate an action. Approval has to be required every time.",
      },
      {
        text: "Yes, a person watches the audit trail.",
        note: "Watching is not approving. Nothing stops a bad action.",
      },
      {
        text: "Yes, for the one action tool. Each ticket pauses for a person's approval, and the decision is a row in the audit table. AskPEP has no other tool that changes anything.",
        note: "True, specific and checkable in the trail.",
      },
    ],
    answer: 2,
  },
  {
    q: "6. Do you hold a SOC 2 report or an ISO 27001 certificate?",
    options: [
      {
        text: "No. This project holds neither, because a certificate belongs to a company. Here are the controls it does have, each with its evidence.",
        note: "True. Say no, then give the controls and their evidence.",
      },
      {
        text: "Yes, our provider's certificates cover it.",
        note: "A provider's certificates cover the provider's own services. They don't cover your application.",
      },
      {
        text: "We follow the principles of both standards.",
        note: "This avoids the question, and the buyer will ask again.",
      },
    ],
    answer: 0,
  },
  {
    q: "7. Which EU AI Act tier is the system, and has a DPIA been done?",
    options: [
      {
        text: "Minimal risk, and no DPIA is needed.",
        note: "That is a legal conclusion an engineer can't make.",
      },
      {
        text: "Legal decides both. We have the intended use, the data flows and the controls ready from the card for legal, and no review has happened yet.",
        note: "True status, and it names who decides.",
      },
      {
        text: "Not high risk, and the DPIA is complete.",
        note: "Nobody has reviewed either one. This over-claims.",
      },
    ],
    answer: 1,
  },
];

export default function Guardrails08Questionnaire({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [attempts, setAttempts] = useState(0);
  const [shown, setShown] = useState(false);

  const allPicked = ITEMS.every((_, i) => picks[i] !== undefined);
  const correct = ITEMS.filter((it, i) => picks[i] === it.answer).length;
  const revealed = attempts >= 2;
  const finished = shown && (correct === ITEMS.length || revealed);

  function check() {
    const next = attempts + 1;
    setAttempts(next);
    setShown(true);
    if (correct === ITEMS.length || next >= 2) {
      complete(`Answered ${correct} of ${ITEMS.length} items correctly on attempt ${next}.`);
    }
  }

  function retry() {
    setShown(false);
    const keep: Record<number, number> = {};
    ITEMS.forEach((it, i) => {
      if (picks[i] === it.answer) keep[i] = it.answer;
    });
    setPicks(keep);
  }

  return (
    <div className="w-panel guardrails08-questionnaire">
      <p className="guardrails08-questionnaire-lead">
        A reviewer sent seven items about AskPEP. These are the facts. Pick the answer that is true, specific and inside what an engineer may claim.
      </p>
      <ul className="guardrails08-questionnaire-facts">
        {FACTS.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      {ITEMS.map((it, i) => {
        const pick = picks[i];
        const right = pick === it.answer;
        return (
          <fieldset key={i} className="guardrails08-questionnaire-fs">
            <legend>Item {i + 1}</legend>
            <p className="guardrails08-questionnaire-q">{it.q}</p>
            <div className="guardrails08-questionnaire-opts" role="radiogroup" aria-label={`Your answer to item ${i + 1}`}>
              {it.options.map((o, j) => (
                <label key={j} className={"guardrails08-questionnaire-opt" + (pick === j ? " is-on" : "")}>
                  <input
                    type="radio"
                    name={"guardrails08-questionnaire-" + i}
                    disabled={finished || (shown && right)}
                    checked={pick === j}
                    onChange={() => setPicks({ ...picks, [i]: j })}
                  />
                  <span>{o.text}</span>
                </label>
              ))}
            </div>
            {shown && pick !== undefined && (
              <p className={"w-verdict " + (right ? "good" : "bad")} role="status">
                {right
                  ? it.options[pick].note
                  : revealed
                    ? `${it.options[pick].note} The right answer: ${it.options[it.answer].text}`
                    : it.options[pick].note}
              </p>
            )}
          </fieldset>
        );
      })}
      {!finished && !shown && (
        <div className="w-row">
          <button type="button" className="w-btn primary" disabled={!allPicked} onClick={check}>
            Check my answers
          </button>
        </div>
      )}
      {!finished && shown && (
        <div className="w-row">
          <button type="button" className="w-btn primary" onClick={retry}>
            Change my wrong answers
          </button>
        </div>
      )}
      {finished && (
        <p className={"w-verdict " + (correct === ITEMS.length ? "good" : "bad")} role="status">
          {correct === ITEMS.length
            ? "Verdict: all seven true and specific. Every answer came from the facts, and each gap was stated as a gap."
            : `Verdict: ${correct} of ${ITEMS.length}. An answer that says more than the facts support is worse than a stated gap.`}
        </p>
      )}
    </div>
  );
}
