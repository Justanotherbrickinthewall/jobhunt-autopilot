import { useId, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud08IapRequest.css";

// Seven requests and what the `iap` middleware in capstone/src/askpep/api.py does with each. The middleware
// skips /health and /internal/tasks/agent, answers 401 for no header and 403 for a token verify_iap_jwt rejects.
// It is registered after the kill_switch middleware, so it runs first. The requests are invented. Each card
// assumes the request has reached the container. The tasks card says that IAP itself may stop it earlier.

type Outcome = "passes" | "401" | "403";

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: "passes", label: "Passes to the route" },
  { id: "401", label: "401, behind IAP" },
  { id: "403", label: "403, token not valid" },
];

type Request = { id: string; setting: string; what: string; answer: Outcome; why: string };

const REQUESTS: Request[] = [
  {
    id: "person",
    setting: "IAP_AUDIENCE is set.",
    what: "A person signs in through IAP and the UI calls `POST /ask`. The request carries a valid IAP token.",
    answer: "passes",
    why: "The middleware verifies the token and passes the request on. The route's own `X-API-Key` check still runs next, because IAP doesn't replace the key.",
  },
  {
    id: "script",
    setting: "IAP_AUDIENCE is set.",
    what: "A script calls `POST /ask` with a valid `X-API-Key` and no IAP header.",
    answer: "401",
    why: "The middleware looks for the IAP header first and never reads the key. A script can't sign in, so it needs another path.",
  },
  {
    id: "audience",
    setting: "IAP_AUDIENCE is set.",
    what: "A request arrives with an IAP header whose token was made for a different service.",
    answer: "403",
    why: "The decode step checks the audience against `IAP_AUDIENCE` and raises `ValueError`. The middleware turns that into a 403.",
  },
  {
    id: "switch",
    setting: "IAP_AUDIENCE is set, and KILL_SWITCH is all.",
    what: "A stranger calls `POST /ask` with no header.",
    answer: "401",
    why: "The IAP middleware is registered after the kill switch one, so it wraps it and runs first. The stranger gets a 401 and learns nothing about the switch.",
  },
  {
    id: "health",
    setting: "IAP_AUDIENCE is set.",
    what: "Cloud Run's startup probe calls `GET /health` with no header.",
    answer: "passes",
    why: "`/health` is on the skip list, so the probe can reach it with no sign-in.",
  },
  {
    id: "tasks",
    setting: "IAP_AUDIENCE is set.",
    what: "Cloud Tasks delivers a job to `POST /internal/tasks/agent` with its own OIDC token and no IAP header.",
    answer: "passes",
    why: "That path is on the skip list, and the route then verifies the Cloud Tasks token itself. IAP sits in front of the container and may refuse the token before this middleware runs. Only a live job answers that, so the chapter tells you to send one.",
  },
  {
    id: "off",
    setting: "IAP_AUDIENCE is empty.",
    what: "The same script calls `POST /ask` with a valid `X-API-Key` and no IAP header.",
    answer: "passes",
    why: "With no audience the middleware does nothing, so courses 1 to 6 behave as before. The API key check decides the answer.",
  },
];

export default function Cloud08IapRequest({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const baseId = useId();
  const [picks, setPicks] = useState<Record<string, Outcome | "">>({});
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);

  const allPicked = REQUESTS.every((r) => picks[r.id]);
  const rightCount = REQUESTS.filter((r) => picks[r.id] === r.answer).length;
  const showMarks = attempts > 0;

  const check = () => {
    if (!allPicked) return;
    const k = attempts + 1;
    setAttempts(k);
    const right = REQUESTS.every((r) => picks[r.id] === r.answer);
    if (right || k >= 2) {
      setResolved(true);
      complete(
        right && k === 1
          ? "Predicted all seven requests on the first try"
          : right
            ? "Predicted all seven requests on the second try"
            : "Needed the explanations to predict the seven requests",
      );
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel cloud08-iap-request">
        <div className="w-row between">
          <span className="w-label">Seven requests, illustrative</span>
          <span className="cloud08-iap-request-count">{showMarks ? `${rightCount} of ${REQUESTS.length} right` : "Predict first"}</span>
        </div>

        <ol className="cloud08-iap-request-list">
          {REQUESTS.map((request, i) => {
            const pick = picks[request.id] ?? "";
            const right = pick === request.answer;
            const selectId = `${baseId}-${request.id}`;
            return (
              <li
                key={request.id}
                className={`cloud08-iap-request-card${showMarks && pick ? (right ? " right" : resolved ? " wrong" : " retry") : ""}`}
              >
                <p className="cloud08-iap-request-setting">{request.setting}</p>
                <div className="cloud08-iap-request-what">
                  <span className="cloud08-iap-request-n">{i + 1}</span>
                  <label htmlFor={selectId}>{renderTicks(request.what)}</label>
                </div>
                <select
                  id={selectId}
                  className="cloud08-iap-request-select"
                  value={pick}
                  disabled={resolved}
                  onChange={(e) => setPicks((p) => ({ ...p, [request.id]: e.target.value as Outcome }))}
                >
                  <option value="">Choose the answer</option>
                  {OUTCOMES.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {showMarks && pick && !resolved && <span className={`w-chip ${right ? "good" : "warn"}`}>{right ? "Right" : "Not yet"}</span>}
                {resolved && (
                  <motion.p className="cloud08-iap-request-why" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    <span className={`w-chip ${right ? "good" : "bad"}`}>{right ? "Right" : `Should be: ${OUTCOMES.find((o) => o.id === request.answer)?.label}`}</span>{" "}
                    {renderTicks(request.why)}
                  </motion.p>
                )}
              </li>
            );
          })}
        </ol>

        {!resolved && (
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={!allPicked} onClick={check}>
              Check my predictions
            </button>
            {attempts > 0 && (
              <span className="cloud08-iap-request-hint" role="status">
                {rightCount} of {REQUESTS.length} are right. Change the ones marked Not yet.
              </span>
            )}
          </div>
        )}

        {resolved && (
          <div className={`w-verdict ${rightCount === REQUESTS.length ? "good" : "bad"}`} role="status">
            <strong>{rightCount === REQUESTS.length ? "Every prediction is right." : `${rightCount} of ${REQUESTS.length} were right.`}</strong> The middleware checks the IAP header on every route except two, and it never reads the API key.
            A client that can't sign in is locked out the moment IAP is on.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}

// Turn `code` spans in the text into <code> elements.
function renderTicks(text: string) {
  return text.split("`").map((part, i) =>
    i % 2 === 1 ? (
      <code key={i} className="w-mono">
        {part}
      </code>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
