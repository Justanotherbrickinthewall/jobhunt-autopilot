import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C02FieldScorer.css";

// Two fields scored on the same ten invoices. Illustrative data.
type Row = [string, string | null]; // [truth, extracted]
type Q = { ask: string; options: string[]; answer: number; why: string };
type Case = { title: string; rows: Row[]; qs: Q[] };

const CASES: Case[] = [
  {
    title: "Field: PO number",
    rows: [
      ["PO-1001", "PO-1001"], ["PO-1002", null], ["PO-1003", "PO-1003"], ["PO-1004", null], ["PO-1005", "PO-1005"],
      ["PO-1006", "PO-1006"], ["PO-1007", null], ["PO-1008", "PO-1008"], ["PO-1009", null], ["PO-1010", "PO-1010"],
    ],
    qs: [
      { ask: "How many of the 10 did the model find? This is the recall.", options: ["4 of 10", "6 of 10", "10 of 10"], answer: 1, why: "Six rows have a value. Four are null. Recall is 6 out of 10, or 60 percent." },
      { ask: "Of the ones it found, how many are right? This is the precision.", options: ["4 of 6", "5 of 6", "6 of 6"], answer: 2, why: "Every extracted value matches the truth, so precision is 6 out of 6, or 100 percent." },
      { ask: "What does the pattern tell you to do?", options: ["Add a check against other fields and review the values it finds", "Label more examples of the layouts where the PO number hides", "Leave it alone and automate the field"], answer: 1, why: "Precision is perfect and recall is poor. The model reads the field well when it sees it, so it needs more labelled examples of the layouts where it misses." },
    ],
  },
  {
    title: "Field: Total",
    rows: [
      ["120.00", "120.00"], ["480.00", "480.00"], ["1,260.00", "1,280.00"], ["95.50", "95.50"], ["310.00", "310.00"],
      ["72.00", "72.00"], ["2,015.00", "2,075.00"], ["66.00", "66.00"], ["540.00", "540.00"], ["88.00", "88.00"],
    ],
    qs: [
      { ask: "How many of the 10 did the model find?", options: ["8 of 10", "9 of 10", "10 of 10"], answer: 2, why: "A value came back for every row, so recall is 10 out of 10." },
      { ask: "Of the ones it found, how many are right?", options: ["7 of 10", "8 of 10", "10 of 10"], answer: 1, why: "Two totals are misread, 1,280.00 and 2,075.00. Eight of ten match, so precision is 80 percent." },
      { ask: "What does the pattern tell you to do?", options: ["Label more layouts, because recall is the problem", "Add rules that check the total against the line items, and review failures", "Switch the field off"], answer: 1, why: "Nothing is missing, but a fifth of the values are wrong. Rules that compare fields, such as total against line items, catch wrong values that look fine. Failures go to review." },
    ],
  },
];

const TOTAL = CASES.reduce((n, c) => n + c.qs.length, 0);

export default function C02FieldScorer({ onComplete }: WidgetProps) {
  const done = useComplete(onComplete);
  const [picks, setPicks] = useState<Record<string, number>>({});

  function pick(ci: number, qi: number, o: number) {
    const key = `${ci}-${qi}`;
    if (picks[key] !== undefined) return;
    const next = { ...picks, [key]: o };
    setPicks(next);
    // A walk through several cases, so completion fires once, on the last answer.
    if (Object.keys(next).length === TOTAL) {
      const right = CASES.reduce((n, c, i) => n + c.qs.filter((q, j) => next[`${i}-${j}`] === q.answer).length, 0);
      done(`${right} of ${TOTAL} scoring steps right`);
    }
  }

  const answered = Object.keys(picks).length;
  const right = CASES.reduce((n, c, i) => n + c.qs.filter((q, j) => picks[`${i}-${j}`] === q.answer).length, 0);

  return (
    <div className="w-panel docai-field-scorer">
      <p className="docai-field-scorer-lede">Two fields, scored on the same ten invoices. Count what was found and what was right, then choose the fix. Illustrative data.</p>
      {CASES.map((c, ci) => {
        const firstOpen = c.qs.findIndex((_, qi) => picks[`${ci}-${qi}`] === undefined);
        const shown = firstOpen === -1 ? c.qs.length : firstOpen + 1;
        return (
          <div key={c.title} className="w-inset docai-field-scorer-case">
            <p className="docai-field-scorer-title">{c.title}</p>
            <table className="docai-field-scorer-table">
              <thead><tr><th>Invoice</th><th>Printed value</th><th>Extracted</th></tr></thead>
              <tbody>
                {c.rows.map(([t, e], i) => (
                  <tr key={i}>
                    <td>{i + 1}</td><td className="w-mono">{t}</td>
                    <td className={`w-mono${e === null ? " is-miss" : e !== t ? " is-wrong" : ""}`}>{e ?? "null"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {c.qs.slice(0, shown).map((q, qi) => {
              const p = picks[`${ci}-${qi}`];
              return (
                <div key={qi}>
                  <p className="docai-field-scorer-q">{qi + 1}. {q.ask}</p>
                  <div className="docai-field-scorer-opts" role="group" aria-label={`${c.title}, question ${qi + 1}`}>
                    {q.options.map((o, oi) => (
                      <button key={oi} type="button" disabled={p !== undefined} aria-pressed={p === oi} className={`w-chip${p === oi ? (oi === q.answer ? " good" : " bad") : ""}`} onClick={() => pick(ci, qi, oi)}>{o}</button>
                    ))}
                  </div>
                  {p !== undefined && <p className="docai-field-scorer-why"><b>{p === q.answer ? "Right. " : "Not quite. "}</b>{q.why}</p>}
                </div>
              );
            })}
          </div>
        );
      })}
      {answered === TOTAL && (
        <div className={`w-verdict ${right >= TOTAL - 1 ? "good" : "bad"}`} role="status">
          <b>{right} of {TOTAL} right.</b> Found is recall and right when found is precision. Low recall asks for more labelled examples. Low precision asks for rules and review. One accuracy number would have hidden the difference.
        </div>
      )}
    </div>
  );
}
