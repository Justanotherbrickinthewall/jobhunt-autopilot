import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C04DiffReview.css";

// A fictional AI-generated diff for the invoice pipeline. The key shown is a made-up placeholder.
type Line = { n: number; code: string; flaw?: "api" | "secret" | "test" | "dep" | "auth"; why?: string };
const REPO_NOTE =
  "The ledger module exports post_invoice and hold_invoice only. The lockfile pins requests and pydantic, nothing else. Only users with the approver role may post.";
const LINES: Line[] = [
  { n: 1, code: "+ import os" },
  { n: 2, code: "+ from harbour import ledger" },
  { n: 3, code: "+ from harbour.fx import fetch_rate" },
  { n: 4, code: "+ import fxrates_pro", flaw: "dep", why: "A package that is not in the lockfile. The assistant named it because it sounds right. It may not exist, or someone may have published a malicious one under that name. Check it is real and maintained before it goes in." },
  { n: 5, code: '+ FX_API_KEY = "fx_live_9d3f27a1c4b8e65d"', flaw: "secret", why: "A live-looking key hard-coded in source. It will sit in git history. Read it from a secret store and rotate this one." },
  { n: 6, code: "+ " },
  { n: 7, code: "+ def to_gbp(amount, currency):" },
  { n: 8, code: "+     rate = fetch_rate(currency, key=FX_API_KEY)" },
  { n: 9, code: "+     return round(amount * rate, 2)" },
  { n: 10, code: "+ " },
  { n: 11, code: "+ def post_batch(invoices):" },
  { n: 12, code: "+     for inv in invoices:" },
  { n: 13, code: "+         inv.total_gbp = to_gbp(inv.total, inv.currency)" },
  { n: 14, code: "+     ledger.post_invoice_batch(invoices, dry_run=False)", flaw: "api", why: "The ledger module has no post_invoice_batch. The assistant invented it from the name of a neighbour. It would fail on the first run, or worse, pass a mock." },
  { n: 15, code: "+ " },
  { n: 16, code: "+ def post_one(inv, user):" },
  { n: 17, code: "+     ledger.post_invoice(inv)", flaw: "auth", why: "The function takes a user and never looks at it. Anyone who can call it can post. Check the approver role before the ledger call." },
  { n: 18, code: "+ " },
  { n: 19, code: "+ def test_to_gbp():" },
  { n: 20, code: "+     rate = fetch_rate('EUR', key=FX_API_KEY)" },
  { n: 21, code: "+     assert to_gbp(100, 'EUR') == round(100 * rate, 2)", flaw: "test", why: "The test repeats the function. It computes the expected value the same way, so it passes whatever the rate logic does. Use a fixed rate and a hand-worked answer." },
];

export default function C04DiffReview({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [flagged, setFlagged] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const flaws = LINES.filter((l) => l.flaw);
  const found = flaws.filter((l) => flagged.includes(l.n)).length;
  const falsePos = flagged.filter((n) => !LINES.find((l) => l.n === n)?.flaw).length;

  function toggle(n: number) {
    if (done) return;
    setFlagged((f) => (f.includes(n) ? f.filter((x) => x !== n) : [...f, n]));
  }
  const perfect = found === flaws.length && falsePos === 0;
  // Completes on a perfect review, or after the second attempt with the explanations shown.
  function check() {
    const n = attempts + 1;
    setAttempts(n);
    setDone(true);
    if (perfect || n >= 2) complete(`${found} of ${flaws.length} flaws found, ${falsePos} false flags`);
  }
  const locked = done && (perfect || attempts >= 2);

  return (
    <div className="w-panel fde-craft-diff-review">
      <p className="fde-craft-diff-review-lede">
        An assistant wrote this change to convert invoice totals to pounds and post them. The tests pass, because they never import the module on line 4 and never call post_batch. Click each line you would not approve. Five lines have a flaw, one from each failure pattern.
      </p>
      <p className="fde-craft-diff-review-repo"><b>Repo note.</b> {REPO_NOTE}</p>
      <div className="fde-craft-diff-review-code" role="group" aria-label="Diff lines">
        {LINES.map((l) => {
          const on = flagged.includes(l.n);
          const flaw = done && l.flaw;
          return (
            <div key={l.n}>
              <button
                type="button"
                className={`fde-craft-diff-review-line${on ? " is-flag" : ""}${done && on && !l.flaw ? " is-wrong" : ""}${flaw ? " is-flaw" : ""}`}
                aria-pressed={on}
                onClick={() => toggle(l.n)}
              >
                <span className="fde-craft-diff-review-n">{l.n}</span>
                <code>{l.code}</code>
              </button>
              {flaw && <p className="fde-craft-diff-review-why">{l.why}</p>}
            </div>
          );
        })}
      </div>
      {!done && (
        <button type="button" className="w-btn" onClick={check}>
          Submit review
        </button>
      )}
      {done && (
        <div className={`w-verdict ${perfect ? "good" : "bad"}`} role="status">
          <strong>{found} of {flaws.length} flaws found, {falsePos} false flags.</strong> Green CI proved the tests passed. It did not prove the code was right.
        </div>
      )}
      {done && !locked && (
        <button type="button" className="w-btn ghost" onClick={() => setDone(false)}>
          Review again
        </button>
      )}
      <p className="fde-craft-diff-review-foot">Illustrative diff. The key and the module are invented for this exercise.</p>
    </div>
  );
}
